// src/services/encryptionService.js

// src/services/encryptionService.js
const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT = 'sara-alostatic-vault-2027';

let cachedKey = null;

const getKey = () => {
    if (!cachedKey) {
        const secret = process.env.SARA_MASTER_KEY || 'sara_test_fallback_key_2026';
        cachedKey = crypto.scryptSync(secret, SALT, 32);
    }
    return cachedKey;
};

exports.encrypt = (text) => {
    if (text === null || text === undefined) return text;
    const stringValue = typeof text === 'object' ? JSON.stringify(text) : String(text);
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    let encrypted = cipher.update(stringValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

exports.decrypt = (hash) => {
    if (!hash || typeof hash !== 'string' || !hash.includes(':')) return hash;
    
    const parts = hash.split(':');
    if (parts.length !== 3) return hash;

    const [ivHex, authTagHex, encryptedHex] = parts;
    
    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    } catch (error) {
        console.error('[Vault] Fallo de integridad o descifrado:', error.message);
        return null;
    }
};