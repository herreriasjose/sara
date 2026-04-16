// src/controllers/researcherController.js

const Researcher = require('../models/Researcher');
const { decrypt } = require('../services/encryptionService');
const { encrypt } = require('../services/encryptionService');
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const CaretakerClinical = require('../models/CaretakerClinical');
const brainClient = require('../services/brainClient');

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

// exports.assignCaretakerToResearcher = async (req, res) => {
//     try {
//         const { caretakerId, researcherId } = req.body;
        
//         // El valor "" o undefined se normaliza a null para limpiar la asignación
//         const updateValue = researcherId || null;

//         const updatedCaretaker = await Caretaker.findByIdAndUpdate(
//             caretakerId,
//             { researcher: updateValue },
//             { new: true }
//         );

//         if (!updatedCaretaker) return res.status(404).json({ error: 'Cuidador no hallado.' });

//         return res.status(200).json({ 
//             status: 'success', 
//             message: 'Agrupación actualizada correctamente.' 
//         });
//     } catch (error) {
//         return res.status(500).json({ error: 'Fallo en la reasignación de cohorte.' });
//     }
// };

exports.syncAlostaticInference = async (req, res) => {
    try {
        const { externalId } = req.params;
        const clinical = await CaretakerClinical.findOne({ externalId });
        
        if (!clinical) return res.status(404).json({ error: 'Caretaker no hallado' });

        const alpha = clinical.bayesianParams.alpha || 1;
        const beta = clinical.bayesianParams.beta || 1;
        const priorProb = Number((alpha / (alpha + beta)).toFixed(4));

        // Cálculo de inacción (Silencio Alostático)
        const now = Date.now();
        const lastInteraction = clinical.lastInteractionAt ? new Date(clinical.lastInteractionAt).getTime() : new Date(clinical.updatedAt).getTime();
        const silenceMs = now - lastInteraction;
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

        // Bypass de Fricción Cero: Si no hay omisión crítica, no gastamos CPU en Python
        if (silenceMs < TWO_HOURS_MS) {
            return res.status(200).json({ alpha, beta, probability: priorProb });
        }

        // Inyección del Vector Límite de Estrés (ERP - Omission)
        const payload = {
            external_id: externalId,
            energy: 1,  // Límite inferior de resiliencia
            tension: 3, // Límite superior de desgaste
            clarity: 1, 
            latencies: {
                attention_ms: silenceMs,
                resolution_ms: 0,
                is_high_quality: true // True para forzar asimilación en el motor bayesiano
            },
            bayesian_state: {
                alpha: alpha,
                beta: beta,
                prior_probability: priorProb
            }
        };

        const prediction = await brainClient.getBurnoutPrediction(payload);

        if (!prediction) throw new Error('SARA-Brain timeout o error interno');

        // Actualización de la bóveda clínica
        clinical.bayesianParams.alpha = prediction.new_alpha;
        clinical.bayesianParams.beta = prediction.new_beta;
        clinical.lastBurnoutProbability = encrypt(prediction.probability.toString());
        clinical.lastInteractionAt = new Date(); // Reseteo del contador tras la penalización
        
        await clinical.save();

        return res.status(200).json({
            alpha: prediction.new_alpha,
            beta: prediction.new_beta,
            probability: prediction.probability
        });

    } catch (error) {
        console.error('[Inferencia Sync] Colapso:', error.message);
        return res.status(503).json({ error: 'Servicio de Inferencia Degradado' });
    }
};