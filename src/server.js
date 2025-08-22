// src/server.js
'use strict';

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const config = require('./config');
const logger = require('./utils/logger');

const gameController = require('./controllers/gameController');
const authController = require('./controllers/authController');

const {
  errorHandler,
  notFoundHandler,
} = require('./middleware/errorHandler');

const {
  authenticateAccessCode,
  optionalAuth,
  requireAdmin,
} = require('./middleware/authMiddleware');

const app = express();

/* ---------------------------- Security middleware --------------------------- */
app.use(helmet());

/* ---------------------------------- CORS ----------------------------------- */
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/* ----------------------------- Rate limiting -------------------------------- */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too Many Requests',
    message:
      'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/* --------------------------- Body parsers & JSON ---------------------------- */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ------------------------------ Basic logging ------------------------------- */
app.use((req, _res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

/* ------------------------------ Health checks ------------------------------- */
// Render hace HEAD / para verificar el puerto; responde 200.
app.head('/', (_req, res) => res.sendStatus(200));
// Útil para debugging manual.
app.get('/', (_req, res) => res.send('OK'));
app.get('/health', gameController.healthCheck);
app.get('/auth/health', authController.authHealthCheck);

/* ----------------------------- Auth endpoints ------------------------------- */
app.post('/auth/generate-code', authController.generateAccessCode);
app.post('/auth/validate', authController.validateAccessCode);

/* --------------------------- Protected API routes --------------------------- */
app.get('/stats', authenticateAccessCode, gameController.getStats);
app.get('/games/search', authenticateAccessCode, gameController.searchGames);
app.get('/games/:gameId', authenticateAccessCode, gameController.getGameById);
app.get('/players/suggestions', authenticateAccessCode, gameController.getPlayerSuggestions);

/* --------------------------- Authenticated user APIs ------------------------ */
app.get('/auth/info', authenticateAccessCode, authController.getAccessCodeInfo);
app.post('/auth/revoke', authenticateAccessCode, authController.revokeAccessCode);

/* --------------------------------- Admin APIs ------------------------------- */
app.get('/auth/stats', authenticateAccessCode, requireAdmin, authController.getAuthStats);
app.get('/auth/codes', authenticateAccessCode, requireAdmin, authController.listActiveCodes);
app.delete('/auth/codes/:codeId', authenticateAccessCode, requireAdmin, authController.revokeAccessCodeById);

/* ---------------------- Backward compatibility (/games) --------------------- */
app.get('/games', authenticateAccessCode, (req, res, next) => {
  if (req.query.player) {
    req.url = '/games/search';
    return gameController.searchGames(req, res, next);
  }

  res.status(400).json({
    error: 'Bad Request',
    message:
      'Please use /games/search endpoint with appropriate parameters',
    documentation: {
      authentication:
        'All endpoints now require authentication. Generate an access code at POST /auth/generate-code',
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
        limit: 'Results per page (default: 20, max: 100)',
      },
    },
  });
});

/* ---------------------------- Error middlewares ----------------------------- */
app.use(notFoundHandler);
app.use(errorHandler);

/* --------------------------- Graceful shutdown ------------------------------ */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

/* --------------------------------- Server ---------------------------------- */
// Para Render: PORT desde env y host 0.0.0.0 en producción.
const PORT = process.env.PORT || config.server.port || 3000;
const HOST =
  process.env.NODE_ENV === 'production' ? '0.0.0.0' : (config.server.host || '0.0.0.0');

app.listen(PORT, HOST, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: config.server.env,
    nodeVersion: process.version,
  });
});
