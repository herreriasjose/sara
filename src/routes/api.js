// src/routes/api.js

const express = require('express');
const router = express.Router();
const emaController = require('../controllers/emaController');

router.get('/ping', (req, res) => res.status(200).json({ status: 'ok' }));

router.post('/caretakers', emaController.registerCaretaker);
router.get('/caretakers', emaController.getAllCaretakers);
router.delete('/caretakers/:externalId', emaController.deleteCaretaker);

router.post('/ema', emaController.submitEma);

module.exports = router;