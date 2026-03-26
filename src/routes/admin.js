const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const ADMIN_TOKEN = process.env.SARA_ADMIN_TOKEN || 'sara_dev_token';

// Middleware de seguridad
const requireAdmin = (req, res, next) => {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Acceso Denegado: Brecha de seguridad evitada.' });
    }
    next();
};

// GET /api/admin/logs/:service
router.get('/logs/:service', requireAdmin, (req, res) => {
    const service = req.params.service;
    
    if (!['gateway', 'brain'].includes(service)) {
        return res.status(400).json({ error: 'Servicio no reconocido. Usa "gateway" o "brain".' });
    }

    // Navegamos desde src/routes/ hacia /logs/ en la raíz
    const logPath = path.join(__dirname, '../../logs', `${service}.log`);

    if (!fs.existsSync(logPath)) {
        return res.status(404).json({ error: `El archivo de log para ${service} aún no existe.` });
    }

    try {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const last100Lines = lines.slice(-100);

        res.json({
            service: service,
            totalLines: lines.length,
            showing: last100Lines.length,
            logs: last100Lines
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al leer el archivo de log.' });
    }
});

module.exports = router;