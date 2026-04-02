
// src/controllers/authController.js

const crypto = require('crypto');
const StudyRequest = require('../models/StudyRequest');
const CaretakerIdentity = require('../models/CaretakerIdentity');
const CaretakerClinical = require('../models/CaretakerClinical');
const Researcher = require('../models/Researcher');
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const { encrypt, decrypt } = require('../services/encryptionService');
const auditLogger = require('../services/auditLogger');
const { generateBlindIndex, hashPassword, verifyPassword, generateSessionToken, setCookieSession, clearCookieSession } = require('../services/authService');

function generateInternalId(phoneNumber) {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const hash = crypto.createHash('sha256').update(normalizedPhone).digest('hex');
    return `SARA-${hash.substring(0, 12).toUpperCase()}`;
}

exports.submitStudyRequest = async (req, res) => {
    try {
        const { alias, phone, email, descripcion } = req.body;
        
        await StudyRequest.create({
            alias: alias.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : undefined,
            descripcion: descripcion ? descripcion.trim() : undefined
        });

        auditLogger.logAccess('STUDY_REQUEST_RECEIVED', 'PUBLIC_ENDPOINT', 'System');
        res.redirect('/?status=solicitud_recibida');
    } catch (error) {
        console.error('[SARA-Gateway] Error en ingesta de solicitud:', error.message);
        res.redirect('/?status=error_solicitud');
    }
};

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

exports.loginResearcher = async (req, res) => {
try {
const { email, password } = req.body;

    const emailBlindIndex = generateBlindIndex(email);
    const researcher = await Researcher.findOne({ emailBlindIndex });

    if (!researcher || !verifyPassword(password, researcher.passwordHash)) {
        auditLogger.logAccess('RESEARCHER_LOGIN_FAILED', emailBlindIndex, 'Unknown');
        return res.status(401).json({ error: 'Credenciales inválidas o acceso denegado.' });
    }

    const token = generateSessionToken(researcher._id, researcher.role);
    setCookieSession(res, token);
    
    auditLogger.logAccess('RESEARCHER_LOGIN_SUCCESS', researcher._id, researcher.role);

    if (req.accepts('html')) return res.redirect('/admin');
    res.status(200).json({ status: 'success', role: researcher.role });
} catch (error) {
    res.status(500).json({ error: 'Fallo en la resolución de la Bóveda.' });
}
};

exports.logoutResearcher = (req, res) => {
    clearCookieSession(res);
    res.redirect('/login');
};