const path = require('path');

const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.HOST || 'localhost'),
    env: process.env.NODE_ENV || 'development'
  },

  pgn: {
    filePath: process.env.PGN_FILE_PATH || path.join(__dirname, '..', 'games.pgn'),
    indexPath: process.env.PGN_INDEX_PATH || path.join(__dirname, '..', 'pgn_index.json'),
    chunkSize: parseInt(process.env.PGN_CHUNK_SIZE) || 1000, 
    cacheSize: parseInt(process.env.CACHE_SIZE) || 100 
  },

  search: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100,
    maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS) || 1000
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, 
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'palomoelata',
    accessCodeExpiry: process.env.ACCESS_CODE_EXPIRY || '12h', 
    issuer: process.env.JWT_ISSUER || 'chess-api',
    audience: process.env.JWT_AUDIENCE || 'chess-api-users'
  }
};

module.exports = config;
