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

        const pendingEma = await EmaEntry.create({
            patientId: clinicalRecord._id,
            status: 'pending',
            isSimulated: true, 
            dispatchedAt: new Date()
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

module.exports = router;