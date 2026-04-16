// src/routes/ema.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EmaEntry = require('../models/EmaEntry');
const CaretakerClinical = require('../models/CaretakerClinical');
const CaretakerIdentity = require('../models/CaretakerIdentity'); // Inyección arquitectónica
const requireAuth = require('../middlewares/requireAuth');
const { verifyEmaToken } = require('../services/authService');
const emaController = require('../controllers/emaController');

const verifyTokenMiddleware = (req, res, next) => {
    const payload = verifyEmaToken(req.params.token);
    if (!payload) return res.status(401).send('Enlace caducado o inválido. Protocolo de tiempo real incumplido.');
    req.emaPayload = payload;
    next();
};

router.get('/r/:token', verifyTokenMiddleware, async (req, res) => {
    try {
        const { emaEntryId } = req.emaPayload;
        
        await EmaEntry.updateOne(
            { _id: emaEntryId, status: 'pending', openedAt: { $exists: false } },
            { $set: { openedAt: new Date() } }
        );

        res.render('pages/ema', { token: req.params.token });
    } catch (error) {
        res.status(500).send('Error de telemetría pasiva.');
    }
});

// Delegación estricta al controlador On-Dispatch
router.post('/r/:token', verifyTokenMiddleware, emaController.submitEma);

router.get('/status/:id', requireAuth(['admin', 'researcher']), async (req, res) => {
    try {
        const query = mongoose.Types.ObjectId.isValid(req.params.id)
            ? { $or: [{ externalId: req.params.id }, { _id: req.params.id }] }
            : { externalId: req.params.id };

        const clinical = await CaretakerClinical.findOne(query).lean();
        if (!clinical) return res.status(404).send('Identidad clínica no hallada.');

        // FUSIÓN DE BÓVEDAS (CORREGIDA): Búsqueda resiliente usando el parámetro de la petición
        const identity = await CaretakerIdentity.findOne(query).lean();
        
        // Transformación explícita a booleano (doble negación)
        clinical.isSubjectOfTest = identity ? !!identity.isSubjectOfTest : false;

        const entries = await EmaEntry.find({ patientId: clinical._id }).sort({ createdAt: -1 }).lean();
        
        res.render('pages/caretaker-status', { clinical, entries });
    } catch (error) {
        console.error('Error en enrutamiento de estatus clínico:', error);
        res.status(500).send('Fallo de integridad al recuperar datos.');
    }
});

module.exports = router;