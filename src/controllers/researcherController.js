// src/controllers/researcherController.js

const Researcher = require('../models/Researcher');
const { decrypt } = require('../services/encryptionService');

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