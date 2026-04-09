// src/models/Caretaker.js

const mongoose = require('mongoose');

const CaretakerSchema = new mongoose.Schema({
    externalId: { type: String, required: true, unique: true },
    phoneReal: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, sparse: true },
    postalCode: { type: String, required: true },
    
    age: { type: Number, required: true },
    gender: { type: String, enum: ['female', 'male', 'other'], required: true },
    relationship: { 
        type: String, 
        enum: ['spouse', 'child', 'sibling', 'other', 'professional'],
        required: true 
    },
    isProfessional: { type: Boolean, default: false },
    yearsCaregiving: { type: Number, required: true },

    patientAge: { type: Number, required: true },
    patientGender: { type: String, enum: ['female', 'male', 'other'], required: true },
    
    patientDisabilityGrade: { type: String, required: true }, 

    burdenType: { type: String, enum: ['physical', 'cognitive', 'mixed'], required: true },
    hasExternalSupport: { type: Boolean, required: true },
    
    caretakerDisabilityGrade: { type: String, required: true },
    consentAccepted: { type: Boolean, required: true, default: false },
    lastBurnoutProbability: { type: String, required: true }, 
    lastInteractionAt: { type: Date },
    streakCount: { type: Number, default: 0 },
    registeredTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Researcher' },
    isSubjectOfTest: { type: Boolean, required: true, default: false }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Caretaker', CaretakerSchema);