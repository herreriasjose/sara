const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const StudyRequest = require('../models/StudyRequest');
const Researcher = require('../models/Researcher');
const CaretakerIdentity = require('../models/CaretakerIdentity');
const requireAuth = require('../middlewares/requireAuth');
const encryptionService = require('../services/encryptionService');
const jwt = require('jsonwebtoken');
const CaretakerClinical = require('../models/CaretakerClinical');
const EmaEntry = require('../models/EmaEntry');

const safeDecrypt = (val) => {
    if (!val) return '';
    try { 
        const dec = encryptionService.decrypt(val);
        return dec ? dec : val;
    } catch (e) { 
        return val; 
    }
};

router.get('/', requireAuth(['admin', 'researcher']), async (req, res) => {
    try {
        const researcherDoc = await Researcher.findById(req.user.id).lean();
        
        let fullUser = req.user;
        if (researcherDoc) {
            fullUser = {
                ...researcherDoc,
                firstName: safeDecrypt(researcherDoc.firstName) || 'Anon',
                lastName: safeDecrypt(researcherDoc.lastName) || ''
            };
        }

        let invitacionesData = [];
        
        // Cuidadores visibles para todos los roles
        const identities = await CaretakerIdentity.find().sort({ createdAt: -1 });
        const cuidadoresData = identities.map(c => ({
            id: c.externalId,
            externalId: c.externalId,
            date: c.createdAt,
            name: safeDecrypt(c.name),
            contact: safeDecrypt(c.phoneReal) + (c.email ? `<br><span class="text-muted" style="font-size:0.75rem">${safeDecrypt(c.email)}</span>` : ''),
            desc: 'Alta Consolidada',
            status: 'active',
            isSubjectOfTest: c.isSubjectOfTest || false 
        }));

        // Solicitudes orgánicas e invitaciones exclusivas para Admin
        if (req.user.role === 'admin') {
            const requests = await StudyRequest.find().sort({ createdAt: -1 });
            invitacionesData = requests.map(r => ({
                id: r._id,
                date: r.createdAt,
                name: r.alias, 
                contact: `${r.prefix} ${r.phone} ${r.email ? `<br><span class="text-muted" style="font-size:0.75rem">${r.email}</span>` : ''}`,
                desc: r.descripcion || '—',
                status: r.status
            }));
        }

        res.render('pages/admin', { 
            cuidadores: cuidadoresData,
            invitaciones: invitacionesData,
            user: fullUser 
        });
    } catch (error) {
        console.error('[SARA-Admin] Colapso en renderizado de panel:', error);
        res.render('pages/admin', { cuidadores: [], invitaciones: [], user: req.user });
    }
});

router.post('/ema/generate-token/:externalId', requireAuth(['admin']), async (req, res) => {
    try {
        const { externalId } = req.params;
        
        if (!externalId || externalId === 'undefined') {
            return res.status(400).json({ error: 'Identidad clínica no válida.' });
        }

        const clinicalRecord = await CaretakerClinical.findOne({ externalId });
        if (!clinicalRecord) {
            return res.status(404).json({ error: 'Contexto clínico no hallado.' });
        }

        const anchorParts = (clinicalRecord.morningAnchor || '08:30').split(':');
        const anchorHour = parseInt(anchorParts[0], 10);
        const anchorMinute = parseInt(anchorParts[1], 10);

        const lastSimulatedEma = await EmaEntry.findOne({
            patientId: clinicalRecord._id,
            isSimulated: true
        }).sort({ dispatchedAt: -1 });

        let nextDispatchedAt = new Date();

        if (!lastSimulatedEma) {
            nextDispatchedAt.setHours(anchorHour, anchorMinute, 0, 0);
        } else {
            const lastDate = new Date(lastSimulatedEma.dispatchedAt);
            const baseAnchorForLastDate = new Date(lastDate);
            baseAnchorForLastDate.setHours(anchorHour, anchorMinute, 0, 0);

            const diffHours = Math.round((lastDate.getTime() - baseAnchorForLastDate.getTime()) / (1000 * 60 * 60));

            if (diffHours < 6) {
                nextDispatchedAt = new Date(baseAnchorForLastDate.getTime() + 6 * 60 * 60 * 1000);
            } else if (diffHours < 12) {
                nextDispatchedAt = new Date(baseAnchorForLastDate.getTime() + 12 * 60 * 60 * 1000);
            } else {
                nextDispatchedAt = new Date(baseAnchorForLastDate);
                nextDispatchedAt.setDate(nextDispatchedAt.getDate() + 1);
            }
        }

        const pendingEma = await EmaEntry.create({
            patientId: clinicalRecord._id,
            status: 'pending',
            isSimulated: true,
            dispatchedAt: nextDispatchedAt
        });

        const token = jwt.sign(
            { 
                clinicalId: clinicalRecord._id, 
                emaEntryId: pendingEma._id, 
                isSimulated: true 
            },
            process.env.JWT_SECRET || 'fallback_secret_development',
            { expiresIn: '2h' }
        );
        
        res.status(200).json({ url: '/ema/r/' + token });
    } catch (error) {
        console.error('[SARA-Admin] Error inyección On-Dispatch:', error);
        res.status(500).json({ error: 'Fallo criptográfico o de base de datos en generación de enlace.' });
    }
});

