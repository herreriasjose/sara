
// src/controllers/authController.js

const crypto = require('crypto');
const CaretakerIdentity = require('../models/CaretakerIdentity');
const CaretakerClinical = require('../models/CaretakerClinical');
const Researcher = require('../models/Researcher');
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const { encrypt, decrypt } = require('../services/encryptionService');
const { generateBlindIndex, hashPassword } = require('../services/authService');
const auditLogger = require('../services/auditLogger');

function generateInternalId(phoneNumber) {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const hash = crypto.createHash('sha256').update(normalizedPhone).digest('hex');
    return `SARA-${hash.substring(0, 12).toUpperCase()}`;
}

exports.registerCaretaker = async (req, res) => {
    try {
        const { phoneNumber, name, email, postalCode, patientDisabilityGrade, caretakerDisabilityGrade, relationship, hasExternalSupport, age, gender, yearsCaregiving, patientAge, patientGender, burdenType, consentAccepted, tokenId } = req.body;

        const externalId = generateInternalId(phoneNumber);

        const identityData = {
            externalId,
            phoneReal: encrypt(phoneNumber),
            name: encrypt(name),
            email: email ? encrypt(email) : undefined,
            postalCode: encrypt(postalCode),
            consentAccepted: consentAccepted === 'true' || consentAccepted === true
        };

        const clinicalData = {
            externalId,
            age,
            gender,
            relationship,
            isProfessional: relationship === 'professional',
            yearsCaregiving,
            patientAge,
            patientGender,
            burdenType,
            hasExternalSupport: hasExternalSupport === 'true' || hasExternalSupport === true,
            patientDisabilityGrade: encrypt(Number(patientDisabilityGrade || 0)),
            caretakerDisabilityGrade: encrypt(Number(caretakerDisabilityGrade || 0)),
            lastBurnoutProbability: encrypt(0.1)
        };

        await CaretakerIdentity.create(identityData);
        await CaretakerClinical.create(clinicalData);
        
        if (tokenId) {
            await InvitationCaretakerToken.deleteOne({ token: tokenId });
            auditLogger.logAccess('TOKEN_CONSUMED', externalId, 'User_Registration');
        }

        auditLogger.logAccess('CREATE_VAULT', externalId, 'User_Registration');

        if (req.accepts('html')) return res.redirect('/?status=registered');
        res.status(201).json({ status: 'success', data: { id: externalId } });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

exports.registerResearcher = async (req, res) => {
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
        await InvitationResearcherToken.deleteOne({ _id: tokenRecord._id });
        auditLogger.logAccess('RESEARCHER_VAULT_CREATED', newResearcher._id, 'Admin_API');

        res.status(201).json({ status: 'success' });
    } catch (error) {
        if (error.code === 11000) {
            console.error('\n[SARA-Vault] Colisión de Índice detectada (Error 11000):');
            console.error(JSON.stringify(error.keyValue, null, 2));
            return res.status(400).json({ error: 'El investigador ya existe en la Bóveda.' });
        }
        console.error('[SARA-Vault] Fallo de instanciación:', error);
        res.status(500).json({ error: 'Fallo en la instanciación de la Bóveda' });
    }
};

exports.getAllCaretakers = async (req, res) => {
    try {
        auditLogger.logAccess('DECRYPT_BULK_READ', 'ALL_USERS', req.user ? req.user.role : 'Admin_API');

        const identities = await CaretakerIdentity.find({});
        const clinicals = await CaretakerClinical.find({});

        const decryptedList = identities.map(identity => {
            const clinical = clinicals.find(c => c.externalId === identity.externalId);
            return {
                externalId: identity.externalId,
                name: decrypt(identity.name),
                phoneReal: decrypt(identity.phoneReal),
                email: identity.email ? decrypt(identity.email) : null,
                postalCode: decrypt(identity.postalCode),
                burnoutProbability: clinical ? Number(decrypt(clinical.lastBurnoutProbability)) : null,
                streak: clinical ? clinical.streakCount : 0
            };
        });

        res.status(200).json({ status: 'success', count: decryptedList.length, data: decryptedList });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.deleteCaretaker = async (req, res) => {
    try {
        const { externalId } = req.params;
        
        await CaretakerIdentity.deleteOne({ externalId });
        
        await CaretakerClinical.updateOne(
            { externalId }, 
            { $set: { externalId: `ANON-${crypto.randomBytes(8).toString('hex')}` } }
        );

        auditLogger.logAccess('IRREVERSIBLE_ANONYMIZATION', externalId, req.user ? req.user.role : 'Admin_API');

        res.status(200).json({ status: 'success', message: 'Derecho al olvido ejecutado. Trayectoria clínica anonimizada.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};