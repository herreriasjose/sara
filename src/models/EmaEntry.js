// src\models\EmaEntry.js

const mongoose = require('mongoose');

const EmaEntrySchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  
  // Datos Psicométricos (Alineados con McEwen y ERP)
  metrics: {
    energy: { type: Number, min: 1, max: 5, required: true },   // Batería (1-5)
    tension: { type: Number, min: 1, max: 3, required: true },  // Agobio (1-3)
    clarity: { type: Number, min: 1, max: 3, required: true }   // Mente (1-3)
  },
  
  // Control de calidad y fatiga cognitiva
  responseTimeMs: { type: Number }, 
  isHighQuality: { type: Boolean, default: true }
}, { timestamps: true });

// Middleware ajustado: < 2s es "click" impulsivo, > 45s es distracción
EmaEntrySchema.pre('save', async function() {
  if (this.responseTimeMs < 2000 || this.responseTimeMs > 45000) {
    this.isHighQuality = false;
  }
});

module.exports = mongoose.model('EmaEntry', EmaEntrySchema);