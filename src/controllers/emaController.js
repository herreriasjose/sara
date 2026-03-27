// src/controllers/emaController.js
const Caretaker = require('../models/Caretaker');
const EmaEntry = require('../models/EmaEntry');
const brainClient = require('../services/brainClient');

/**
 * 1. Registro de Cuidador (Personal o Administrativo)
 * Soporta JSON (API) y URL-Encoded (Formularios EJS)
 */
exports.registerCaretaker = async (req, res) => {
    try {
        const { 
            externalId, name, email, phoneAlt, postalCode, 
            age, relationship, yearsCaregiving, 
            patientDisabilityGrade,
            caretakerDisabilityGrade, consentAccepted 
        } = req.body;

        // Validación de Blindaje Ético (Capa 2)
        if (consentAccepted !== "true" && consentAccepted !== true) {
            return res.status(400).json({ error: 'El consentimiento RGPD es obligatorio.' });
        }

        const newCaretaker = new Caretaker({
            externalId,
            name,
            email,
            phoneAlt,
            postalCode,
            age,
            relationship,
            yearsCaregiving,
            patientDisabilityGrade: patientDisabilityGrade || 0,
            caretakerDisabilityGrade: caretakerDisabilityGrade || 0,
            consentAccepted: true,
            lastBurnoutProbability: 0.1 // P(H) inicial
        });

        await newCaretaker.save();
        console.log(`[SARA] Nuevo cuidador registrado: ${name} (${externalId})`);

        // Respuesta adaptativa según el origen de la petición
        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            return res.render('pages/index', { 
                title: 'SARA - Dashboard',
                message: 'Registro completado con éxito. Ya puede iniciar el seguimiento.' 
            });
        }

        res.status(201).json({ message: 'Caretaker registrado con éxito', caretaker: newCaretaker });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'El ID de WhatsApp ya se encuentra en el sistema.' });
        }
        console.error('Error crítico en registerCaretaker:', error.message);
        res.status(500).json({ error: 'Error interno al procesar el alta.' });
    }
};

/**
 * 2. Procesamiento EMA (Captura de métricas y JITAI)
 */
exports.submitEma = async (req, res) => {
    try {
        const { externalId, energy, tension, clarity, responseTimeMs } = req.body;

        // 1. Identificación del cuidador
        const caretaker = await Caretaker.findOne({ externalId });
        if (!caretaker) {
            return res.status(404).json({ error: 'Cuidador no identificado.' });
        }

        const metrics = { energy, tension, clarity };

        // 2. Persistencia de la evidencia (E)
        const entry = new EmaEntry({
            patientId: caretaker._id, // Relación con el modelo Caretaker
            metrics,
            responseTimeMs
        });
        await entry.save();

        // 3. INFERENCIA BAYESIANA (Llamada al Brain de Python)
        // Pasamos métricas actuales y P(H) previa almacenada
        const prediction = await brainClient.getBurnoutPrediction(metrics, caretaker.lastBurnoutProbability);

        // 4. Actualización del estado dinámico del cuidador
        caretaker.streakCount += 1;
        caretaker.lastInteractionAt = new Date();
        
        if (prediction && prediction.burnout_probability !== undefined) {
            caretaker.lastBurnoutProbability = prediction.burnout_probability;
        }
        
        await caretaker.save();

        // 5. Flag de intervención JITAI (Umbral > 80%)
        const requiresIntervention = caretaker.lastBurnoutProbability >= 0.8;

        res.status(201).json({ 
            message: 'Evaluación registrada',
            streak: caretaker.streakCount,
            isHighQuality: entry.isHighQuality,
            burnoutRisk: caretaker.lastBurnoutProbability,
            requiresIntervention
        });

    } catch (error) {
        console.error('Error crítico en submitEma:', error.message);
        res.status(500).json({ error: 'Error al procesar la evaluación EMA.' });
    }
};