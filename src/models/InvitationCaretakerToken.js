// src\models\InvitationCaretakerToken.js

const mongoose = require('mongoose');
const crypto = require('crypto');

// Tiempo de expiración configurable desde .env (por defecto 86400 segundos = 1 día)
const TTL_SECONDS = parseInt(process.env.INVITATION_TTL) || 86400;

const invitationCaretakerTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(16).toString('hex')
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: TTL_SECONDS // Índice TTL nativo de MongoDB
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Researcher',
        default: null // null implica Admin
}
});

module.exports = mongoose.model('InvitationCaretakerToken', invitationCaretakerTokenSchema);