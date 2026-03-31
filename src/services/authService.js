// src\services\authService.js

const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'sara_alostatic_shield_2027';

/**
 * Genera un ID opaco determinista (SARA-ID)
 * Cumple con el blindaje ético para el TFM
 */
exports.hashPhoneNumber = (phone) => {
    return crypto.createHash('sha256').update(phone + SECRET).digest('hex').substring(0, 16);
};

exports.generateEmaToken = (patientId) => {
    const expiresAt = Date.now() + (2 * 60 * 60 * 1000);
    const data = `${patientId}:${expiresAt}`;
    const hash = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    return Buffer.from(`${data}:${hash}`).toString('base64url');
};

exports.verifyEmaToken = (token) => {
    try {
        const decoded = Buffer.from(token, 'base64url').toString();
        const [patientId, expiresAt, hash] = decoded.split(':');
        if (Date.now() > parseInt(expiresAt)) return null;
        const expectedHash = crypto.createHmac('sha256', SECRET)
            .update(`${patientId}:${expiresAt}`)
            .digest('hex');
        return (hash === expectedHash) ? patientId : null;
    } catch (e) { return null; }
};

exports.generateBlindIndex = (text) => {
    if (!text) return null;
    return crypto.createHmac('sha256', SECRET)
        .update(text.toLowerCase().trim())
        .digest('hex');
};

exports.hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
};

exports.verifyPassword = (password, hash) => {
    if (!hash || typeof hash !== 'string' || !hash.includes(':')) return false;
    const [salt, key] = hash.split(':');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return key === derivedKey;
};