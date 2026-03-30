// src\routes\web.js

const express = require('express');
const router = express.Router();
const InvitationToken = require('../models/InvitationToken');

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
        const tokenRecord = await InvitationToken.findOne({ token: req.params.tokenId });
        if (!tokenRecord) {
            return res.status(403).send('El enlace de invitación ha expirado, no existe o ya ha sido utilizado.');
        }
        res.render('pages/register-caretaker', { title: 'Alta de Cuidador', tokenId: tokenRecord.token });
    } catch (error) {
        res.status(500).send('Error interno del servidor.');
    }
});

module.exports = router;