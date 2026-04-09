const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Requerido para validar ObjectId
const jwt = require('jsonwebtoken');
const EmaEntry = require('../models/EmaEntry');
const CaretakerClinical = require('../models/CaretakerClinical');
const brainClient = require('../services/brainClient');

const verifyEmaToken = (req, res, next) => {
    const { token } = req.params;
    try {
        req.emaPayload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_development');
        next();
    } catch (error) {
        return res.status(401).send('Enlace caducado o inválido. Protocolo de tiempo real incumplido.');
    }
};

// GET: Renderiza el formulario
router.get('/r/:token', verifyEmaToken, (req, res) => {
    res.render('pages/ema', { token: req.params.token });
});

// POST: Procesa la entrada
router.post('/r/:token', verifyEmaToken, async (req, res) => {
    const { externalId, isSimulated } = req.emaPayload;
    const { energy, tension, clarity, responseTimeMs } = req.body;

    try {
        // Blindaje contra CastError: Solo usamos $or si el ID tiene formato válido de MongoDB
        let query = { externalId: externalId };
        if (mongoose.Types.ObjectId.isValid(externalId)) {
            query = { $or: [{ externalId: externalId }, { _id: externalId }] };
        }
        
        const clinicalRecord = await CaretakerClinical.findOne(query);
        
        if (!clinicalRecord) {
            console.error(`[SARA-EMA] Identidad clínica huérfana para ID: ${externalId}`);
            return res.status(404).json({ error: 'Identidad clínica no hallada en persistencia.' });
        }

        // Parseo explícito de métricas para evitar fallos de esquema por Strings inyectados
        await EmaEntry.create({
            patientId: clinicalRecord._id,
            metrics: { 
                energy: parseInt(energy, 10), 
                tension: parseInt(tension, 10), 
                clarity: parseInt(clarity, 10) 
            },
            responseTimeMs: parseInt(responseTimeMs, 10),
            isSimulated: isSimulated || false
        });

        // Cortafuegos JITAI: Los simulacros no contaminan el motor Bayesiano
        if (isSimulated) {
            return res.status(200).json({ status: 'success', blindAck: true, simulated: true });
        }

        const prediction = await brainClient.getBurnoutPrediction({ energy, tension, clarity });

        await CaretakerClinical.findByIdAndUpdate(clinicalRecord._id, {
            $inc: { streakCount: 1 },
            lastBurnoutProbability: prediction?.probability || 0,
            lastInteractionAt: new Date()
        });

        res.status(200).json({ status: 'success', blindAck: true });
    } catch (error) {
        // Registro nativo del core del error para auditoría en gateway.log
        console.error('[SARA-EMA] Colapso de persistencia:', error); 
        res.status(500).json({ error: 'Fallo de integridad en persistencia EMA.' });
    }
});

module.exports = router;