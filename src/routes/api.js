// src/routes/api.js
const express = require('express');
const router = express.Router();
const emaController = require('../controllers/emaController');

// Healthcheck rápido
router.get('/ping', (req, res) => {
    res.json({ status: 'ok', message: 'SARA API is running' });
});

// Rutas de Pacientes y EMA
router.post('/patients', emaController.registerPatient);
router.post('/ema', emaController.submitEma);

module.exports = router;