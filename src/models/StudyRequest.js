// src\models\StudyRequest.js

const mongoose = require('mongoose');

const StudyRequestSchema = new mongoose.Schema({
    alias: { type: String, required: true },
    prefix: { type: String, required: true, default: '+34' },
    phone: { type: String, required: true },
    email: { type: String },
    descripcion: { type: String, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending' },
    priorSeverityWeight: { type: Number, default: 0.5 }
}, { timestamps: true });

module.exports = mongoose.model('StudyRequest', StudyRequestSchema);