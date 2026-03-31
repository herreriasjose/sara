// src/services/auditLogger.js

const fs = require('node:fs');
const path = require('node:path');

const logPath = path.join(__dirname, '../../logs/accesses.log');

const getLocalTimestamp = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, -1);
};

exports.logAccess = (action, targetId, actor = 'System') => {
    const timestamp = getLocalTimestamp();
    const entry = `[${timestamp}] [AUDIT] Actor: ${actor} | Action: ${action} | Target: ${targetId}\n`;
    
    fs.appendFile(logPath, entry, (err) => {
        if (err) console.error('[Vault] Fallo crítico en trazabilidad de log:', err);
    });
};