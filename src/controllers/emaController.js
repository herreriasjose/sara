// src\controllers\emaController.js

const CaretakerIdentity = require('../models/CaretakerIdentity');
const CaretakerClinical = require('../models/CaretakerClinical');
const EmaEntry = require('../models/EmaEntry');
const crypto = require('crypto');
const brainClient = require('../services/brainClient');
const authService = require('../services/authService');
const { encrypt, decrypt } = require('../services/encryptionService');
const auditLogger = require('../services/auditLogger');
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');

function generateInternalId(phoneNumber) {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const hash = crypto.createHash('sha256').update(normalizedPhone).digest('hex');
    return `SARA-${hash.substring(0, 12).toUpperCase()}`;
}

exports.registerCaretaker = async (req, res) => {
    try {
        // 1. Añade tokenId aquí al final
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
        
        // 2. Lógica de consumo del token
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

exports.submitEma = async (req, res) => {
    try {
        const internalId = req.user ? req.user.externalId : req.body.externalId; 
        const { energy, tension, clarity, responseTimeMs } = req.body;

        const clinicalProfile = await CaretakerClinical.findOne({ externalId: internalId });
        if (!clinicalProfile) return res.status(404).json({ error: 'Contexto clínico no encontrado.' });

        const newEma = new EmaEntry({
            patientId: clinicalProfile._id,
            metrics: { energy: parseInt(energy), tension: parseInt(tension), clarity: parseInt(clarity) },
            responseTimeMs: parseInt(responseTimeMs) || 0
        });

        await newEma.save();

        try {
            const currentProb = Number(decrypt(clinicalProfile.lastBurnoutProbability));
            
            const prediction = await brainClient.getBurnoutPrediction({
                metrics: newEma.metrics,
                priorProbability: currentProb,
                context: {
                    caregiver: { age: clinicalProfile.age, gender: clinicalProfile.gender },
                    patient: { age: clinicalProfile.patientAge, gender: clinicalProfile.patientGender },
                    dynamics: { years: clinicalProfile.yearsCaregiving, burden: clinicalProfile.burdenType, support: clinicalProfile.hasExternalSupport }
                }
            });

            clinicalProfile.lastBurnoutProbability = encrypt(prediction.posteriorProbability || currentProb);
            clinicalProfile.lastInteractionAt = new Date();
            clinicalProfile.streakCount += 1;
            await clinicalProfile.save();

        } catch (brainError) {
            console.error('[Gateway ↔ Brain] Fallo de inferencia bayesiana.', brainError.message);
        }

        // APLICACIÓN DE PRG
        if (req.accepts('html')) return res.redirect('/?status=ema_saved');
        
        return res.status(200).json({ status: 'ok' });

    } catch (error) {
        res.status(500).json({ error: 'Fallo al procesar la evaluación.' });
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