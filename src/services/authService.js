const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.activeCodes = new Map(); 
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCodes();
    }, 60 * 60 * 1000); 
  }

  generateSimpleAccessCode(adminInfo = {}) {
    try {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let accessCode = '';
      for (let i = 0; i < 8; i++) {
        accessCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      while (this.activeCodes.has(accessCode)) {
        accessCode = '';
        for (let i = 0; i < 8; i++) {
          accessCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
      }

      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
      this.activeCodes.set(accessCode, {
        expiresAt,
        adminInfo: {
          generatedBy: adminInfo.adminId || 'admin',
          ip: adminInfo.ip || 'unknown',
          userAgent: adminInfo.userAgent || 'unknown',
          ...adminInfo
        },
        usageCount: 0,
        createdAt: new Date(),
        type: 'simple_code'
      });

      logger.info('Simple access code generated', {
        accessCode,
        expiresAt: expiresAt.toISOString(),
        generatedBy: adminInfo.adminId || 'admin'
      });

      return {
        accessCode,
        expiresAt: expiresAt.toISOString(),
        expiresIn: '12 horas',
        message: `Código de acceso generado: ${accessCode}. Válido por 12 horas.`
      };
    } catch (error) {
      logger.error('Failed to generate simple access code', { error: error.message });
      throw new Error('Failed to generate access code');
    }
  }

  // Validate a simple access code
  validateAccessCode(accessCode) {
    try {
      if (!accessCode) {
        return { valid: false, error: 'Código de acceso requerido' };
      }

      const cleanCode = accessCode.toString().trim().toUpperCase();

      const codeInfo = this.activeCodes.get(cleanCode);
      if (!codeInfo) {
        return { valid: false, error: 'Código de acceso no válido o revocado' };
      }

      if (new Date() > codeInfo.expiresAt) {
        this.activeCodes.delete(cleanCode);
        return { valid: false, error: 'Código de acceso expirado' };
      }

      codeInfo.usageCount++;
      codeInfo.lastUsed = new Date();

      logger.debug('Access code validated successfully', {
        accessCode: cleanCode,
        usageCount: codeInfo.usageCount
      });

      return {
        valid: true,
        accessCode: cleanCode,
        expiresAt: codeInfo.expiresAt.toISOString(),
        usageCount: codeInfo.usageCount,
        type: codeInfo.type
      };
    } catch (error) {
      logger.error('Access code validation failed', { error: error.message });
      return { valid: false, error: 'Error validando código de acceso' };
    }
  }

  revokeAccessCode(accessCode) {
    try {
      const cleanCode = accessCode.toString().trim().toUpperCase();
      const codeInfo = this.activeCodes.get(cleanCode);
      if (!codeInfo) {
        return { success: false, error: 'Código de acceso no encontrado' };
      }

      this.activeCodes.delete(cleanCode);

      logger.info('Access code revoked', { accessCode: cleanCode });

      return {
        success: true,
        message: 'Código de acceso revocado exitosamente'
      };
    } catch (error) {
      logger.error('Failed to revoke access code', { error: error.message, accessCode });
      return { success: false, error: 'Error revocando código de acceso' };
    }
  }

  getAccessCodeInfo(accessCode) {
    const cleanCode = accessCode.toString().trim().toUpperCase();
    const codeInfo = this.activeCodes.get(cleanCode);
    if (!codeInfo) {
      return null;
    }

    return {
      accessCode: cleanCode,
      expiresAt: codeInfo.expiresAt.toISOString(),
      createdAt: codeInfo.createdAt.toISOString(),
      usageCount: codeInfo.usageCount,
      lastUsed: codeInfo.lastUsed ? codeInfo.lastUsed.toISOString() : null,
      adminInfo: codeInfo.adminInfo,
      type: codeInfo.type,
      isExpired: new Date() > codeInfo.expiresAt
    };
  }

  getAuthStats() {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    let totalUsage = 0;

    for (const [codeId, codeInfo] of this.activeCodes.entries()) {
      if (now > codeInfo.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
      totalUsage += codeInfo.usageCount;
    }

    return {
      totalCodes: this.activeCodes.size,
      activeCodes: activeCount,
      expiredCodes: expiredCount,
      totalUsage,
      averageUsage: this.activeCodes.size > 0 ? (totalUsage / this.activeCodes.size).toFixed(2) : 0
    };
  }

  cleanupExpiredCodes() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [codeId, codeInfo] of this.activeCodes.entries()) {
      if (now > codeInfo.expiresAt) {
        this.activeCodes.delete(codeId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired access codes', { cleanedCount });
    }
  }

  listActiveCodes() {
    const codes = [];
    const now = new Date();

    for (const [accessCode, codeInfo] of this.activeCodes.entries()) {
      if (now <= codeInfo.expiresAt) {
        codes.push({
          accessCode,
          expiresAt: codeInfo.expiresAt.toISOString(),
          createdAt: codeInfo.createdAt.toISOString(),
          usageCount: codeInfo.usageCount,
          lastUsed: codeInfo.lastUsed ? codeInfo.lastUsed.toISOString() : null,
          adminInfo: codeInfo.adminInfo,
          type: codeInfo.type,
          timeRemaining: this.calculateTimeRemaining(codeInfo.expiresAt.toISOString())
        });
      }
    }

    return codes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  calculateTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;

    if (diffMs <= 0) {
      return 'Expirado';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Cleanup on service shutdown
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.activeCodes.clear();
  }
}

module.exports = new AuthService();
