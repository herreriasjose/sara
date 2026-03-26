// src/routes/ema.js
router.post('/r/:token', async (req, res) => {
    const patientId = authService.verifyEmaToken(req.params.token);
    if (!patientId) return res.status(403).send('Link caducado');

    const { energy, tension, clarity, startTime } = req.body;
    const responseTimeMs = Date.now() - startTime;

    // 1. Guardar en MongoDB (Node.js - Obrero)
    const entry = await EmaEntry.create({
        patientId,
        metrics: { energy, tension, clarity },
        responseTimeMs
    });

    // 2. Consultar al Brain (Python - Cerebro)
    const prediction = await brainClient.getBurnoutPrediction({ energy, tension, clarity });

    // 3. Actualizar paciente (Rachas y Probabilidad)
    await Patient.findByIdAndUpdate(patientId, {
        $inc: { streakCount: 1 },
        lastBurnoutProbability: prediction?.probability || 0,
        lastInteractionAt: new Date()
    });

    res.render('thanks', { streak: patient.streakCount + 1 });
});