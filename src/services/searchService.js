const fs = require('fs').promises;
const parser = require('pgn-parser');
const config = require('../config');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.cache = new Map();
    this.index = null;
    this.loadIndex();
  }

  async loadIndex() {
    try {
      const indexData = await fs.readFile(config.pgn.indexPath, 'utf8');
      this.index = JSON.parse(indexData);
      logger.info(`Loaded PGN index with ${this.index.length} games`);
    } catch (error) {
      logger.error('Failed to load PGN index', { error: error.message });
      throw error;
    }
  }

  normalizeName(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  matchesPlayerName(fullName, search) {
    const fullNormalized = this.normalizeName(fullName);
    const searchNormalized = this.normalizeName(search);
    
    if (fullNormalized.includes(searchNormalized)) {
      return true;
    }
    
    const fullTokens = fullNormalized.split(/\s+/);
    const searchTokens = searchNormalized.split(/\s+/);
    
    return searchTokens.every(searchToken => 
      fullTokens.some(fullToken => 
        fullToken.includes(searchToken) || 
        this.calculateSimilarity(fullToken, searchToken) > 0.8
      )
    );
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Parse date from PGN format
  parseDate(dateStr) {
    if (!dateStr || dateStr === '????.??.??') return null;
    
    // Handle various date formats
    const cleanDate = dateStr.replace(/\?/g, '01');
    const date = new Date(cleanDate);
    
    return isNaN(date.getTime()) ? null : date;
  }

  isDateInRange(gameDate, fromDate, toDate) {
    if (!gameDate) return !fromDate && !toDate;
    
    if (fromDate && gameDate < fromDate) return false;
    if (toDate && gameDate > toDate) return false;
    
    return true;
  }

  async loadGameByOffset(offset, nextOffset = null) {
    try {
      const fileHandle = await fs.open(config.pgn.filePath, 'r');
      const length = nextOffset ? nextOffset - offset : 2000; // Default chunk size
      const buffer = Buffer.alloc(length);
      
      await fileHandle.read(buffer, 0, length, offset);
      await fileHandle.close();
      
      const gameText = buffer.toString('utf8').split('\n\n')[0]; // Get first complete game
      const parsed = parser.parse(gameText)[0];
      
      if (!parsed) return null;
      
      const headers = parsed.headers.reduce((acc, h) => {
        acc[h.name] = h.value;
        return acc;
      }, {});
      
      return { headers, game: parsed };
    } catch (error) {
      logger.error('Failed to load game by offset', { offset, error: error.message });
      return null;
    }
  }

  async searchGames(searchParams) {
    const cacheKey = JSON.stringify(searchParams);
    
    if (this.cache.has(cacheKey)) {
      logger.debug('Returning cached search results');
      return this.cache.get(cacheKey);
    }
    
    logger.info('Performing advanced game search', searchParams);
    
    const results = [];
    const startTime = Date.now();
    let processedCount = 0;
    
    // Process games in chunks to avoid memory issues
    for (let i = 0; i < this.index.length; i++) {
      const indexEntry = this.index[i];
      const nextOffset = i < this.index.length - 1 ? this.index[i + 1].offset : null;
      
      const gameData = await this.loadGameByOffset(indexEntry.offset, nextOffset);
      if (!gameData) continue;
      
      processedCount++;
      
      if (this.matchesSearchCriteria(gameData.headers, searchParams)) {
        results.push(this.formatGameResult(gameData.headers, gameData.game));
      }
      
      // Stop if we have enough results
      if (results.length >= config.search.maxSearchResults) {
        break;
      }
      
      // Yield control periodically to avoid blocking
      if (processedCount % 100 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    // Apply pagination
    const { page, limit } = searchParams;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    const searchResult = {
      games: paginatedResults,
      pagination: {
        page,
        limit,
        total: results.length,
        totalPages: Math.ceil(results.length / limit),
        hasNext: endIndex < results.length,
        hasPrev: page > 1
      },
      searchTime: Date.now() - startTime,
      processedGames: processedCount
    };
    
    // Cache the result
    if (this.cache.size >= config.pgn.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, searchResult);
    
    logger.info('Search completed', {
      resultsFound: results.length,
      searchTime: searchResult.searchTime,
      processedGames: processedCount
    });
    
    return searchResult;
  }

  // Check if game matches search criteria
  matchesSearchCriteria(headers, searchParams) {
    const white = headers.White || '';
    const black = headers.Black || '';
    const event = headers.Event || '';
    const result = headers.Result || '';
    const eco = headers.ECO || '';
    const gameDate = this.parseDate(headers.Date);
    
    // Player search (either white or black)
    if (searchParams.player) {
      if (!this.matchesPlayerName(white, searchParams.player) && 
          !this.matchesPlayerName(black, searchParams.player)) {
        return false;
      }
    }
    
    // Specific white player search
    if (searchParams.white && !this.matchesPlayerName(white, searchParams.white)) {
      return false;
    }
    
    // Specific black player search
    if (searchParams.black && !this.matchesPlayerName(black, searchParams.black)) {
      return false;
    }
    
    // Date range filter
    if (searchParams.dateFrom || searchParams.dateTo) {
      if (!this.isDateInRange(gameDate, searchParams.dateFrom, searchParams.dateTo)) {
        return false;
      }
    }
    
    // ECO code filter
    if (searchParams.eco && eco !== searchParams.eco) {
      return false;
    }
    
    // Result filter
    if (searchParams.result && result !== searchParams.result) {
      return false;
    }
    
    // Event filter
    if (searchParams.event && !event.toLowerCase().includes(searchParams.event.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  // Format game result for API response
  formatGameResult(headers, game) {
    const movesArray = game.moves?.map(m => m.move) || [];
    
    return {
      gameId: headers.GameId || '',
      event: headers.Event || '',
      site: headers.Site || '',
      date: headers.Date || '',
      round: headers.Round || '',
      white: headers.White || '',
      black: headers.Black || '',
      result: headers.Result || '',
      eco: headers.ECO || '',
      plyCount: parseInt(headers.PlyCount) || null,
      moves: movesArray,
      pgn: this.serializeGame(game)
    };
  }

  // Serialize game back to PGN format
  serializeGame(game) {
    const headers = game.headers.map(h => `[${h.name} "${h.value}"]`).join('\n');
    const movesArray = game.moves?.map(m => m.move) || [];
    const moves = movesArray.join(' ');
    return `${headers}\n\n${moves}`.trim();
  }

  // Get game by ID
  async getGameById(gameId) {
    const indexEntry = this.index.find(entry => entry.gameId === gameId);
    if (!indexEntry) return null;
    
    const nextEntry = this.index[this.index.indexOf(indexEntry) + 1];
    const nextOffset = nextEntry ? nextEntry.offset : null;
    
    const gameData = await this.loadGameByOffset(indexEntry.offset, nextOffset);
    if (!gameData) return null;
    
    return this.formatGameResult(gameData.headers, gameData.game);
  }
}

module.exports = new SearchService();
