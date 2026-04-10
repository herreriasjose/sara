// src\services\authService.js

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'sara_alostatic_shield_2027';
// Claves para el algoritmo RS256 (Asimétrico)
const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || SECRET;

/**
 * Genera un ID opaco determinista (SARA-ID)
 * Cumple con el blindaje ético para el TFM
 */
exports.hashPhoneNumber = (phone) => {
    return crypto.createHash('sha256').update(phone + SECRET).digest('hex').substring(0, 16);
};

exports.generateEmaToken = (clinicalId, isSimulated = false) => {
    return jwt.sign({ clinicalId, isSimulated }, SECRET, { expiresIn: '2h' });
};

exports.verifyEmaToken = (token) => {
    try {
        return jwt.verify(token, SECRET);
    } catch (e) { 
        return null; 
    }
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

exports.generateSessionToken = (userId, role) => {
    const payload = { id: userId, role };
    const options = {
        expiresIn: '2h',
        algorithm: process.env.JWT_PRIVATE_KEY ? 'RS256' : 'HS256'
    };
    return jwt.sign(payload, PRIVATE_KEY, options);
};

exports.setCookieSession = (res, token) => {
    res.cookie('sara_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 2 * 60 * 60 * 1000 // 2 horas
    });
};

exports.clearCookieSession = (res) => {
    res.clearCookie('sara_session');
};