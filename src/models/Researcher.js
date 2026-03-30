// src\models\Researcher.js

const mongoose = require('mongoose');

const researcherSchema = new mongoose.Schema({
    firstName: { type: String, required: true }, 
    lastName: { type: String, required: true }, 
    alias: { type: String, required: true }, 
    emailBlindIndex: { type: String, required: true, unique: true }, 
    emailEncrypted: { type: String, required: true }, 
    mobile: { type: String, required: true }, 
    passwordHash: { type: String, required: true }, 
    role: { type: String, enum: ['researcher', 'admin'], default: 'researcher' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Researcher', researcherSchema);