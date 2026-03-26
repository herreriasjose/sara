// src/services/authService.js
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'sara_alostatic_shield_2027';

/**
 * Genera un token efímero para el link de WhatsApp
 * @param {string} patientId - ID interno de MongoDB
 */
exports.generateEmaToken = (patientId) => {
    const expiresAt = Date.now() + (2 * 60 * 60 * 1000); // 2 horas de validez
    const data = `${patientId}:${expiresAt}`;
    const hash = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    // Retornamos un base64 simple para la URL
    return Buffer.from(`${data}:${hash}`).toString('base64url');
};

/**
 * Valida el token y devuelve el patientId
 */
exports.verifyEmaToken = (token) => {
    try {
        const decoded = Buffer.from(token, 'base64url').toString();
        const [patientId, expiresAt, hash] = decoded.split(':');
        
        if (Date.now() > parseInt(expiresAt)) return null; // Token caducado

        const expectedHash = crypto.createHmac('sha256', SECRET)
            .update(`${patientId}:${expiresAt}`)
            .digest('hex');

        return (hash === expectedHash) ? patientId : null;
    } catch (e) {
        return null;
    }
};