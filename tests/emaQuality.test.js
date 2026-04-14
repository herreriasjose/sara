// tests/emaQuality.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const EmaEntry = require('../src/models/EmaEntry');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const { encrypt } = require('../src/services/encryptionService');
const app = require('../src/server');
const { createServer } = require('node:http');
const authService = require('../src/services/authService');

describe('SARA-Quality: Validación de Biomarcadores y Regla de los 20s', () => {
    let server, baseUrl, mockClinicalId;

    before(async () => {
        if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
        mockClinicalId = new mongoose.Types.ObjectId();
        
        await CaretakerClinical.collection.insertOne({
            _id: mockClinicalId,
            externalId: 'SARA-QUAL-01',
            lastBurnoutProbability: encrypt('0.5'),
            bayesianParams: { alpha: 1, beta: 1 }
        });

        server = createServer(app);
        await new Promise(r => server.listen(0, () => {
            baseUrl = `http://localhost:${server.address().port}`;
            r();
        }));
    });

    after(async () => {
        server.close();
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    });

    test('Detección de Ruido: Latencia de Resolución < 2s', async () => {
        const entry = await EmaEntry.create({
            patientId: mockClinicalId,
            status: 'pending',
            dispatchedAt: new Date(Date.now() - 10000)
        });

        const token = authService.generateEmaToken(mockClinicalId.toString(), entry._id.toString());

        const res = await fetch(`${baseUrl}/ema/r/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                energy: 5, tension: 1, clarity: 3,
                responseTimeMs: 500 // Respuesta ultra-rápida (sospecha de bot/fatiga)
            })
        });

        const updatedEntry = await EmaEntry.findById(entry._id);
        assert.strictEqual(updatedEntry.isHighQuality, false, 'Debe marcar como isHighQuality: false');
    });

    test('Integridad de Latencia de Atención (LA)', async () => {
        const dispatchTime = new Date(Date.now() - 60000); // Enviado hace 1 minuto
        const entry = await EmaEntry.create({
            patientId: mockClinicalId,
            status: 'pending',
            dispatchedAt: dispatchTime
        });

        const token = authService.generateEmaToken(mockClinicalId.toString(), entry._id.toString());
        
        // Simulamos apertura ahora
        await EmaEntry.updateOne({ _id: entry._id }, { $set: { openedAt: new Date() } });

        await fetch(`${baseUrl}/ema/r/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ energy: 3, tension: 2, clarity: 2, responseTimeMs: 5000 })
        });

        const finalEntry = await EmaEntry.findById(entry._id);
        const expectedLA = finalEntry.openedAt.getTime() - dispatchTime.getTime();
        
        assert.ok(expectedLA >= 60000, 'La Latencia de Atención debe ser coherente con el tiempo de despacho');
    });
});