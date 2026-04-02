// src/controllers/emaController.js

const CaretakerClinical = require('../models/CaretakerClinical');
const EmaEntry = require('../models/EmaEntry');
const brainClient = require('../services/brainClient');
const { encrypt, decrypt } = require('../services/encryptionService');

exports.submitEma = async (req, res) => {
    try {
        const internalId = req.user ? req.user.externalId : req.body.externalId; 
        const { energy, tension, clarity, responseTimeMs } = req.body;

        const clinicalProfile = await CaretakerClinical.findOne({ externalId: internalId });
        if (!clinicalProfile) return res.status(404).json({ error: 'Contexto clínico no encontrado.' });

        const newEma = new EmaEntry({
            patientId: clinicalProfile._id,
            metrics: { energy: parseInt(energy), tension: parseInt(tension), clarity: parseInt(clarity) },
            responseTimeMs: parseInt(responseTimeMs) || 0
        });

        await newEma.save();

        try {
            const currentProb = Number(decrypt(clinicalProfile.lastBurnoutProbability));
            
            const prediction = await brainClient.getBurnoutPrediction({
                metrics: newEma.metrics,
                priorProbability: currentProb,
                context: {
                    caregiver: { age: clinicalProfile.age, gender: clinicalProfile.gender },
                    patient: { age: clinicalProfile.patientAge, gender: clinicalProfile.patientGender },
                    dynamics: { years: clinicalProfile.yearsCaregiving, burden: clinicalProfile.burdenType, support: clinicalProfile.hasExternalSupport }
                }
            });

            // Si Python falla o retorna null, mantenemos el Prior (currentProb)
            clinicalProfile.lastBurnoutProbability = encrypt(prediction?.posteriorProbability ?? currentProb);
            
            clinicalProfile.lastInteractionAt = new Date();
            clinicalProfile.streakCount += 1;
            await clinicalProfile.save();

        } catch (brainError) {
            console.error('[Gateway ↔ Brain] Fallo de inferencia bayesiana.', brainError.message);
        }

        if (req.accepts('html')) return res.redirect('/?status=ema_saved');
        
        return res.status(200).json({ status: 'ok' });

    } catch (error) {
        res.status(500).json({ error: 'Fallo al procesar la evaluación.' });
    }
};