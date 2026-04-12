// src\routes\ema.js

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

router.get('/r/:token', verifyTokenMiddleware, async (req, res) => {
    try {
        const { emaEntryId } = req.emaPayload;
        
        await EmaEntry.updateOne(
            { _id: emaEntryId, status: 'pending', openedAt: { $exists: false } },
            { $set: { openedAt: new Date() } }
        );

        res.render('pages/ema', { token: req.params.token });
    } catch (error) {
        res.status(500).send('Error de telemetría pasiva.');
    }
});

router.post('/r/:token', verifyTokenMiddleware, async (req, res) => {
    const { clinicalId, emaEntryId, isSimulated } = req.emaPayload;
    const { energy, tension, clarity, responseTimeMs } = req.body;

    try {
        const clinicalRecord = await CaretakerClinical.findById(clinicalId);
        if (!clinicalRecord) return res.status(404).json({ error: 'Contexto clínico no hallado.' });

        const emaRecord = await EmaEntry.findById(emaEntryId);
        if (!emaRecord) return res.status(404).json({ error: 'Traza de telemetría no hallada.' });
        if (emaRecord.status !== 'pending') return res.status(409).json({ error: 'Registro ya consolidado o expirado.' });

        emaRecord.status = 'completed';
        emaRecord.responseTimeMs = parseInt(responseTimeMs, 10);
        emaRecord.metrics = { 
            energy: parseInt(energy, 10), 
            tension: parseInt(tension, 10), 
            clarity: parseInt(clarity, 10) 
        };

        // Intercepción JITAI: Cálculo determinista de Latencias para Simulaciones
        if (isSimulated) {
            const dispTime = emaRecord.dispatchedAt ? emaRecord.dispatchedAt.getTime() : Date.now();
            const dispHour = emaRecord.dispatchedAt ? emaRecord.dispatchedAt.getHours() : 8;
            
            let attentionDelayMin = 0;
            // Ponderación circadiana de la Latencia de Atención
            if (dispHour >= 6 && dispHour < 12) {
                attentionDelayMin = Math.floor(Math.random() * 15) + 1;       // Mañana: 1-15 min
            } else if (dispHour >= 12 && dispHour < 18) {
                attentionDelayMin = Math.floor(Math.random() * 45) + 15;      // Tarde: 15-60 min
            } else {
                attentionDelayMin = Math.floor(Math.random() * 120) + 60;     // Noche: 60-180 min
            }
            
            const simulatedOpenedAt = dispTime + (attentionDelayMin * 60 * 1000);
            emaRecord.openedAt = new Date(simulatedOpenedAt);
            emaRecord.completedAt = new Date(simulatedOpenedAt + emaRecord.responseTimeMs);
        } else {
            // Flujo Ecológico Real
            emaRecord.completedAt = new Date();
        }

        await emaRecord.save(); 

        if (isSimulated) {
            return res.status(200).json({ status: 'success', blindAck: true, simulated: true });
        }

        const priorProbability = Number(decrypt(clinicalRecord.lastBurnoutProbability));
        let prediction = null;

        try {
            prediction = await brainClient.getBurnoutPrediction({
                metrics: emaRecord.metrics,
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