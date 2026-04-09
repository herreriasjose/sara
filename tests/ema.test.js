// tests/ema.test.js

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const EmaEntry = require('../src/models/EmaEntry');
const Researcher = require('../src/models/Researcher');
const { generateSessionToken } = require('../src/services/authService');

describe('Flujo EMA: Tokens Efímeros, Zero-Friction y Aislamiento Científico', () => {
    let server;
    let baseUrl;
    let adminCookie;
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
        await Researcher.deleteMany({});

        const mockAdminId = new mongoose.Types.ObjectId();
        mockClinicalId = new mongoose.Types.ObjectId();

        // Inyección a nivel de driver para saltar la validación estricta de Mongoose
        await Researcher.collection.insertOne({
            _id: mockAdminId,
            role: 'admin',
            firstName: 'Admin',
            lastName: 'EMA',
            alias: 'EmaRoot',
            emailBlindIndex: 'admin_ema_idx',
            emailEncrypted: 'enc_email',
            mobile: 'enc_mobile',
            passwordHash: 'hashed'
        });

        await CaretakerClinical.collection.insertOne({
            _id: mockClinicalId,
            externalId: mockExternalId,
            streakCount: 0,
            morningAnchor: '08:00',
            timezone: 'Europe/Madrid'
        });

        adminCookie = 'sara_session=' + generateSessionToken(mockAdminId.toString(), 'admin') + '; HttpOnly';

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
        
        // Cierre de seguridad: Libera el Event Loop si quedan hilos huérfanos de red en Node 18+
        setTimeout(() => process.exit(0), 500).unref();
    });

    test('1. POST /admin/ema/generate-token/:id -> Generación de enlace JITAI cifrado', async () => {
        const res = await fetch(`${baseUrl}/admin/ema/generate-token/${mockExternalId}`, {
            method: 'POST',
            headers: { 
                'Cookie': adminCookie,
                'Connection': 'close' 
            }
        });
        
        const text = await res.text();
        assert.strictEqual(res.status, 200, `Rechazo del servidor: ${text}`);
        
        const data = JSON.parse(text);
        assert.ok(data.url, 'Debe devolver la estructura de URL');
        assert.match(data.url, /^\/ema\/r\/eyJ/, 'El enlace debe contener el JWT montado en la ruta correcta');
        
        validEmaToken = data.url.split('/ema/r/')[1];
    });

    test('2. GET /ema/r/:token -> Renderizado Stateless del formulario', async () => {
        assert.ok(validEmaToken, 'Fallo heredado: No se obtuvo el token en el test anterior');
        const res = await fetch(`${baseUrl}/ema/r/${validEmaToken}`, {
            headers: { 'Connection': 'close' }
        });
        
        const html = await res.text();
        assert.strictEqual(res.status, 200, `Fallo en renderizado: Código HTTP ${res.status}`);
        assert.match(html, /Formulario EMA/i, 'Debe renderizar la vista correctamente');
        assert.match(html, new RegExp(validEmaToken), 'Debe inyectar el token en el dataset del DOM');
    });

    test('3. POST /ema/r/:token -> Consumo y persistencia simulada', async () => {
        assert.ok(validEmaToken, 'Fallo heredado: No se obtuvo el token en el test anterior');
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
        assert.ok(validEmaToken, 'Fallo heredado: No se obtuvo el token en el test anterior');
        const res = await fetch(`${baseUrl}/ema/r/${validEmaToken}BADSIGNATURE`, {
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