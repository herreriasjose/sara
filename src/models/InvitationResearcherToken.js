// src\models\InvitationResearcherToken.js

const mongoose = require('mongoose');
const crypto = require('crypto');

const TTL_SECONDS = parseInt(process.env.INVITATION_TTL) || 86400;

const invitationResearcherTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(24).toString('hex') 
    },
    role: {
        type: String,
        enum: ['researcher', 'admin'],
        default: 'researcher'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: TTL_SECONDS 
    }
});

module.exports = mongoose.model('InvitationResearcherToken', invitationResearcherTokenSchema);