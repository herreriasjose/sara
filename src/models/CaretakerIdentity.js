// src/models/CaretakerIdentity.js

const mongoose = require('mongoose');

const CaretakerIdentitySchema = new mongoose.Schema({
    externalId: { type: String, required: true, unique: true },
    phoneReal: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, sparse: true },
    postalCode: { type: String, required: true },
    consentAccepted: { type: Boolean, required: true, default: false },
    registeredTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Researcher',
        index: true // Óptimo para acelerar las queries de filtrado de la cohorte
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('CaretakerIdentity', CaretakerIdentitySchema);