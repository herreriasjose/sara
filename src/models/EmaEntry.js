// src/models/EmaEntry.js

const mongoose = require('mongoose');

const EmaEntrySchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaretakerClinical', required: true },
    metrics: { 
        energy: { type: Number, min: 1, max: 5, required: true },
        tension: { type: Number, min: 1, max: 3, required: true },
        clarity: { type: Number, min: 1, max: 3, required: true }
    },
    responseTimeMs: { type: Number },
    isHighQuality: { type: Boolean, default: true },
    isSimulated: { type: Boolean, default: false }
}, { timestamps: true });

EmaEntrySchema.pre('save', async function() {
    if (this.responseTimeMs < 2000 || this.responseTimeMs > 45000) {
        this.isHighQuality = false;
    }
});

module.exports = mongoose.model('EmaEntry', EmaEntrySchema);