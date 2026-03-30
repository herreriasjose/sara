// src\routes\admin.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const InvitationToken = require('../models/InvitationToken');

// Bypass temporal de seguridad
const bypassAuth = (req, res, next) => next();

router.get('/', bypassAuth, (req, res) => {
    res.render('pages/admin');
});

// Mantenemos compatibilidad con el action del form anterior por si hay caché
router.post('/dashboard', bypassAuth, (req, res) => {
    res.redirect('/admin');
});

router.get('/register', bypassAuth, (req, res) => {
    res.render('pages/admin-register-caretaker', { title: 'Panel de Control - Registro' });
});

router.get('/logs/:service', bypassAuth, (req, res) => {
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

router.post('/invitations', bypassAuth, async (req, res) => {
    try {
        const newToken = await InvitationToken.create({});
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}/register/${newToken.token}`;
        res.status(201).json({ url, token: newToken.token });
    } catch (error) {
        res.status(500).json({ error: 'Fallo al generar el enlace de invitación.' });
    }
});

module.exports = router;