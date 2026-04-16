// src/controllers/emaController.js

const EmaEntry = require('../models/EmaEntry');
const CaretakerClinical = require('../models/CaretakerClinical');
const brainClient = require('../services/brainClient');
const { encrypt, decrypt } = require('../services/encryptionService');

/**
 * Orquestador de Ingesta EMA (On-Dispatch)
 * Gestiona la captura ecológica, el cálculo de latencias y la inferencia bayesiana.
 */
exports.submitEma = async (req, res, next) => {
    try {
        // 1. Identidad Tokenizada y Payload (Stateless)
        const { clinicalId, emaEntryId, isSimulated } = req.emaPayload; 
        const { energy, tension, clarity, responseTimeMs, simulatedAttentionMins } = req.body;

        const clinical = await CaretakerClinical.findById(clinicalId);
        if (!clinical) return res.status(404).json({ error: 'Bóveda Clínica inaccesible.' });

        const entry = await EmaEntry.findById(emaEntryId);
        if (!entry || entry.status !== 'pending') {
            return res.status(409).json({ error: 'Ventana ecológica inválida o expirada.' });
        }

        // 2. Cronometría ERP y Saneamiento de Latencias
        // Se calcula el tiempo de apertura real registrado por el middleware de rutas
        const tOpened = entry.openedAt ? entry.openedAt.getTime() : Date.now();
        const dispatchTime = entry.dispatchedAt ? entry.dispatchedAt.getTime() : tOpened;
        
        // Latencia de Atención (LA): Tiempo entre el despacho y la apertura real
        let attentionLatencyMs = Math.max(0, tOpened - dispatchTime); 

        // INYECCIÓN DE SIMULACIÓN: Si el usuario define una latencia manual en el formulario
        if (isSimulated && simulatedAttentionMins !== null && simulatedAttentionMins !== undefined) {
            // Convertimos los minutos del simulador a milisegundos para el motor SARA-Brain
            attentionLatencyMs = parseInt(simulatedAttentionMins, 10) * 60000;
        }

        // 3. Cierre del Registro EMA
        entry.responseTimeMs = parseInt(responseTimeMs, 10); // Latencia de Resolución (LR)
        entry.completedAt = new Date();
        entry.status = 'completed';
        entry.metrics = { 
            energy: parseInt(energy, 10), 
            tension: parseInt(tension, 10), 
            clarity: parseInt(clarity, 10) 
        };
        entry.isSimulated = isSimulated;
        
        // El pre-save de EmaEntry determinará isHighQuality (Filtro de Ruido > 2s)
        await entry.save(); 

        // 4. Inferencia Bayesiana (V4 - Distribución Beta)
        // Recuperamos la probabilidad previa descifrando el campo de la Bóveda Clínica
        const priorProb = Number(decrypt(clinical.lastBurnoutProbability));
        
        const prediction = await brainClient.getBurnoutPrediction({
            external_id: clinical.externalId,
            energy: entry.metrics.energy,
            tension: entry.metrics.tension,
            clarity: entry.metrics.clarity,
            latencies: {
                attention_ms: attentionLatencyMs, // Biomarcador Sombra (Penalización si > 10min)
                resolution_ms: entry.responseTimeMs,
                is_high_quality: entry.isHighQuality !== false // Bypass si es ruido
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

        // 5. Mutación Alostática Longitudinal (Solo si NO es simulación o según política de test)
        // CORTAFUEGOS: Las simulaciones pueden leer la predicción pero no deben corromper el Prior real de la cohorte
        if (!isSimulated && prediction && prediction.probability !== undefined) {
            clinical.bayesianParams = {
                alpha: prediction.alpha,
                beta: prediction.beta
            };
            // Ciframos la nueva probabilidad antes de persistirla (Privacidad por Diseño)
            clinical.lastBurnoutProbability = encrypt(prediction.probability.toString());
            clinical.streakCount += 1;
            clinical.lastInteractionAt = new Date();
            
            await clinical.save();
        }

        // 6. Respuesta Stateless
        res.status(200).json({ 
            status: 'success', 
            blindAck: true,
            simulated: isSimulated,
            prediction: isSimulated ? prediction : undefined // Mostramos la predicción solo en modo test
        });

    } catch (error) {
        console.error('[SARA-Gateway] Error en ingesta EMA:', error.message);
        res.status(500).json({ error: 'Fallo de integridad en la persistencia o motor Brain.' });
    }
};