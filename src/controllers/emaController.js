// src\controllers\emaController.js


const Patient = require('../models/Patient');
const EmaEntry = require('../models/EmaEntry');

// 1. Registrar un nuevo participante (Power User)
exports.registerPatient = async (req, res) => {
    try {
        const { externalId, disabilityGrade, isQuotaParticipant, consentAccepted } = req.body;

        // Validamos que haya aceptado el consentimiento
        if (!consentAccepted) {
            return res.status(400).json({ error: 'El consentimiento explícito es obligatorio.' });
        }

        const newPatient = new Patient({
            externalId,
            disabilityGrade,
            isQuotaParticipant,
            consentAccepted,
            consentDate: new Date()
        });

        const savedPatient = await newPatient.save();
        res.status(201).json({ message: 'Paciente registrado con éxito', patient: savedPatient });
    } catch (error) {
        // Manejo de error si el externalId ya existe
        if (error.code === 11000) {
            return res.status(409).json({ error: 'El paciente ya está registrado.' });
        }
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
};

// 2. Recibir Evaluación EMA (Validación Activa de 20s)
exports.submitEma = async (req, res) => {
    try {
        const { externalId, energy, tension, clarity, responseTimeMs } = req.body;

        // 1. Buscamos al paciente por su ID externo (ej. su número de WhatsApp hasheado)
        const patient = await Patient.findOne({ externalId });
        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        // 2. Guardamos la entrada EMA
        const entry = new EmaEntry({
            patientId: patient._id,
            type: 'active',
            metrics: { energy, tension, clarity },
            responseTimeMs
        });
        await entry.save();

        // 3. Incrementamos la Racha (Gamificación Duolingo)
        patient.streakCount += 1;
        await patient.save();

        // 4. Devolvemos el feedback inmediato
        res.status(201).json({ 
            message: 'Evaluación registrada correctamente',
            streak: patient.streakCount,
            isHighQuality: entry.isHighQuality 
        });

    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la evaluación', details: error.message });
    }
};