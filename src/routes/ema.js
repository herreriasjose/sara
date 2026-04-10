const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EmaEntry = require('../models/EmaEntry');
const CaretakerClinical = require('../models/CaretakerClinical');
const brainClient = require('../services/brainClient');
const requireAuth = require('../middlewares/requireAuth');
const { verifyEmaToken } = require('../services/authService');
const { encrypt, decrypt } = require('../services/encryptionService');

const verifyTokenMiddleware = (req, res, next) => {
    const payload = verifyEmaToken(req.params.token);
    if (!payload) return res.status(401).send('Enlace caducado o inválido. Protocolo de tiempo real incumplido.');
    req.emaPayload = payload;
    next();
};

router.get('/r/:token', verifyTokenMiddleware, (req, res) => {
    res.render('pages/ema', { token: req.params.token });
});

router.post('/r/:token', verifyTokenMiddleware, async (req, res) => {
    const { clinicalId, isSimulated } = req.emaPayload;
    const { energy, tension, clarity, responseTimeMs } = req.body;

    try {
        const clinicalRecord = await CaretakerClinical.findById(clinicalId);
        if (!clinicalRecord) return res.status(404).json({ error: 'Contexto clínico no hallado.' });

        const newEma = await EmaEntry.create({
            patientId: clinicalRecord._id,
            metrics: { 
                energy: parseInt(energy, 10), 
                tension: parseInt(tension, 10), 
                clarity: parseInt(clarity, 10) 
            },
            responseTimeMs: parseInt(responseTimeMs, 10),
            isSimulated: isSimulated || false
        });

        if (isSimulated) {
            return res.status(200).json({ status: 'success', blindAck: true, simulated: true });
        }

        const priorProbability = Number(decrypt(clinicalRecord.lastBurnoutProbability));

        let prediction = null;
        try {
            prediction = await brainClient.getBurnoutPrediction({
                metrics: newEma.metrics,
                priorProbability: priorProbability,
                context: {
                    caregiver: { age: clinicalRecord.age, gender: clinicalRecord.gender },
                    patient: { age: clinicalRecord.patientAge, gender: clinicalRecord.patientGender },
                    dynamics: { years: clinicalRecord.yearsCaregiving, burden: clinicalRecord.burdenType, support: clinicalRecord.hasExternalSupport }
                }
            });
        } catch (brainError) {
            console.error('[SARA-Gateway] Colapso Motor Inferencia:', brainError.message);
        }

        // Si falla la inferencia, preservamos el Prior (Resiliencia sistémica)
        const posteriorProb = prediction?.posteriorProbability ?? prediction?.probability ?? priorProbability;

        await CaretakerClinical.findByIdAndUpdate(clinicalRecord._id, {
            $inc: { streakCount: 1 },
            lastBurnoutProbability: encrypt(posteriorProb),
            lastInteractionAt: new Date()
        });

        res.status(200).json({ status: 'success', blindAck: true });
    } catch (error) {
        console.error('[SARA-EMA] Fallo general:', error); 
        res.status(500).json({ error: 'Fallo de integridad en persistencia EMA.' });
    }
});

router.get('/status/:id', requireAuth(['admin', 'researcher']), async (req, res) => {
    try {
        const query = mongoose.Types.ObjectId.isValid(req.params.id) 
            ? { $or: [{ externalId: req.params.id }, { _id: req.params.id }] } 
            : { externalId: req.params.id };
        
        const clinical = await CaretakerClinical.findOne(query).lean();
        if (!clinical) return res.status(404).send('Identidad clínica no hallada.');

        const entries = await EmaEntry.find({ patientId: clinical._id }).sort({ createdAt: -1 }).lean();
        res.render('pages/caretaker-status', { clinical, entries });
    } catch (error) {
        res.status(500).send('Fallo de integridad al recuperar datos.');
    }
});

module.exports = router;