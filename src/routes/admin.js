// src/routes/admin.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const requireAuth = require('../middlewares/requireAuth');

// Permitir acceso a la vista general tanto a investigadores como a administradores
router.get('/', requireAuth(['admin', 'researcher']), (req, res) => {
    res.render('pages/admin');
});

// Redirección del dashboard
router.post('/dashboard', requireAuth(['admin', 'researcher']), (req, res) => {
    res.redirect('/admin');
});

// Paneles estrictos: Solo Admin
router.get('/register', requireAuth(['admin']), (req, res) => {
    res.render('pages/admin-register-caretaker', { title: 'Panel de Control - Registro' });
});

router.get('/logs/:service', requireAuth(['admin']), (req, res) => {
    const service = req.params.service;
    if (!['gateway', 'brain'].includes(service)) {
        return res.status(400).json({ error: 'Servicio no reconocido.' });
    }
    const logPath = path.join(__dirname, '../../logs', `${service}.log`);
    if (!fs.existsSync(logPath)) return res.status(404).json({ error: 'Log no existe.' });
    
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    res.json({ service, logs: lines.slice(-100) });
});

router.post('/invitations', requireAuth(['admin']), async (req, res) => {
    try {
        const newToken = await InvitationCaretakerToken.create({});
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}/register/${newToken.token}`;
        res.status(201).json({ url, token: newToken.token });
    } catch (error) {
        res.status(500).json({ error: 'Fallo al generar el enlace de invitación.' });
    }
});

router.post('/invitations/researcher', requireAuth(['admin']), async (req, res) => {
    try {
        const newToken = await InvitationResearcherToken.create({ role: 'researcher' });
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}/researcher/register/${newToken.token}`;
        res.status(201).json({ url, token: newToken.token });
    } catch (error) {
        res.status(500).json({ error: 'Fallo al generar el enlace de invitación para investigador.' });
    }
});

module.exports = router;