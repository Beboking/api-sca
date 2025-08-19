const authService = require('../services/authService');
const logger = require('../utils/logger');

const authenticateAccessCode = (req, res, next) => {
  try {
    let accessCode = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessCode = authHeader.substring(7);
    }

    if (!accessCode && req.query.access_code) {
      accessCode = req.query.access_code;
    }

    if (!accessCode && req.body && req.body.access_code) {
      accessCode = req.body.access_code;
    }

    if (!accessCode) {
      return res.status(401).json({
        error: 'No Autorizado',
        message: 'Se requiere código de acceso. Proporciónalo en el header Authorization (Bearer), parámetro de consulta (?access_code=), o en el cuerpo de la solicitud.',
        documentacion: {
          generarCodigo: 'POST /auth/generate-code (solo admin)',
          formatoHeader: 'Authorization: Bearer TU_CODIGO',
          formatoQuery: '?access_code=TU_CODIGO'
        }
      });
    }

    const validation = authService.validateAccessCode(accessCode);

    if (!validation.valid) {
      logger.warn('Invalid access code attempt', {
        error: validation.error,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        accessCode: accessCode.substring(0, 3) + '***' 
      });

      return res.status(401).json({
        error: 'No Autorizado',
        message: validation.error,
        documentacion: {
          generarCodigo: 'POST /auth/generate-code (solo admin)'
        }
      });
    }

    req.auth = {
      accessCode: validation.accessCode,
      expiresAt: validation.expiresAt,
      usageCount: validation.usageCount,
      type: validation.type
    };

    logger.debug('Request authenticated successfully', {
      accessCode: validation.accessCode,
      usageCount: validation.usageCount,
      url: req.url,
      method: req.method
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Error Interno del Servidor',
      message: 'Servicio de autenticación temporalmente no disponible'
    });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token && req.query.access_code) {
      token = req.query.access_code;
    }
    
    if (!token && req.body && req.body.access_code) {
      token = req.body.access_code;
    }

    if (!token) {
      req.auth = null;
      return next();
    }

    // Validate the access code
    const validation = authService.validateAccessCode(token);
    
    if (validation.valid) {
      req.auth = {
        codeId: validation.codeId,
        userInfo: validation.userInfo,
        expiresAt: validation.expiresAt,
        usageCount: validation.usageCount
      };
    } else {
      req.auth = null;
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error.message,
      url: req.url,
      ip: req.ip
    });
    
    req.auth = null;
    next();
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required for admin access'
    });
  }

  next();
};

module.exports = {
  authenticateAccessCode,
  optionalAuth,
  requireAdmin
};
