const searchService = require('../services/searchService');
const { validateSearchParams, validateGameId } = require('../utils/validation');
const logger = require('../utils/logger');

class GameController {
  async searchGames(req, res, next) {
    try {
      logger.info('Game search request received', {
        query: req.query,
        ip: req.ip
      });

      const searchParams = validateSearchParams(req.query);
      
      const results = await searchService.searchGames(searchParams);
      
      const response = {
        ...results,
        request: {
          timestamp: new Date().toISOString(),
          parameters: searchParams
        }
      };
      
      logger.info('Game search completed successfully', {
        resultsCount: results.games.length,
        totalFound: results.pagination.total,
        searchTime: results.searchTime
      });
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getGameById(req, res, next) {
    try {
      const gameId = validateGameId(req.params.gameId);
      
      logger.info('Game by ID request received', {
        gameId,
        ip: req.ip
      });
      
      const game = await searchService.getGameById(gameId);
      
      if (!game) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Game with ID ${gameId} not found`
        });
      }
      
      logger.info('Game retrieved successfully', { gameId });
      
      res.json({
        game,
        request: {
          timestamp: new Date().toISOString(),
          gameId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlayerSuggestions(req, res, next) {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Query parameter must be at least 2 characters long'
        });
      }
      
      logger.info('Player suggestions request received', {
        query,
        ip: req.ip
      });
      
      const suggestions = await this.getPlayerSuggestionsFromSearch(query);
      
      res.json({
        suggestions,
        query,
        request: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlayerSuggestionsFromSearch(query) {
    try {
      const searchParams = {
        player: query,
        page: 1,
        limit: 20
      };
      
      const results = await searchService.searchGames(searchParams);
      const playerNames = new Set();
      
      results.games.forEach(game => {
        if (game.white && searchService.matchesPlayerName(game.white, query)) {
          playerNames.add(game.white);
        }
        if (game.black && searchService.matchesPlayerName(game.black, query)) {
          playerNames.add(game.black);
        }
      });
      
      return Array.from(playerNames).slice(0, 10); 
    } catch (error) {
      logger.error('Failed to get player suggestions', { error: error.message });
      return [];
    }
  }

  async getStats(req, res, next) {
    try {
      logger.info('Stats request received', { ip: req.ip });
      
      const stats = {
        totalGames: searchService.index ? searchService.index.length : 0,
        cacheSize: searchService.cache.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      };
      
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req, res, next) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      };
      
      if (!searchService.index) {
        health.status = 'unhealthy';
        health.issues = ['PGN index not loaded'];
        return res.status(503).json(health);
      }
      
      res.json(health);
    } catch (error) {
      next(error);
    }
  }
}

const gameController = new GameController();
module.exports = gameController;