router.post('/dashboard', requireAuth(['admin', 'researcher']), (req, res) => res.redirect('/admin'));

router.get('/register', requireAuth(['admin', 'researcher']), (req, res) => {
    res.render('pages/admin-register-caretaker', { title: 'Panel de Control - Registro' });
});

router.get('/logs/:service', requireAuth(['admin']), (req, res) => {
    const allowedLogs = ['gateway', 'brain', 'accesses'];
    const service = req.params.service;
    
    if (!allowedLogs.includes(service)) {
        return res.status(403).json({ error: 'Violación de acceso: Servicio no autorizado.' });
    }
    
    const logPath = path.join(__dirname, '../../logs', `${service}.log`);
    
    if (!fs.existsSync(logPath)) {
        return res.status(404).type('text/plain').send('[SARA_TELEMETRY] Archivo de log aún no inicializado.');
    }
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(logPath);
});

router.post('/invitations/caretaker/:id', requireAuth(['admin', 'researcher']), async (req, res) => {
    try {
        const request = await StudyRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Solicitud no encontrada.' });

        request.status = 'sent';
        await request.save();

        const newToken = await InvitationCaretakerToken.create({
            createdBy: req.user.role === 'researcher' ? req.user.id : null,
            studyRequest: request._id
        });
        
        const url = `${req.protocol}://${req.get('host')}/register/${newToken.token}`;
        res.status(200).json({ url, token: newToken.token });
    } catch (error) {
        res.status(500).json({ error: 'Fallo al procesar la invitación.' });
    }
});

router.post('/invitations/researcher', requireAuth(['admin']), async (req, res) => {
    try {
        const newToken = await InvitationResearcherToken.create({ role: 'researcher' });
        const url = `${req.protocol}://${req.get('host')}/researcher/register/${newToken.token}`;
        return res.status(201).json({ url, token: newToken.token });
    } catch (error) {
        console.error('[SARA-Admin] Error creando token de investigador:', error.message);
        return res.status(500).json({ error: 'Fallo al generar el enlace de invitación.' });
    }
});

router.post('/ema/simulate-consumption/:externalId', requireAuth(['admin']), async (req, res) => {
    try {
        const { externalId } = req.params;
        const clinicalRecord = await CaretakerClinical.findOne({ externalId });
        
        if (!clinicalRecord) {
            return res.status(404).json({ error: 'Contexto clínico no hallado.' });
        }

        const pendingEntries = await EmaEntry.find({
            patientId: clinicalRecord._id,
            isSimulated: true,
            status: 'pending'
        });

        if (pendingEntries.length === 0) {
            return res.status(200).json({ message: 'No hay eventos simulados en espera.' });
        }

        const anchorParts = (clinicalRecord.morningAnchor || '08:30').split(':');
        const anchorHour = parseInt(anchorParts[0], 10);
        let consumedCount = 0;

        for (const entry of pendingEntries) {
            const dispatched = new Date(entry.dispatchedAt);
            let hourDiff = dispatched.getHours() - anchorHour;
            if (hourDiff < 0) hourDiff += 24;

            // Cortafuegos conductual: 15% de probabilidad de omisión absoluta
            const isOmission = Math.random() < 0.15;

            if (isOmission) {
                entry.status = 'expired';
            } else {
                entry.status = 'completed';
                let delayMins, respMs, energy, tension, clarity;

                if (hourDiff < 4) {
                    // Turno Matutino: Homeostasis preservada
                    delayMins = Math.floor(Math.random() * 15) + 1;
                    respMs = Math.floor(Math.random() * 3500) + 2500;
                    energy = Math.floor(Math.random() * 2) + 4; 
                    tension = 1;
                    clarity = 3;
                } else if (hourDiff < 10) {
                    // Turno Tarde: Fricción cognitiva
                    delayMins = Math.floor(Math.random() * 45) + 15;
                    respMs = Math.floor(Math.random() * 7000) + 8000;
                    energy = 3;
                    tension = 2;
                    clarity = 2;
                } else {
                    // Turno Noche: Bradicinesia y déficit metabólico
                    delayMins = Math.floor(Math.random() * 120) + 60;
                    respMs = Math.floor(Math.random() * 20000) + 20000;
                    energy = Math.floor(Math.random() * 2) + 1;
                    tension = 3;
                    clarity = 1;
                }

                const openedDate = new Date(dispatched.getTime() + delayMins * 60000);
                entry.openedAt = openedDate;
                entry.responseTimeMs = respMs;
                entry.completedAt = new Date(openedDate.getTime() + respMs);
                entry.metrics = { energy, tension, clarity };
            }

            await entry.save();
            consumedCount++;
        }

        res.status(200).json({ message: `Resolución alostática completada: ${consumedCount} registros consumidos.` });
    } catch (error) {
        console.error('[SARA-Admin] Error en consumo simulado:', error);
        res.status(500).json({ error: 'Fallo en la resolución de la máquina de estados.' });
    }
});


module.exports = router;