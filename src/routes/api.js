// src/routes/api.js

// src/routes/api.js
const express = require('express');
const router = express.Router();
const emaController = require('../controllers/emaController');

// Middlewares de protección
const validateRgpd = require('../middlewares/validateRgpd');
const requireAuth = require('../middlewares/requireAuth');

/**
 * Rutas Públicas / Healthcheck
 */
router.get('/ping', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'SARA-Gateway', node: process.version });
});

/**
 * Registro de Participantes
 * Protegido por validación de consentimiento RGPD
 */
router.post('/caretakers', validateRgpd, emaController.registerCaretaker);

/**
 * Captura de Datos EMA
 * Protegido por Token Efímero (Auth)
 */
router.post('/ema', requireAuth, emaController.submitEma);

module.exports = router;