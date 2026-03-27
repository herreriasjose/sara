// tests/api.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');

describe('API Endpoints (Sincronización SARA)', () => {
    let server;
    let baseUrl;
    const testCaretakerId = 'WA-TEST-PHONES-01';
    
    const API_KEY = process.env.SARA_API_KEY || 'sara_dev_token_2026';

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

    test('1. POST /caretakers -> Registro exitoso', async () => {
        // CORRECCIÓN: Ruta actualizada y campo 'name' incluido
        const res = await fetch(`${baseUrl}/caretakers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                externalId: testCaretakerId,
                name: 'Jose Test Investigator',
                consentAccepted: true,
                patientDisabilityGrade: 75,
                caretakerDisabilityGrade: 69
            })
        });
        assert.strictEqual(res.status, 201, 'El registro debe ser exitoso con los nuevos campos');
    });

    test('2. POST /ema -> Guardado con métricas de ultra-baja fricción', async () => {
        const res = await fetch(`${baseUrl}/ema`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': API_KEY 
            },
            body: JSON.stringify({
                externalId: testCaretakerId,
                energy: 4,
                tension: 2,
                clarity: 3,
                responseTimeMs: 12000
            })
        });
        
        assert.strictEqual(res.status, 201, 'Guardado EMA autorizado y válido');
        const data = await res.json();
        assert.strictEqual(data.streak, 1);
    });
});