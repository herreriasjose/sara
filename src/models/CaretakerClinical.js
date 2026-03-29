// src/models/CaretakerClinical.js

const mongoose = require('mongoose');

const CaretakerClinicalSchema = new mongoose.Schema({
    externalId: { type: String, required: true, unique: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['female', 'male', 'other'], required: true },
    relationship: { type: String, required: true },
    isProfessional: { type: Boolean, default: false },
    yearsCaregiving: { type: Number, required: true },
    patientAge: { type: Number, required: true },
    patientGender: { type: String, enum: ['female', 'male', 'other'], required: true },
    patientDisabilityGrade: { type: String, required: true }, 
    burdenType: { type: String, enum: ['physical', 'cognitive', 'mixed'], required: true },
    hasExternalSupport: { type: Boolean, required: true },
    caretakerDisabilityGrade: { type: String, required: true },
    lastBurnoutProbability: { type: String, required: true }, 
    lastInteractionAt: { type: Date },
    streakCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('CaretakerClinical', CaretakerClinicalSchema);
