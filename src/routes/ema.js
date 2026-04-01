// src/routes/ema.js

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
router.post('/r/:token', requireAuth(['caretaker_write']), async (req, res) => {
    const patientId = req.user.id;
    const { energy, tension, clarity, startTime } = req.body;
    const responseTimeMs = Date.now() - startTime;

    const entry = await EmaEntry.create({
        patientId,
        metrics: { energy, tension, clarity },
        responseTimeMs
    });

    const prediction = await brainClient.getBurnoutPrediction({ energy, tension, clarity });

    await CaretakerClinical.findOneAndUpdate(
        { externalId: patientId },
        {
            $inc: { streakCount: 1 },
            lastBurnoutProbability: encrypt(prediction?.probability || 0),
            lastInteractionAt: new Date()
        }
    );

    res.status(200).json({ status: 'success', blindAck: true });
});