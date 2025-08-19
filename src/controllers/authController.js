const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  // Generate a new simple access code (admin only)
  async generateAccessCode(req, res, next) {
    try {
      logger.info('Simple access code generation requested', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Collect admin information for the access code
      const adminInfo = {
        adminId: req.body?.adminId || 'admin',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        purpose: req.body?.purpose || 'Acceso a partidas de ajedrez'
      };

      // Generate the simple access code
      const result = authService.generateSimpleAccessCode(adminInfo);

      logger.info('Simple access code generated successfully', {
        accessCode: result.accessCode,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        ...result,
        instrucciones: {
          uso: 'Proporciona este código a los usuarios para acceder al sistema',
          formatos: {
            header: 'Authorization: Bearer ' + result.accessCode,
            query: '?access_code=' + result.accessCode,
            body: '{ "access_code": "' + result.accessCode + '" }'
          }
        },
        endpoints: {
          buscar: '/games/search',
          partida: '/games/:gameId',
          sugerencias: '/players/suggestions',
          estadisticas: '/stats'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Validate a simple access code
  async validateAccessCode(req, res, next) {
    try {
      const { access_code } = req.body;

      if (!access_code) {
        return res.status(400).json({
          error: 'Solicitud Incorrecta',
          message: 'Se requiere access_code en el cuerpo de la solicitud'
        });
      }

      const validation = authService.validateAccessCode(access_code);

      if (!validation.valid) {
        return res.status(401).json({
          error: 'No Autorizado',
          message: validation.error
        });
      }

      res.json({
        valido: true,
        codigo: validation.accessCode,
        expira: validation.expiresAt,
        usos: validation.usageCount,
        mensaje: 'Código de acceso válido',
        tiempoRestante: authController.calculateTimeRemaining(validation.expiresAt)
      });
    } catch (error) {
      next(error);
    }
  }

  // Get information about the current access code
  async getAccessCodeInfo(req, res, next) {
    try {
      if (!req.auth) {
        return res.status(401).json({
          error: 'No Autorizado',
          message: 'Se requiere autenticación'
        });
      }

      const codeInfo = authService.getAccessCodeInfo(req.auth.accessCode);

      if (!codeInfo) {
        return res.status(404).json({
          error: 'No Encontrado',
          message: 'Información del código de acceso no encontrada'
        });
      }

      res.json({
        codigo: codeInfo.accessCode,
        expira: codeInfo.expiresAt,
        creado: codeInfo.createdAt,
        usos: codeInfo.usageCount,
        ultimoUso: codeInfo.lastUsed,
        tiempoRestante: authController.calculateTimeRemaining(codeInfo.expiresAt),
        tipo: codeInfo.type,
        expirado: codeInfo.isExpired
      });
    } catch (error) {
      next(error);
    }
  }

  // Revoke the current access code
  async revokeAccessCode(req, res, next) {
    try {
      if (!req.auth) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const result = authService.revokeAccessCode(req.auth.codeId);
      
      if (!result.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: result.error
        });
      }

      logger.info('Access code revoked by user', {
        codeId: req.auth.codeId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Access code revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get authentication statistics (admin only)
  async getAuthStats(req, res, next) {
    try {
      const stats = authService.getAuthStats();
      
      res.json({
        ...stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // List all active access codes (admin only)
  async listActiveCodes(req, res, next) {
    try {
      const codes = authService.listActiveCodes();
      
      res.json({
        activeCodes: codes,
        count: codes.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // Revoke a specific access code by ID (admin only)
  async revokeAccessCodeById(req, res, next) {
    try {
      const { codeId } = req.params;

      if (!codeId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'codeId parameter is required'
        });
      }

      const result = authService.revokeAccessCode(codeId);
      
      if (!result.success) {
        return res.status(404).json({
          error: 'Not Found',
          message: result.error
        });
      }

      logger.info('Access code revoked by admin', {
        codeId,
        adminCodeId: req.auth.codeId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: `Access code ${codeId} revoked successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to calculate time remaining
  calculateTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) {
      return 'Expired';
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Health check for auth service
  async authHealthCheck(req, res, next) {
    try {
      const stats = authService.getAuthStats();
      
      res.json({
        status: 'healthy',
        service: 'authentication',
        ...stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        service: 'authentication',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

const authController = new AuthController();
module.exports = authController;
