// src\models\EmaEntry.js

const mongoose = require('mongoose');

const EmaEntrySchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  type: { 
    type: String, 
    enum: ['passive', 'active'], // Protocolo 90/10
    required: true 
  },
  // Datos Psicométricos (Solo si es 'active')
  metrics: {
    energy: { type: Number, min: 0, max: 10 },
    tension: { type: Number, min: 0, max: 10 },
    clarity: { type: Number, min: 0, max: 10 }
  },
  // Datos de Calidad
  responseTimeMs: { type: Number }, // Control "Regla de los 20s"
  isHighQuality: { type: Boolean, default: true },
  metadata: { type: Map, of: String } // Para acelerómetro o screen-time
}, { timestamps: true });

// Middleware para marcar datos de baja calidad (ej. respuesta < 1s o > 60s)
EmaEntrySchema.pre('save', function(next) {
  if (this.type === 'active' && (this.responseTimeMs < 1000 || this.responseTimeMs > 60000)) {
    this.isHighQuality = false;
  }
  next();
});

module.exports = mongoose.model('EmaEntry', EmaEntrySchema);