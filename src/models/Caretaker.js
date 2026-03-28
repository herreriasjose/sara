// src/models/Caretaker.js
const mongoose = require('mongoose');

const CaretakerSchema = new mongoose.Schema({
    externalId: { type: String, required: true, unique: true }, // WhatsApp ID
    name: { type: String, required: true },
    email: { type: String, sparse: true }, // sparse permite que sea opcional pero indexado
    phoneAlt: { type: String },
    postalCode: { type: String },
    phoneReal: { type: String, required: true, unique: true }, // Teléfono real para la API de WhatsApp
    // Perfil del Cuidador (Variables Moderadoras para el TFM)
    age: { type: Number },
    relationship: { type: String, enum: ['spouse', 'child', 'sibling', 'other', 'professional'] },
    yearsCaregiving: { type: Number },

    // El Estresor (La carga del TFM)
    patientDisabilityGrade: { type: Number, min: 0, max: 100, default: 0 }, 
    
    // El Modulador (Tu perfil específico)
    caretakerDisabilityGrade: { type: Number, min: 0, max: 100, default: 0 },
    consentAccepted: { type: Boolean, required: true, default: false },
    
    // Motor Bayesiano y JITAI
    lastBurnoutProbability: { type: Number, default: 0.1 }, 
    lastInteractionAt: { type: Date },
    streakCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Caretaker', CaretakerSchema);