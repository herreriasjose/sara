// tests/emaSimulation.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const CaretakerIdentity = require('../src/models/CaretakerIdentity');
const EmaEntry = require('../src/models/EmaEntry');
const authService = require('../src/services/authService');
const { encrypt } = require('../src/services/encryptionService');

describe('Simulación JITAI y ERP: Desplazamiento Circadiano y Bóveda Segregada', () => {
    let server;
    let baseUrl;
    let mockClinicalId;
    const mockExternalId = 'SARA-SIM-ERP-01';
    const anchorHour = 7;
    const anchorMinute = 30;
  
    let adminAuthCookie = ''; 

    before(async () => {
        const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/sara_test_${process.pid}`;
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
        await CaretakerClinical.deleteMany({});
        await CaretakerIdentity.deleteMany({});
        await EmaEntry.deleteMany({});

        mockClinicalId = new mongoose.Types.ObjectId();

        await CaretakerClinical.collection.insertOne({
            _id: mockClinicalId,
            externalId: mockExternalId,
            streakCount: 0,
            morningAnchor: '07:30',
            timezone: 'Europe/Madrid',
            lastBurnoutProbability: encrypt(0.1)
        });

        server = createServer(app);
        await new Promise((resolve) => {
            server.listen(0, () => {
                baseUrl = `http://localhost:${server.address().port}`;
                resolve();
            });
        });

        const mockAdminId = new mongoose.Types.ObjectId();
        const adminToken = authService.generateSessionToken(mockAdminId.toString(), 'admin');
        adminAuthCookie = `sara_session=${adminToken}`;
    });

    after(async () => {
        if (server && server.closeAllConnections) server.closeAllConnections(); 
        if (server) server.close();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.db.dropDatabase();
            await mongoose.disconnect();
        }
        setTimeout(() => process.exit(0), 500).unref();
    });

    const triggerSimulation = async () => {
        const res = await fetch(`${baseUrl}/admin/ema/generate-token/${mockExternalId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': adminAuthCookie, 
                'X-Test-Bypass-Auth': 'admin' 
            }
        });
        
        const responseText = await res.text();
        assert.strictEqual(res.status, 200, `Rechazo del servidor: ${responseText}`);
        return JSON.parse(responseText);
    };

    test('1. Primer Turno (Ancla Matutina): dispatchedAt = 07:30 de hoy', async () => {
        await triggerSimulation();
        
        const entry = await EmaEntry.findOne({ patientId: mockClinicalId }).sort({ dispatchedAt: -1 });
        assert.ok(entry, 'Debe crear el registro');
        
        const dispatched = new Date(entry.dispatchedAt);
        assert.strictEqual(dispatched.getHours(), anchorHour, 'Hora debe coincidir con el ancla');
        assert.strictEqual(dispatched.getMinutes(), anchorMinute, 'Minutos deben coincidir con el ancla');
    });

    test('2. Segundo Turno (Mediodía): dispatchedAt = 13:30 de hoy (+6h)', async () => {
        await triggerSimulation();
        
        const entry = await EmaEntry.findOne({ patientId: mockClinicalId }).sort({ dispatchedAt: -1 });
        const dispatched = new Date(entry.dispatchedAt);
        
        assert.strictEqual(dispatched.getHours(), anchorHour + 6, 'Debe sumar 6 horas al ancla matutina');
        assert.strictEqual(dispatched.getMinutes(), anchorMinute);
    });

    test('3. Tercer Turno (Noche): dispatchedAt = 19:30 de hoy (+12h)', async () => {
        await triggerSimulation();
        
        const entry = await EmaEntry.findOne({ patientId: mockClinicalId }).sort({ dispatchedAt: -1 });
        const dispatched = new Date(entry.dispatchedAt);
        
        assert.strictEqual(dispatched.getHours(), anchorHour + 12, 'Debe sumar 12 horas al ancla matutina');
        assert.strictEqual(dispatched.getMinutes(), anchorMinute);
    });

    test('4. Cuarto Turno (Reinicio Circadiano): dispatchedAt = 07:30 de mañana (+24h)', async () => {
        const prevEntry = await EmaEntry.findOne({ patientId: mockClinicalId }).sort({ dispatchedAt: -1 });
        const prevDate = new Date(prevEntry.dispatchedAt).getDate();

        await triggerSimulation();
        
        const currentEntry = await EmaEntry.findOne({ patientId: mockClinicalId }).sort({ dispatchedAt: -1 });
        const currentDispatched = new Date(currentEntry.dispatchedAt);
        
        const expectedNextDay = new Date(prevEntry.dispatchedAt);
        expectedNextDay.setDate(expectedNextDay.getDate() + 1);
        
        assert.strictEqual(currentDispatched.getDate(), expectedNextDay.getDate(), 'Debe saltar al día siguiente tras el tercer turno');
        assert.strictEqual(currentDispatched.getHours(), anchorHour, 'Debe resetearse a la hora del ancla');
        assert.strictEqual(currentDispatched.getMinutes(), anchorMinute, 'Debe resetearse a los minutos del ancla');
    });

    test('5. Segregación de Bóvedas (Vault): Fusión en caliente del Sandbox para cohorte de control', async () => {
        await CaretakerIdentity.collection.insertOne({
            externalId: mockExternalId,
            isSubjectOfTest: true
        });

        const res = await fetch(`${baseUrl}/ema/status/${mockExternalId}`, {
            headers: { 'Cookie': adminAuthCookie }
        });
        const html = await res.text();

        assert.strictEqual(res.status, 200);
        // Aserción fuerte: validamos la presencia del ID funcional en el DOM en lugar de textos estéticos
        assert.match(html, /id="btn-simulate-ema"/);
        assert.match(html, /data-endpoint="\/admin\/ema\/generate-token"/);
    });

    test('6. Privacidad por Diseño (Control de Calidad ERP): Ocultación del Sandbox en cohorte clínica real', async () => {
        await CaretakerIdentity.updateOne(
            { externalId: mockExternalId },
            { $set: { isSubjectOfTest: false } }
        );

        const res = await fetch(`${baseUrl}/ema/status/${mockExternalId}`, {
            headers: { 'Cookie': adminAuthCookie }
        });
        const html = await res.text();

        assert.strictEqual(res.status, 200);
        // Aserción fuerte negativa: confirmamos la ausencia absoluta del botón interactivo
        assert.doesNotMatch(html, /id="btn-simulate-ema"/);
    });
});