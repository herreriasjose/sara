// tests/api.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');

describe('API Endpoints (Sincronización SARA)', () => {
    let server;
    let baseUrl;
    let generatedInternalId;
    const testPhoneNumber = '+34699999999';
    
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

    test('1. POST /caretakers -> Registro exitoso y generación de ID', async () => {
        const res = await fetch(`${baseUrl}/caretakers`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            },
            body: JSON.stringify({
                phoneNumber: testPhoneNumber,
                name: 'Jose Test API',
                age: 45,
                gender: 'male',
                relationship: 'child',
                yearsCaregiving: 5,
                postalCode: '28001',
                patientAge: 82,
                patientGender: 'female',
                patientDisabilityGrade: 75,
                burdenType: 'mixed',
                hasExternalSupport: true,
                consentAccepted: true
            }),
            redirect: 'manual' 
        });
        
        assert.strictEqual(res.status, 201);
        
        const data = await res.json();
        // Sincronizamos con la propiedad 'id' devuelta por el controlador
        assert.ok(data.data.id, 'Debe devolver el id (externalId)');
        assert.match(data.data.id, /^[a-f0-9]{16}$/, 'Formato hash SHA-256 (truncado)');
        
        generatedInternalId = data.data.id;
    });

    test('2. POST /ema -> Guardado con métricas de ultra-baja fricción', async () => {
        assert.ok(generatedInternalId);

        const res = await fetch(`${baseUrl}/ema`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': API_KEY 
            },
            body: JSON.stringify({
                externalId: generatedInternalId,
                energy: 4,
                tension: 2,
                clarity: 3,
                responseTimeMs: 12000
            }),
            redirect: 'manual'
        });
        
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, 'ok');
    });
});