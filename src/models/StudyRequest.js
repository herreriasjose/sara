// src/models/StudyRequest.js

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../services/encryptionService');

const StudyRequestSchema = new mongoose.Schema({
    alias: { type: String, required: true },
    prefix: { type: String, required: true, default: '+34' },
    phone: { type: String, required: true },
    email: { type: String },
    descripcion: { type: String, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected', 'sent'], default: 'pending' },
    priorSeverityWeight: { type: Number, default: 0.5 }
}, { timestamps: true });

StudyRequestSchema.pre('save', function() {
    if (this.isModified('alias')) this.alias = encrypt(this.alias);
    if (this.isModified('phone')) this.phone = encrypt(this.phone);
    if (this.isModified('email') && this.email) this.email = encrypt(this.email);
    if (this.isModified('descripcion') && this.descripcion) this.descripcion = encrypt(this.descripcion);
});

const decryptDocument = (doc) => {
    if (!doc) return;
    if (doc.alias) doc.alias = decrypt(doc.alias);
    if (doc.phone) doc.phone = decrypt(doc.phone);
    if (doc.email) doc.email = decrypt(doc.email);
    if (doc.descripcion) doc.descripcion = decrypt(doc.descripcion);
};

StudyRequestSchema.post(['find', 'findOne', 'findOneAndUpdate'], function(result) {
    if (Array.isArray(result)) {
        result.forEach(decryptDocument);
    } else {
        decryptDocument(result);
    }
});

module.exports = mongoose.model('StudyRequest', StudyRequestSchema);