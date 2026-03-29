// src/services/auditLogger.js

const fs = require('node:fs');
const path = require('node:path');

const logPath = path.join(__dirname, '../../logs/accesses.log');

exports.logAccess = (action, targetId, actor = 'System') => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [AUDIT] Actor: ${actor} | Action: ${action} | Target: ${targetId}\n`;
    
    fs.appendFile(logPath, entry, (err) => {
        if (err) console.error('[Vault] Fallo crítico en trazabilidad de log:', err);
    });
};