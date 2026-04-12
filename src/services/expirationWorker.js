// src/services/expirationWorker.js

const EmaEntry = require('../models/EmaEntry');
const CaretakerClinical = require('../models/CaretakerClinical');
const brainClient = require('./brainClient');
const { encrypt, decrypt } = require('./encryptionService');

const EXPIRATION_TIME_MS = 2 * 60 * 60 * 1000; // 2 horas
const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos

const sweepExpiredEntries = async () => {
    try {
        const thresholdDate = new Date(Date.now() - EXPIRATION_TIME_MS);
        
        const expiredEntries = await EmaEntry.find({
            status: 'pending',
            dispatchedAt: { $lt: thresholdDate }
        });

        if (expiredEntries.length === 0) return;

        console.log(`[SARA-Worker] Detectadas ${expiredEntries.length} omisiones (ERP). Iniciando actualización Bayesiana.`);

        for (const entry of expiredEntries) {
            // 1. Clausura del estado de telemetría
            entry.status = 'expired';
            await entry.save();

            const clinical = await CaretakerClinical.findById(entry.patientId);
            if (!clinical) continue;

            const priorProb = Number(decrypt(clinical.lastBurnoutProbability));
            let posteriorProb = priorProb;

            // 2. Inyección de Biomarcador de Colapso (Máxima Penalización)
            try {
                const prediction = await brainClient.getBurnoutPrediction({
                    metrics: { energy: 1, tension: 3, clarity: 1 },
                    priorProbability: priorProb,
                    context: {
                        caregiver: { age: clinical.age, gender: clinical.gender },
                        patient: { age: clinical.patientAge, gender: clinical.patientGender },
                        dynamics: { years: clinical.yearsCaregiving, burden: clinical.burdenType, support: clinical.hasExternalSupport }
                    }
                });
                posteriorProb = prediction?.posteriorProbability ?? prediction?.probability ?? priorProb;
            } catch (err) {
                console.error('[SARA-Worker] Fallo Motor Inferencia:', err.message);
            }

            // 3. Destrucción de la racha y actualización de probabilidad
            await CaretakerClinical.findByIdAndUpdate(clinical._id, {
                streakCount: 0, 
                lastBurnoutProbability: encrypt(posteriorProb)
            });
        }
    } catch (error) {
        console.error('[SARA-Worker] Error crítico en sweep de expiración:', error);
    }
};

const startWorker = () => {
    setInterval(sweepExpiredEntries, SWEEP_INTERVAL_MS);
    console.log(`[SARA-Worker] Vigilancia alostática iniciada (Intervalo: ${SWEEP_INTERVAL_MS / 60000}m).`);
};

module.exports = { startWorker, sweepExpiredEntries };