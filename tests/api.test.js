const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../server'); // Importamos SARA

describe('API Endpoints (Integración SARA-Duolingo)', () => {
    let server;
    let baseUrl;
    const testPatientId = 'USR-AUTO-TEST-WA';

    before(async () => {
        // Conexión a la BD
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        
        // Levantamos el servidor en un puerto dinámico (0) para evitar EADDRINUSE
        server = createServer(app);
        await new Promise((resolve) => {
            server.listen(0, () => {
                baseUrl = `http://localhost:${server.address().port}/api`;
                resolve();
            });
        });
    });

    after(async () => {
        server.close();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.db.dropDatabase();
            await mongoose.disconnect();
        }
    });

    test('1. POST /patients -> Debe registrar el Power User', async () => {
        const res = await fetch(`${baseUrl}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                externalId: testPatientId,
                disabilityGrade: 69,
                isQuotaParticipant: true,
                consentAccepted: true
            })
        });
        const data = await res.json();
        
        assert.strictEqual(res.status, 201, 'El endpoint debe devolver 201 Created');
        assert.strictEqual(data.patient.externalId, testPatientId);
    });

    test('2. POST /ema -> Debe guardar la evaluación 20s y subir la Racha', async () => {
        const res = await fetch(`${baseUrl}/ema`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                externalId: testPatientId,
                energy: 4,
                tension: 8,
                clarity: 5,
                responseTimeMs: 14500
            })
        });
        const data = await res.json();
        
        assert.strictEqual(res.status, 201);
        assert.strictEqual(data.streak, 1, 'Gamificación: La racha debe haber subido a 1');
        assert.strictEqual(data.isHighQuality, true, 'Gamificación: 14.5s es High Quality');
    });
});