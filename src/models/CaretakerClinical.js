// src/models/CaretakerClinical.js

const mongoose = require('mongoose');

const caretakerClinicalSchema = new mongoose.Schema({
    externalId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    age: Number,
    gender: String,
    relationship: String,
    isProfessional: {
        type: Boolean,
        default: false
    },
    yearsCaregiving: Number,
    patientAge: Number,
    patientGender: String,
    burdenType: String,
    hasExternalSupport: {
        type: Boolean,
        default: false
    },
    patientDisabilityGrade: {
        type: String, // Cifrado AES-256
        required: true
    },
    caretakerDisabilityGrade: {
        type: String, // Cifrado AES-256
        required: true
    },
    lastBurnoutProbability: {
        type: String, // Cifrado AES-256
        required: true
    },
    streakCount: {
        type: Number,
        default: 0
    },
    morningAnchor: { 
        type: String, 
        required: true, 
        default: '08:30',
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    timezone: { 
        type: String, 
        default: 'Europe/Madrid' 
    },
    bayesianParams: {
        alpha: { type: Number, default: 1 }, 
        beta: { type: Number, default: 1 },  
        lastEnergyBaseline: { type: Number, default: null },
        alostaticSlope: { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('CaretakerClinical', caretakerClinicalSchema);