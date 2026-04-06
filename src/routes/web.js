// src/routes/web.js

const express = require('express');
const router = express.Router();
const InvitationCaretakerToken = require('../models/InvitationCaretakerToken');
const InvitationResearcherToken = require('../models/InvitationResearcherToken');
const StudyRequest = require('../models/StudyRequest');

router.get('/', (req, res) => {
    res.render('pages/index', { 
        title: 'SARA | Inicio',
        status: req.query.status || null 
    });
});

router.post('/solicitud-acceso', async (req, res) => {
    try {
        const { alias, prefix, phone, email, descripcion } = req.body;
        
        await StudyRequest.create({
            alias: alias.trim(),
            prefix: prefix.trim(),
            phone: phone.replace(/\D/g, ''), // Asegura que solo lleguen números al core
            email: email ? email.trim() : undefined,
            descripcion: descripcion ? descripcion.trim() : undefined
        });

        console.log(`[CANDIDATO EMA] Solicitud guardada: ${alias} - Tel: ${prefix}${phone}`);
        res.redirect('/?status=solicitud_recibida');
    } catch (error) {
        console.error('[SARA-Gateway] Error en ingesta de solicitud:', error.message);
        res.redirect('/?status=error_solicitud');
    }
});

router.get('/test-ema', (req, res) => {
    res.render('pages/ema', { title: 'SARA - Test de Evaluación' });
});


router.get('/register/:tokenId', async (req, res) => {
    try {
        const tokenRecord = await InvitationCaretakerToken.findOne({ token: req.params.tokenId });
        if (!tokenRecord) {
            return res.status(403).send('El enlace de invitación ha expirado o ya ha sido utilizado.');
        }

        const requestDoc = await StudyRequest.findById(tokenRecord.studyRequest);
        if (!requestDoc) {
            return res.status(404).send('Inconsistencia: Solicitud huérfana.');
        }

        res.render('pages/register-caretaker', { 
            title: 'Alta de Cuidador', 
            tokenId: tokenRecord.token,
            phone: requestDoc.phone,
            prefix: requestDoc.prefix
        });
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
    if (req.cookies?.sara_session) {
        return res.redirect('/admin');
    }
    
    // Captura el error para renderizado seguro
    const errorMessage = req.query.error === 'auth' 
        ? 'Credenciales erróneas o acceso denegado.' 
        : null;

    res.render('pages/login', { 
        title: 'SARA | Investigadores',
        error: errorMessage
    });
});

module.exports = router;