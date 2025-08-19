const config = require('../config');

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const validators = {
  // Validate player name search
  validatePlayerName(playerName) {
    if (!playerName || typeof playerName !== 'string') {
      throw new ValidationError('Player name is required and must be a string', 'player');
    }
    
    if (playerName.trim().length < 2) {
      throw new ValidationError('Player name must be at least 2 characters long', 'player');
    }
    
    if (playerName.length > 100) {
      throw new ValidationError('Player name must be less than 100 characters', 'player');
    }
    
    return playerName.trim();
  },

  // Validate pagination parameters
  validatePagination(page, limit) {
    let pageNum = 1;
    let limitNum = config.search.defaultPageSize;

    if (page !== undefined && page !== null) {
      pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        throw new ValidationError('Page number must be greater than 0', 'page');
      }
    }

    if (limit !== undefined && limit !== null) {
      limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1) {
        throw new ValidationError('Limit must be greater than 0', 'limit');
      }
    }

    if (limitNum > config.search.maxPageSize) {
      throw new ValidationError(`Limit cannot exceed ${config.search.maxPageSize}`, 'limit');
    }

    return { page: pageNum, limit: limitNum };
  },

  // Validate date range
  validateDateRange(dateFrom, dateTo) {
    let from = null;
    let to = null;
    
    if (dateFrom) {
      from = new Date(dateFrom);
      if (isNaN(from.getTime())) {
        throw new ValidationError('Invalid date format for dateFrom. Use YYYY-MM-DD', 'dateFrom');
      }
    }
    
    if (dateTo) {
      to = new Date(dateTo);
      if (isNaN(to.getTime())) {
        throw new ValidationError('Invalid date format for dateTo. Use YYYY-MM-DD', 'dateTo');
      }
    }
    
    if (from && to && from > to) {
      throw new ValidationError('dateFrom cannot be later than dateTo', 'dateRange');
    }
    
    return { from, to };
  },

  // Validate ECO code
  validateECO(eco) {
    if (!eco) return null;
    
    if (typeof eco !== 'string') {
      throw new ValidationError('ECO code must be a string', 'eco');
    }
    
    const ecoPattern = /^[A-E]\d{2}$/;
    if (!ecoPattern.test(eco.toUpperCase())) {
      throw new ValidationError('ECO code must be in format A00-E99', 'eco');
    }
    
    return eco.toUpperCase();
  },

  // Validate game result
  validateResult(result) {
    if (!result) return null;
    
    const validResults = ['1-0', '0-1', '1/2-1/2', '*'];
    if (!validResults.includes(result)) {
      throw new ValidationError('Result must be one of: 1-0, 0-1, 1/2-1/2, *', 'result');
    }
    
    return result;
  },

  // Validate game ID
  validateGameId(gameId) {
    if (!gameId) {
      throw new ValidationError('Game ID is required', 'gameId');
    }
    
    if (typeof gameId !== 'string') {
      throw new ValidationError('Game ID must be a string', 'gameId');
    }
    
    return gameId.trim();
  },

  // Validate search query parameters
  validateSearchParams(params) {
    const validated = {};

    if (params.player) {
      validated.player = validators.validatePlayerName(params.player);
    }

    if (params.white) {
      validated.white = validators.validatePlayerName(params.white);
    }

    if (params.black) {
      validated.black = validators.validatePlayerName(params.black);
    }

    if (params.dateFrom || params.dateTo) {
      const dateRange = validators.validateDateRange(params.dateFrom, params.dateTo);
      validated.dateFrom = dateRange.from;
      validated.dateTo = dateRange.to;
    }

    if (params.eco) {
      validated.eco = validators.validateECO(params.eco);
    }

    if (params.result) {
      validated.result = validators.validateResult(params.result);
    }

    if (params.event) {
      validated.event = params.event.trim();
    }

    const pagination = validators.validatePagination(params.page, params.limit);
    validated.page = pagination.page;
    validated.limit = pagination.limit;

    return validated;
  }
};

module.exports = {
  ValidationError,
  ...validators
};
