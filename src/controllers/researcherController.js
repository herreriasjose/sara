// src/controllers/researcherController.js

const Researcher = require('../models/Researcher');
const { decrypt } = require('../services/encryptionService');
const Caretaker = require('../models/Caretaker');
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');

exports.generateCaretakerInvitation = async (req, res) => {
    try {
        const newToken = await InvitationCaretakerToken.create({});
        const url = `${req.protocol}://${req.get('host')}/register/${newToken.token}`;
        return res.status(201).json({ url, token: newToken.token });
    } catch (error) {
        console.error('[SARA-API] Error generando invitación agnóstica:', error);
        return res.status(500).json({ error: 'Fallo al procesar la invitación.' });
    }
};

exports.getAllResearchers = async (req, res) => {
    try {
        const researchers = await Researcher.find({}).lean();
        
        const vaultDump = researchers.map(doc => {
            try {
                return {
                    id: doc._id,
                    alias: doc.alias,
                    name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim(),
                    email: doc.emailEncrypted ? decrypt(doc.emailEncrypted) : null,
                    mobile: doc.mobile ? decrypt(doc.mobile) : null,
                    role: doc.role,
                    createdAt: doc.createdAt,
                    lastAccessAt: doc.lastAccessAt
                };
            } catch (cryptoError) {
                return {
                    id: doc._id,
                    alias: doc.alias,
                    error: 'Fallo de integridad en descifrado AES-256-GCM'
                };
            }
        });

        return res.status(200).json({ 
            status: 'success', 
            count: vaultDump.length,
            data: vaultDump 
        });

    } catch (error) {
        console.error('[Vault] Error al recuperar bóveda de investigadores:', error.message);
        return res.status(500).json({ error: 'Colapso en la recuperación de identidades.' });
    }
};

exports.assignCaretakerToResearcher = async (req, res) => {
    try {
        const { caretakerId, researcherId } = req.body;
        
        // El valor "" o undefined se normaliza a null para limpiar la asignación
        const updateValue = researcherId || null;

        const updatedCaretaker = await Caretaker.findByIdAndUpdate(
            caretakerId,
            { researcher: updateValue },
            { new: true }
        );

        if (!updatedCaretaker) return res.status(404).json({ error: 'Cuidador no hallado.' });

        return res.status(200).json({ 
            status: 'success', 
            message: 'Agrupación actualizada correctamente.' 
        });
    } catch (error) {
        return res.status(500).json({ error: 'Fallo en la reasignación de cohorte.' });
    }
};