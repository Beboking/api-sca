const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const config = require('./config');
const logger = require('./utils/logger');
const gameController = require('./controllers/gameController');
const authController = require('./controllers/authController');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { authenticateAccessCode, optionalAuth, requireAdmin } = require('./middleware/authMiddleware');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Public API Routes (no authentication required)
app.get('/health', gameController.healthCheck);
app.get('/auth/health', authController.authHealthCheck);

// Authentication Routes
app.post('/auth/generate-code', authController.generateAccessCode);
app.post('/auth/validate', authController.validateAccessCode);

// Protected API Routes (authentication required)
app.get('/stats', authenticateAccessCode, gameController.getStats);
app.get('/games/search', authenticateAccessCode, gameController.searchGames);
app.get('/games/:gameId', authenticateAccessCode, gameController.getGameById);
app.get('/players/suggestions', authenticateAccessCode, gameController.getPlayerSuggestions);

// Authenticated user routes
app.get('/auth/info', authenticateAccessCode, authController.getAccessCodeInfo);
app.post('/auth/revoke', authenticateAccessCode, authController.revokeAccessCode);

// Admin routes (require authentication)
app.get('/auth/stats', authenticateAccessCode, requireAdmin, authController.getAuthStats);
app.get('/auth/codes', authenticateAccessCode, requireAdmin, authController.listActiveCodes);
app.delete('/auth/codes/:codeId', authenticateAccessCode, requireAdmin, authController.revokeAccessCodeById);

// Backward compatibility route (now requires authentication)
app.get('/games', authenticateAccessCode, (req, res, next) => {
  // Redirect old /games?player= requests to new search endpoint
  if (req.query.player) {
    req.url = '/games/search';
    return gameController.searchGames(req, res, next);
  }

  res.status(400).json({
    error: 'Bad Request',
    message: 'Please use /games/search endpoint with appropriate parameters',
    documentation: {
      authentication: 'All endpoints now require authentication. Generate an access code at POST /auth/generate-code',
      searchEndpoint: '/games/search',
      parameters: {
        player: 'Search by player name (either white or black)',
        white: 'Search by white player name',
        black: 'Search by black player name',
        dateFrom: 'Filter games from date (YYYY-MM-DD)',
        dateTo: 'Filter games to date (YYYY-MM-DD)',
        eco: 'Filter by ECO code (e.g., E90)',
        result: 'Filter by result (1-0, 0-1, 1/2-1/2, *)',
        event: 'Filter by event name',
        page: 'Page number (default: 1)',
        limit: 'Results per page (default: 20, max: 100)'
      }
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`, {
    environment: config.server.env,
    nodeVersion: process.version
  });
});
