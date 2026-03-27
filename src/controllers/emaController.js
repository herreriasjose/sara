// src/controllers/emaController.js

const Patient = require('../models/Patient');
const EmaEntry = require('../models/EmaEntry');
const brainClient = require('../services/brainClient'); // <-- 1. Importamos el puente con Python

// 1. Registrar un nuevo participante (Power User)
exports.registerPatient = async (req, res) => {
    try {
        const { externalId, disabilityGrade, consentAccepted } = req.body;

        // Privacidad por Diseño: Sin consentimiento no hay registro
        if (!consentAccepted) {
            return res.status(400).json({ error: 'El consentimiento explícito es obligatorio (RGPD).' });
        }

        const newPatient = new Patient({
            externalId,
            disabilityGrade,
            consentAccepted,
            // Inicializamos la probabilidad a priori en 10% por defecto (puedes ajustarlo según literatura)
            lastBurnoutProbability: 0.1 
        });

        const savedPatient = await newPatient.save();
        res.status(201).json({ message: 'Paciente registrado con éxito', patient: savedPatient });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'El paciente ya está registrado.' });
        }
        console.error('Error en registerPatient:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 2. Recibir Evaluación EMA y Calcular Riesgo
exports.submitEma = async (req, res) => {
    try {
        const { externalId, energy, tension, clarity, responseTimeMs } = req.body;

        // 1. Identificación ultrarrápida (Índice en MongoDB)
        const patient = await Patient.findOne({ externalId });
        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        const metrics = { energy, tension, clarity };

        // 2. Guardamos la entrada EMA (El middleware pre-save validará isHighQuality)
        const entry = new EmaEntry({
            patientId: patient._id,
            metrics,
            responseTimeMs
        });
        await entry.save();

        // 3. INFERENCIA BAYESIANA (Llamada al microservicio de Python)
        // Pasamos las métricas actuales y la memoria del paciente P(H)
        const prediction = await brainClient.getBurnoutPrediction(metrics, patient.lastBurnoutProbability);

        // 4. Actualizamos el estado del paciente (Gamificación + Riesgo)
        patient.streakCount += 1;
        patient.lastInteractionAt = new Date();
        
        // Si Python responde correctamente, actualizamos la caché de riesgo
        if (prediction && prediction.burnout_probability !== undefined) {
            patient.lastBurnoutProbability = prediction.burnout_probability;
        }
        await patient.save();

        // 5. Evaluamos si es necesaria una Intervención JITAI (Contingencia)
        // Umbral crítico arbitrario para el MVP: 80% de probabilidad de claudicación
        const requiresIntervention = patient.lastBurnoutProbability >= 0.8;

        // 6. Feedback al cliente/WhatsApp
        res.status(201).json({ 
            message: 'Evaluación registrada correctamente',
            streak: patient.streakCount,
            isHighQuality: entry.isHighQuality,
            currentBurnoutRisk: patient.lastBurnoutProbability,
            requiresIntervention
        });

    } catch (error) {
        console.error('Error crítico en submitEma:', error);
        res.status(500).json({ error: 'Error al procesar la evaluación' });
    }
};