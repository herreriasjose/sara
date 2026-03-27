// src/routes/api.js

const express = require('express');
const router = express.Router();
const emaController = require('../controllers/emaController');

// 1. Importación de Middlewares (El "Blindaje Ético")
// Asumimos que estos archivos existen en tu carpeta src/middlewares/
const validateRgpd = require('../middlewares/validateRgpd');
const requireAuth = require('../middlewares/requireAuth');

// 2. Healthcheck (Optimizado para el Load Balancer de AWS)
router.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        service: 'SARA-Gateway',
        timestamp: new Date().toISOString() 
    });
});

// 3. Rutas Core (JITAI & EMA)

// Ruta de Registro: Pasa por el filtro RGPD estricto antes del controlador
router.post('/patients', validateRgpd, emaController.registerPatient);

// Ruta EMA: Protegida mediante token efímero (o validación de origen de WhatsApp)
router.post('/ema', requireAuth, emaController.submitEma);

module.exports = router;