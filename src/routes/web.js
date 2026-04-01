// src\routes\web.js

const express = require('express');
const router = express.Router();
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken')

router.get('/', (req, res) => {
    res.render('pages/index', { title: 'SARA | Inicio' });
});

router.post('/solicitud-acceso', (req, res) => {
    const { alias, contacto } = req.body;
    console.log(`[CANDIDATO EMA] Solicitud recibida: ${alias} - Contacto: ${contacto}`);
    res.redirect('/?status=solicitud_recibida');
});

router.get('/test-ema', (req, res) => {
    res.render('pages/ema', { title: 'SARA - Test de Evaluación' });
});

router.get('/register/:tokenId', async (req, res) => {
    try {
        const tokenRecord = await InvitationCaretakerToken.findOne({ token: req.params.tokenId });
        if (!tokenRecord) {
            return res.status(403).send('El enlace de invitación ha expirado, no existe o ya ha sido utilizado.');
        }
        res.render('pages/register-caretaker', { title: 'Alta de Cuidador', tokenId: tokenRecord.token });
    } catch (error) {
        res.status(500).send('Error interno del servidor.');
    }
});

router.get('/researcher/register/:tokenId', async (req, res) => {
    try {
        const tokenRecord = await InvitationResearcherToken.findOne({ token: req.params.tokenId });
        
        if (!tokenRecord) {
            return res.status(404).render('pages/error', { 
                message: 'El enlace de invitación ha caducado o no existe. Solicite uno nuevo al Administrador.' 
            });
        }

        res.render('pages/register-researcher', { 
            title: 'Alta de Investigador - SARA',
            token: tokenRecord.token,
            role: tokenRecord.role
        });
    } catch (error) {
        res.status(500).send('Error interno del servidor.');
    }
});

router.get('/login', (req, res) => {
    res.render('pages/login', { title: 'SARA | Investigadores' });  
});

router.get('/login', (req, res) => {
    if (req.cookies?.sara_session) {
        return res.redirect('/admin');
    }
    res.render('pages/login', { title: 'SARA | Investigadores' });
});


module.exports = router;