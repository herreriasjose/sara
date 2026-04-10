// tests/ema.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const EmaEntry = require('../src/models/EmaEntry');
const authService = require('../src/services/authService');
const { encrypt } = require('../src/services/encryptionService');

describe('Flujo EMA: Tokens Efímeros, Zero-Friction y Aislamiento Científico', () => {
    let server;
    let baseUrl;
    let mockClinicalId;
    const mockExternalId = 'SARA-SIM-999';
    let validEmaToken;

    before(async () => {
        const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/sara_test_${process.pid}`;
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
        await CaretakerClinical.deleteMany({});
        await EmaEntry.deleteMany({});

        mockClinicalId = new mongoose.Types.ObjectId();

        // Inyección a nivel de driver para saltar la validación estricta y asegurar el Prior
        await CaretakerClinical.collection.insertOne({
            _id: mockClinicalId,
            externalId: mockExternalId,
            streakCount: 0,
            morningAnchor: '08:00',
            timezone: 'Europe/Madrid',
            lastBurnoutProbability: encrypt(0.1) // Necesario para la integridad del motor criptográfico
        });

        server = createServer(app);
        await new Promise((resolve) => {
            server.listen(0, () => {
                baseUrl = `http://localhost:${server.address().port}`;
                resolve();
            });
        });
    });

    after(async () => {
        // Cortafuegos de Sockets: Aniquilación de hilos Keep-Alive
        if (server && server.closeAllConnections) server.closeAllConnections(); 
        if (server) server.close();
        
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.db.dropDatabase();
            await mongoose.disconnect();
        }
        
        // Cierre de seguridad: Libera el Event Loop
        setTimeout(() => process.exit(0), 500).unref();
    });

    test('1. Generación de enlace JITAI cifrado (Bypass Admin para Aislamiento Core)', async () => {
        // Generamos el JWT directamente con el ObjectId de la Bóveda Clínica y flag de Simulación
        validEmaToken = authService.generateEmaToken(mockClinicalId.toString(), true);
        
        assert.ok(validEmaToken, 'Debe generar el token');
        assert.match(validEmaToken, /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/, 'El token debe cumplir el formato JWT');
    });

    test('2. GET /ema/r/:token -> Renderizado Stateless del formulario', async () => {
        assert.ok(validEmaToken, 'Dependencia fallida');
        const res = await fetch(`${baseUrl}/ema/r/${validEmaToken}`, {
            headers: { 'Connection': 'close' }
        });
        
        const html = await res.text();
        assert.strictEqual(res.status, 200, `Fallo en renderizado: Código HTTP ${res.status}`);
        assert.match(html, /Formulario EMA/i, 'Debe renderizar la vista correctamente');
        assert.match(html, new RegExp(validEmaToken.replace(/\./g, '\\.')), 'Debe inyectar el token en el dataset del DOM');
    });

    test('3. POST /ema/r/:token -> Consumo y persistencia simulada', async () => {
        assert.ok(validEmaToken, 'Dependencia fallida');
        const res = await fetch(`${baseUrl}/ema/r/${validEmaToken}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Connection': 'close'
            },
            body: JSON.stringify({
                energy: 2,
                tension: 3,
                clarity: 1,
                responseTimeMs: 8500
            })
        });
        
        const text = await res.text();
        assert.strictEqual(res.status, 200, `Fallo de guardado: ${text}`);
        
        const data = JSON.parse(text);
        assert.strictEqual(data.status, 'success');
        assert.strictEqual(data.simulated, true, 'Debe emitir flag de evento simulado');
    });

    test('4. Verificación de Integridad Científica (Cortafuegos ERP/Bayesiano)', async () => {
        const entry = await EmaEntry.findOne({ patientId: mockClinicalId });
        assert.ok(entry, 'El registro EMA debe existir en persistencia');
        assert.strictEqual(entry.isSimulated, true, 'La entrada debe estar flaggeada como simulada');
        assert.strictEqual(entry.metrics.energy, 2);

        const clinical = await CaretakerClinical.findById(mockClinicalId);
        assert.strictEqual(clinical.streakCount, 0, 'Un evento simulado no debe alterar la racha clínica longitudinal');
        assert.ok(!clinical.lastInteractionAt, 'Un evento simulado no debe actualizar el lastInteractionAt');
    });

    test('5. Rechazo de Token Inválido o Modificado (Criptografía Activa)', async () => {
        assert.ok(validEmaToken, 'Dependencia fallida');
        // Corrompemos la firma del JWT
        const tamperedToken = validEmaToken.substring(0, validEmaToken.length - 5) + 'xxxxx';

        const res = await fetch(`${baseUrl}/ema/r/${tamperedToken}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Connection': 'close'
            },
            body: JSON.stringify({ energy: 5, tension: 1, clarity: 3, responseTimeMs: 4000 })
        });
        
        const text = await res.text();
        assert.strictEqual(res.status, 401);
        assert.match(text, /inválido|caducado/i, 'Debe interceptar la firma corrupta del JWT');
    });
});