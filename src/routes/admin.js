// src/routes/admin.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const StudyRequest = require('../models/StudyRequest');
const Researcher = require('../models/Researcher');
const requireAuth = require('../middlewares/requireAuth');
const encryptionService = require('../services/encryptionService'); // <-- Inyección del Vault


router.get('/', requireAuth(['admin', 'researcher']), async (req, res) => {
    try {
        const studyRequests = await StudyRequest.find().sort({ createdAt: 1 });
        
        // 1. Recuperar el documento en crudo (lean optimiza la memoria)
        const researcherDoc = await Researcher.findById(req.user.id).lean();
        
        // 2. Hidratación y descifrado explícito en memoria (Zero-Persistence)
        let fullUser = req.user;
        if (researcherDoc) {
            fullUser = {
                ...researcherDoc,
                firstName: encryptionService.decrypt(researcherDoc.firstName) || 'Anon',
                lastName: encryptionService.decrypt(researcherDoc.lastName) || ''
            };
        }

        res.render('pages/admin', { 
            studyRequests,
            user: fullUser 
        });
    } catch (error) {
        console.error('[SARA-Admin] Error al recuperar la cola de solicitudes:', error);
        res.render('pages/admin', { 
            studyRequests: [],
            user: req.user
        });
    }
});

router.post('/dashboard', requireAuth(['admin', 'researcher']), (req, res) => res.redirect('/admin'));

router.get('/register', requireAuth(['admin']), (req, res) => {
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
    
    // Delegación nativa al OS (Zero-Event-Loop-Blocking)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(logPath);
});

router.post('/invitations/caretaker/:id', requireAuth(['admin']), async (req, res) => {
    try {
        const request = await StudyRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Solicitud no encontrada.' });

        request.status = 'sent';
        await request.save();

        const newToken = await InvitationCaretakerToken.create({});
        const url = `${req.protocol}://${req.get('host')}/register/${newToken.token}`;
        
        res.status(200).json({ url, token: newToken.token });
    } catch (error) {
        console.error('[SARA-Admin] Error generando invitación contextual:', error);
        res.status(500).json({ error: 'Fallo al procesar la invitación.' });
    }
});

router.post('/invitations/researcher', requireAuth(['admin']), async (req, res) => {
    try {
        const newToken = await InvitationResearcherToken.create({ role: 'researcher' });
        const url = `${req.protocol}://${req.get('host')}/researcher/register/${newToken.token}`;
        res.status(201).json({ url, token: newToken.token });
    } catch (error) {
        res.status(500).json({ error: 'Fallo al generar el enlace de invitación.' });
    }
});

module.exports = router;