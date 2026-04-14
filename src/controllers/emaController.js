// src/controllers/emaController.js

const EmaEntry = require('../models/EmaEntry');
const CaretakerClinical = require('../models/CaretakerClinical');
const brainClient = require('../services/brainClient');
const { encrypt, decrypt } = require('../services/encryptionService');

exports.submitEma = async (req, res, next) => {
    try {
        // 1. Identidad Tokenizada (Stateless)
        const { clinicalId, emaEntryId, isSimulated } = req.emaPayload; 
        const { energy, tension, clarity, responseTimeMs } = req.body;

        const clinical = await CaretakerClinical.findById(clinicalId);
        if (!clinical) return res.status(404).json({ error: 'Bóveda Clínica inaccesible.' });

        const entry = await EmaEntry.findById(emaEntryId);
        if (!entry || entry.status !== 'pending') {
            return res.status(409).json({ error: 'Ventana ecológica inválida o expirada.' });
        }

        // 2. Cronometría ERP y Saneamiento de Latencias
        const tOpened = entry.openedAt ? entry.openedAt.getTime() : Date.now();
        const dispatchTime = entry.dispatchedAt ? entry.dispatchedAt.getTime() : tOpened;
        const attentionLatencyMs = Math.max(0, tOpened - dispatchTime); 

        entry.responseTimeMs = parseInt(responseTimeMs, 10);
        entry.completedAt = new Date();
        entry.status = 'completed';
        entry.metrics = { 
            energy: parseInt(energy, 10), 
            tension: parseInt(tension, 10), 
            clarity: parseInt(clarity, 10) 
        };
        entry.isSimulated = isSimulated;
        
        await entry.save(); // Activa isHighQuality

        // CORTAFUEGOS CIENTÍFICO: Si es simulación, salimos antes de alterar el estado clínico
        if (isSimulated) {
            return res.status(200).json({ 
                status: 'success', 
                blindAck: true, 
                simulated: true 
            });
        }

        // 3. Inferencia Bayesiana (Solo sujetos reales)
        const priorProb = Number(decrypt(clinical.lastBurnoutProbability));
        
        const prediction = await brainClient.getBurnoutPrediction({
            external_id: clinical.externalId,
            energy: entry.metrics.energy,
            tension: entry.metrics.tension,
            clarity: entry.metrics.clarity,
            latencies: {
                attention_ms: attentionLatencyMs,
                resolution_ms: entry.responseTimeMs,
                is_high_quality: entry.isHighQuality !== false
            },
            bayesian_state: {
                alpha: clinical.bayesianParams?.alpha || 1.0,
                beta: clinical.bayesianParams?.beta || 1.0,
                prior_probability: priorProb
            },
            context: {
                caregiver_age: clinical.age,
                burden_type: clinical.burdenType
            }
        });

        // 4. Mutación Alostática Longitudinal
        if (prediction && prediction.probability !== undefined) {
            clinical.bayesianParams = {
                alpha: prediction.alpha,
                beta: prediction.beta
            };
            clinical.lastBurnoutProbability = encrypt(prediction.probability.toString());
            clinical.streakCount += 1;
            clinical.lastInteractionAt = new Date();
            
            await clinical.save();
        }

        res.status(200).json({ status: 'success', blindAck: true });

    } catch (error) {
        console.error('[SARA-Gateway] Error en ingesta EMA:', error.message);
        res.status(500).json({ error: 'Fallo de integridad en la persistencia.' });
    }
};