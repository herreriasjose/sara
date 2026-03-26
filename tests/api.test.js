// tests\api.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../server');

describe('API Endpoints (Sincronización SARA)', () => {
    let server;
    let baseUrl;
    const testPatientId = 'WA-TEST-PHONES-01';

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
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

    test('1. POST /patients -> Registro exitoso', async () => {
        const res = await fetch(`${baseUrl}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                externalId: testPatientId,
                consentAccepted: true
            })
        });
        assert.strictEqual(res.status, 201);
    });

    test('2. POST /ema -> Guardado con métricas de ultra-baja fricción', async () => {
        const res = await fetch(`${baseUrl}/ema`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                externalId: testPatientId,
                energy: 4,     // 1-5
                tension: 2,    // 1-3
                clarity: 3,    // 1-3
                responseTimeMs: 12000
            })
        });
        const data = await res.json();
        
        assert.strictEqual(res.status, 201, 'Ahora devuelve 201 porque los datos son válidos');
        assert.strictEqual(data.streak, 1);
    });
});