// src/routes/api.js

const express = require('express');
const router = express.Router();
const Researcher = require('../models/Researcher');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const { encrypt } = require('../services/encryptionService');
const { generateBlindIndex, hashPassword } = require('../services/authService');
const auditLogger = require('../services/auditLogger');
const emaController = require('../controllers/emaController');

router.get('/ping', (req, res) => res.status(200).json({ status: 'ok' }));

router.post('/caretakers', emaController.registerCaretaker);
router.get('/caretakers', emaController.getAllCaretakers);
router.delete('/caretakers/:externalId', emaController.deleteCaretaker);

router.post('/ema', emaController.submitEma);


router.post('/researchers/register/:tokenId', async (req, res) => {
    const { tokenId } = req.params;
    const { firstName, lastName, alias, email, mobile, password } = req.body;

    try {
        const tokenRecord = await InvitationResearcherToken.findOne({ token: tokenId });
        if (!tokenRecord) return res.status(403).json({ error: 'Token inválido o expirado' });

        const newResearcher = new Researcher({
            firstName: encrypt(firstName),
            lastName: encrypt(lastName),
            alias: alias,
            emailBlindIndex: generateBlindIndex(email),
            emailEncrypted: encrypt(email),
            mobile: encrypt(mobile),
            passwordHash: hashPassword(password),
            role: tokenRecord.role
        });

        await newResearcher.save();
        
        // Destrucción atómica
        await InvitationResearcherToken.deleteOne({ _id: tokenRecord._id });
        
        auditLogger.logAccess('RESEARCHER_VAULT_CREATED', newResearcher._id, 'Admin_API');

        res.status(201).json({ status: 'success' });
    // Reemplaza el bloque catch actual en router.post('/researchers/register/:tokenId', ...)

    } catch (error) {
        if (error.code === 11000) {
            // Laconismo Técnico: Exposición directa del índice en colisión para auditoría.
            console.error('\n[SARA-Vault] Colisión de Índice detectada (Error 11000):');
            console.error(JSON.stringify(error.keyValue, null, 2));
            
            return res.status(400).json({ error: 'El investigador ya existe en la Bóveda.' });
        }
        
        console.error('[SARA-Vault] Fallo de instanciación:', error);
        res.status(500).json({ error: 'Fallo en la instanciación de la Bóveda' });
    }
});

module.exports = router;

module.exports = router;