// src/routes/admin.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const StudyRequest = require('../models/StudyRequest');
const Researcher = require('../models/Researcher');
const CaretakerIdentity = require('../models/CaretakerIdentity'); // Alineación con el Vault
const requireAuth = require('../middlewares/requireAuth');
const encryptionService = require('../services/encryptionService');

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

        let viewData = [];

        if (req.user.role === 'admin') {
            const [requests, identities] = await Promise.all([
                StudyRequest.find().sort({ createdAt: -1 }),
                CaretakerIdentity.find().sort({ createdAt: -1 })
            ]);

            const mappedRequests = requests.map(r => ({
                id: r._id,
                type: 'request',
                date: r.createdAt,
                name: r.alias, 
                contact: `${r.prefix} ${r.phone} ${r.email ? `<br><span class="text-muted" style="font-size:0.75rem">${r.email}</span>` : ''}`,
                desc: r.descripcion || '—',
                status: r.status
            }));

            const mappedCaretakers = identities.map(c => ({
                id: c.externalId,
                type: 'caretaker',
                date: c.createdAt,
                name: safeDecrypt(c.name),
                contact: safeDecrypt(c.phoneReal) + (c.email ? `<br><span class="text-muted" style="font-size:0.75rem">${safeDecrypt(c.email)}</span>` : ''),
                desc: 'Alta Consolidada (Vault)',
                status: 'active'
            }));

            viewData = [...mappedRequests, ...mappedCaretakers].sort((a, b) => b.date - a.date);

        } else if (req.user.role === 'researcher') {
            const identities = await CaretakerIdentity.find({ registeredTo: req.user.id }).sort({ createdAt: -1 });
            
            viewData = identities.map(c => ({
                id: c.externalId,
                type: 'caretaker',
                date: c.createdAt,
                name: safeDecrypt(c.name),
                contact: safeDecrypt(c.phoneReal) + (c.email ? `<br><span class="text-muted" style="font-size:0.75rem">${safeDecrypt(c.email)}</span>` : ''),
                desc: 'Alta Consolidada (Vault)',
                status: 'active'
            }));
        }

        res.render('pages/admin', { 
            tableData: viewData,
            user: fullUser 
        });
    } catch (error) {
        console.error('[SARA-Admin] Colapso en renderizado de panel:', error);
        res.render('pages/admin', { tableData: [], user: req.user });
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

// Endpoint Agnóstico (Necesario para el Botón "Generar Alta")
router.post('/invitations/caretaker', requireAuth(['admin', 'researcher']), async (req, res) => {
    try {
        const newToken = await InvitationCaretakerToken.create({});
        const url = `${req.protocol}://${req.get('host')}/register/${newToken.token}`;
        res.status(201).json({ url, token: newToken.token });
    } catch (error) {
        console.error('[SARA-Admin] Error generando invitación agnóstica:', error);
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