// src/routes/api.js

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authController = require('../controllers/authController');
const researcherController = require('../controllers/researcherController');
const requireAuth = require('../middlewares/requireAuth');


const JWT_SECRET = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || 'sara_alostatic_shield_2027';

const passiveAuth = (req, res, next) => {
    const token = req.cookies?.sara_session;
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['RS256', 'HS256'] });
        } catch (err) {}
    }
    next();
};

router.get('/ping', (req, res) => res.status(200).json({ status: 'ok' }));

// router.post('/ema', emaController.submitEma);

router.post('/caretakers', passiveAuth, authController.registerCaretaker);
router.get('/caretakers', authController.getAllCaretakers);
router.delete('/caretakers/:externalId', authController.deleteCaretaker);

router.get('/researchers', researcherController.getAllResearchers);
router.post('/researchers/register/:tokenId', authController.registerResearcher);

router.post('/invitations/caretaker', requireAuth(['admin', 'researcher']), researcherController.generateCaretakerInvitation);

router.post('/login', authController.loginResearcher);
router.post('/logout', authController.logoutResearcher);
router.post('/v4/inference/:externalId/sync', requireAuth(['admin', 'researcher']), researcherController.syncAlostaticInference);

module.exports = router;