// src\models\Patient.js


const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  externalId: { type: String, required: true, unique: true }, // ID anónimo para TFM
  disabilityGrade: { type: Number, min: 0, max: 100 }, 
  isQuotaParticipant: { type: Boolean, default: false }, // Gestión de cuota de reserva
  consentAccepted: { type: Boolean, required: true, default: false },
  consentDate: { type: Date },
  streakCount: { type: Number, default: 0 }, // Para el motor "Estilo Duolingo"
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);