// src\models\Patient.js


const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  externalId: { type: String, required: true, unique: true }, // Hash anónimo
  disabilityGrade: { type: Number, min: 0, max: 100 }, 
  consentAccepted: { type: Boolean, required: true, default: false },
  streakCount: { type: Number, default: 0 },
  
  // Cache de estado para JITAI rápido en Node.js
  lastBurnoutProbability: { type: Number, default: 0 }, 
  lastInteractionAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);