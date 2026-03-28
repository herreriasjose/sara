// src\models\Caretaker.js

const mongoose = require('mongoose');

const CaretakerSchema = new mongoose.Schema({
    externalId: { type: String, required: true, unique: true },
    phoneReal: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, sparse: true },
    postalCode: { type: String, required: true },
    
    // Perfil del Cuidador (Díada - Parte 1)
    age: { type: Number, required: true },
    gender: { type: String, enum: ['female', 'male', 'other'], required: true },
    relationship: { 
        type: String, 
        enum: ['spouse', 'child', 'sibling', 'other', 'professional'],
        required: true 
    },
    isProfessional: { type: Boolean, default: false },
    yearsCaregiving: { type: Number, required: true },

    // Perfil del Paciente (Díada - Parte 2)
    patientAge: { type: Number, required: true },
    patientGender: { type: String, enum: ['female', 'male', 'other'], required: true },
    patientDisabilityGrade: { type: Number, min: 0, max: 100, required: true }, 

    // Moduladores ERP
    burdenType: { type: String, enum: ['physical', 'cognitive', 'mixed'], required: true },
    hasExternalSupport: { type: Boolean, required: true },
    
    caretakerDisabilityGrade: { type: Number, min: 0, max: 100, default: 0 },
    consentAccepted: { type: Boolean, required: true, default: false },
    lastBurnoutProbability: { type: Number, default: 0.1 }, 
    lastInteractionAt: { type: Date },
    streakCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Caretaker', CaretakerSchema);