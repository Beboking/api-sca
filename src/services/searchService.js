const fs = require('fs').promises;
const path = require('path');
const parser = require('pgn-parser');
const config = require('../config');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.cache = new Map();
    this.index = null;
    this.fileSize = 0;

    this.ready = (async () => {
      await this.loadIndex();
      const stat = await fs.stat(config.pgn.filePath);
      this.fileSize = stat.size;
      logger.info(`PGN file size: ${this.fileSize} bytes`);
    })().catch(err => {
      logger.error('Initialization failed', { error: err.message });
      throw err;
    });
  }

  async loadIndex() {
    try {
      const indexPath = path.resolve(config.pgn.indexPath);
      const raw = await fs.readFile(indexPath, 'utf8');
      this.index = JSON.parse(raw);
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
    const fullNormalized = this.normalizeName(fullName || '');
    const searchNormalized = this.normalizeName(search || '');
    if (!fullNormalized || !searchNormalized) return false;

    if (fullNormalized.includes(searchNormalized)) return true;

    const fullTokens = fullNormalized.split(/\s+/);
    const searchTokens = searchNormalized.split(/\s+/);
    return searchTokens.every(searchToken =>
      fullTokens.some(fullToken =>
        fullToken.includes(searchToken) ||
        this.calculateSimilarity(fullToken, searchToken) > 0.8
      )
    );
  }

  calculateSimilarity(a, b) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1.0;
    const dist = this.levenshteinDistance(longer, shorter);
    return (longer.length - dist) / longer.length;
  }

  levenshteinDistance(a, b) {
    const m = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        m[i][j] = b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return m[b.length][a.length];
  }

  parseDate(dateStr) {
    if (!dateStr || dateStr === '????.??.??') return null;
    // Rellena ? con 01 para construir una fecha válida
    const clean = dateStr.replace(/\?/g, '01');
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  isDateInRange(gameDate, fromDate, toDate) {
    if (!fromDate && !toDate) return true;
    if (!gameDate) return false;
    if (fromDate && gameDate < fromDate) return false;
    if (toDate && gameDate > toDate) return false;
    return true;
  }

  async loadGameByOffset(offset, nextOffset) {
    const end = nextOffset ?? this.fileSize;
    const length = end - offset;
    if (length <= 0) return null;

    const fh = await fs.open(config.pgn.filePath, 'r');
    try {
      const buffer = Buffer.alloc(length);
      await fh.read(buffer, 0, length, offset);
      const gameText = buffer.toString('utf8');
      const parsed = parser.parse(gameText)[0];
      if (!parsed) return null;

      const headers = Object.fromEntries(parsed.headers.map(h => [h.name, h.value]));
      return { headers, game: parsed };
    } catch (error) {
      logger.error('Failed to load game by offset', { offset, nextOffset, error: error.message });
      return null;
    } finally {
      await fh.close();
    }
  }


  async searchGames(searchParams) {
    await this.ready;

    const page = Math.max(1, parseInt(searchParams.page || 1, 10));
    const limit = Math.max(1, parseInt(searchParams.limit || 20, 10));

    const dateFrom = typeof searchParams.dateFrom === 'string'
      ? this.parseDate(searchParams.dateFrom)
      : searchParams.dateFrom || null;
    const dateTo = typeof searchParams.dateTo === 'string'
      ? this.parseDate(searchParams.dateTo)
      : searchParams.dateTo || null;

    const normalizedParams = { ...searchParams, page, limit, dateFrom, dateTo };

    const cacheKey = JSON.stringify(normalizedParams);
    if (this.cache.has(cacheKey)) {
      logger.debug('Returning cached search results');
      return this.cache.get(cacheKey);
    }

    logger.info('Performing advanced game search', normalizedParams);

    const results = [];
    const startTime = Date.now();
    let processedCount = 0;

    for (let i = 0; i < this.index.length; i++) {
      const entry = this.index[i];
      const next = i < this.index.length - 1 ? this.index[i + 1] : null;
      const nextOffset = next ? next.offset : null;

      const gameData = await this.loadGameByOffset(entry.offset, nextOffset);
      if (!gameData) continue;
      processedCount++;

      if (this.matchesSearchCriteria(gameData.headers, normalizedParams)) {
        results.push(this.formatGameResult(gameData.headers, gameData.game));
        if (results.length >= config.search.maxSearchResults) break;
      }

      if (processedCount % 100 === 0) {
        await new Promise(r => setImmediate(r));
      }
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = results.slice(startIndex, endIndex);

    const response = {
      games: paginated,
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

    // Cache simple FIFO
    if (this.cache.size >= config.pgn.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, response);

    logger.info('Search completed', {
      resultsFound: results.length,
      searchTime: response.searchTime,
      processedGames: processedCount
    });

    return response;
  }

  matchesSearchCriteria(headers, p) {
    const white = headers.White || '';
    const black = headers.Black || '';
    const event = headers.Event || '';
    const result = headers.Result || '';
    const eco = headers.ECO || '';
    const gameDate = this.parseDate(headers.Date);

    if (p.player && !this.matchesPlayerName(white, p.player) && !this.matchesPlayerName(black, p.player)) {
      return false;
    }
    if (p.white && !this.matchesPlayerName(white, p.white)) return false;
    if (p.black && !this.matchesPlayerName(black, p.black)) return false;

    if ((p.dateFrom || p.dateTo) && !this.isDateInRange(gameDate, p.dateFrom, p.dateTo)) {
      return false;
    }

    if (p.eco && eco !== p.eco) return false;
    if (p.result && result !== p.result) return false;
    if (p.event && !event.toLowerCase().includes(String(p.event).toLowerCase())) return false;

    return true;
  }

  formatGameResult(headers, game) {
    const movesArray = game.moves?.map(m => m.move) ?? [];
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
      plyCount: Number(headers.PlyCount) || null,
      moves: movesArray,
      pgn: this.serializeGame(game),
    };
  }

  serializeGame(game) {
    const headers = game.headers.map(h => `[${h.name} "${h.value}"]`).join('\n');
    const moves = (game.moves?.map(m => m.move) ?? []).join(' ');
    return `${headers}\n\n${moves}`.trim();
  }

  async getGameById(gameId) {
    await this.ready;
    const entryIndex = this.index.findIndex(e => e.gameId === gameId);
    if (entryIndex < 0) return null;

    const entry = this.index[entryIndex];
    const next = this.index[entryIndex + 1];
    const gameData = await this.loadGameByOffset(entry.offset, next ? next.offset : null);
    if (!gameData) return null;
    return this.formatGameResult(gameData.headers, gameData.game);
  }
}

module.exports = new SearchService();
