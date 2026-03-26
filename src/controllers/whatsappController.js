// src/controllers/whatsappController.js
const authService = require('../services/authService');
const Patient = require('../models/Patient');

exports.sendDailyPrompt = async (patientExternalId) => {
    const patient = await Patient.findOne({ externalId: patientExternalId });
    if (!patient) return;

    const token = authService.generateEmaToken(patient._id);
    const magicLink = `https://sara.app/r/${token}`;

    // Aquí iría la llamada a la API de WhatsApp de Meta
    console.log(`[WhatsApp API] Enviando link a ${patient.externalId}: ${magicLink}`);
    
    // El mensaje diría algo como: 
    // "Hola, dedica 20 segundos a tu batería emocional: ${magicLink}"
};