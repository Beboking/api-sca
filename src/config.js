const path = require('path');

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // PGN file configuration
  pgn: {
    filePath: process.env.PGN_FILE_PATH || path.join(__dirname, '..', 'games.pgn'),
    indexPath: process.env.PGN_INDEX_PATH || path.join(__dirname, '..', 'pgn_index.json'),
    chunkSize: parseInt(process.env.PGN_CHUNK_SIZE) || 1000, // Number of games to load per chunk
    cacheSize: parseInt(process.env.CACHE_SIZE) || 100 // Number of search results to cache
  },

  // Search configuration
  search: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100,
    maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS) || 1000
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // limit each IP to 100 requests per windowMs
  },

  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessCodeExpiry: process.env.ACCESS_CODE_EXPIRY || '12h', // 12 hours
    issuer: process.env.JWT_ISSUER || 'chess-api',
    audience: process.env.JWT_AUDIENCE || 'chess-api-users'
  }
};

module.exports = config;
