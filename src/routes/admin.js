// src/routes/admin.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const StudyRequest = require('../models/StudyRequest');
const requireAuth = require('../middlewares/requireAuth');

router.get('/', requireAuth(['admin', 'researcher']), async (req, res) => {
    try {
        const studyRequests = await StudyRequest.find().sort({ createdAt: 1 });
        res.render('pages/admin', { studyRequests });
    } catch (error) {
        console.error('[SARA-Admin] Error al recuperar la cola de solicitudes:', error);
        res.render('pages/admin', { studyRequests: [] });
    }
});

router.post('/dashboard', requireAuth(['admin', 'researcher']), (req, res) => res.redirect('/admin'));

router.get('/register', requireAuth(['admin']), (req, res) => {
    res.render('pages/admin-register-caretaker', { title: 'Panel de Control - Registro' });
});

router.get('/logs/:service', requireAuth(['admin']), (req, res) => {
    const service = req.params.service;
    if (!['gateway', 'brain'].includes(service)) return res.status(400).json({ error: 'Servicio no reconocido.' });
    
    const logPath = path.join(__dirname, '../../logs', `${service}.log`);
    if (!fs.existsSync(logPath)) return res.status(404).json({ error: 'Log no existe.' });
    
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    res.json({ service, logs: lines.slice(-100) });
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