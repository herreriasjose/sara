// src/models/EmaEntry.js

const mongoose = require('mongoose');

const EmaEntrySchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaretakerClinical', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'expired'], 
        default: 'pending' 
    },
    metrics: { 
        energy: { type: Number, min: 1, max: 5 },
        tension: { type: Number, min: 1, max: 3 },
        clarity: { type: Number, min: 1, max: 3 }
    },
    dispatchedAt: { type: Date, default: Date.now },
    openedAt: { type: Date },
    completedAt: { type: Date },
    responseTimeMs: { type: Number },
    isHighQuality: { type: Boolean, default: true },
    isSimulated: { type: Boolean, default: false }
}, { timestamps: true });

EmaEntrySchema.pre('save', async function() {
    // Solo evaluar calidad si el registro está completado y tiene latencia calculada
    if (this.status === 'completed' && this.responseTimeMs) {
        if (this.responseTimeMs < 2000 || this.responseTimeMs > 45000) {
            this.isHighQuality = false;
        }
    }
});



module.exports = mongoose.model('EmaEntry', EmaEntrySchema);