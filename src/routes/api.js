// src/routes/api.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const emaController = require('../controllers/emaController');
const researcherController = require('../controllers/researcherController');

router.get('/ping', (req, res) => res.status(200).json({ status: 'ok' }));

router.post('/ema', emaController.submitEma);


router.post('/caretakers', authController.registerCaretaker);
router.get('/caretakers', authController.getAllCaretakers);
router.delete('/caretakers/:externalId', authController.deleteCaretaker);

router.get('/researchers', researcherController.getAllResearchers);
router.post('/researchers/register/:tokenId', authController.registerResearcher);

router.post('/login', authController.loginResearcher);
router.post('/logout', authController.logoutResearcher);

module.exports = router;