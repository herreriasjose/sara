// tests/api.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const authService = require('../src/services/authService'); // Inyectamos generador de tokens

describe('API Endpoints (Sincronización SARA)', () => {
    let server;
    let baseUrl;
    let generatedInternalId;
    let generatedClinicalObjectId; // Necesario para el JWT
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

    test('1. POST /caretakers -> Registro exitoso y separación de Bóvedas', async () => {
        const res = await fetch(`${baseUrl}/caretakers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
                caretakerDisabilityGrade: 69,
                burdenType: 'mixed',
                hasExternalSupport: true,
                consentAccepted: true,
                morningAnchor: '07:15',
                timezone: 'Atlantic/Canary'
            }),
            redirect: 'manual' 
        });
        
        assert.strictEqual(res.status, 201);
        const data = await res.json();
        
        assert.ok(data.data.id, 'Debe devolver el id (externalId)');
        assert.match(data.data.id, /^SARA-[A-F0-9]{12}$/, 'Formato SARA-Hash opaco');
        generatedInternalId = data.data.id;
    });

    test('1.5 Validación de Bóveda Clínica -> Parámetros ERP y Bayes inicializados', async () => {
        assert.ok(generatedInternalId, 'Dependencia de test anterior no satisfecha');
        
        const clinicalDoc = await CaretakerClinical.findOne({ externalId: generatedInternalId });
        assert.ok(clinicalDoc, 'El documento clínico debe existir en BBDD');
        
        generatedClinicalObjectId = clinicalDoc._id.toString(); // Capturamos el _id para el token EMA

        assert.strictEqual(clinicalDoc.morningAnchor, '07:15', 'Fallo en persistencia del Ancla Matutina');
        assert.strictEqual(clinicalDoc.timezone, 'Atlantic/Canary', 'Fallo en persistencia de Zona Horaria');
        assert.strictEqual(clinicalDoc.bayesianParams.alpha, 1, 'El Prior de Homeostasis (alpha) debe ser 1');
        assert.strictEqual(clinicalDoc.bayesianParams.beta, 1, 'El Prior de Claudicación (beta) debe ser 1');
        assert.strictEqual(clinicalDoc.bayesianParams.lastEnergyBaseline, null, 'El Baseline debe requerir calibración inicial');
    });

    test('2. POST /ema/r/:token -> Guardado con métricas de ultra-baja fricción', async () => {
        assert.ok(generatedClinicalObjectId);

        // Generamos el Magic Link tokenizado tal como haría el cron de WhatsApp
        const token = authService.generateEmaToken(generatedClinicalObjectId);

        // Atacamos el endpoint unificado pasándole el token en la URL (No usamos baseUrl porque esta ruta cuelga de /ema, no de /api)
        const hostUrl = `http://localhost:${server.address().port}`;
        
        const res = await fetch(`${hostUrl}/ema/r/${token}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                energy: 4,
                tension: 2,
                clarity: 3,
                responseTimeMs: 12000
            })
        });
        
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, 'success');
        assert.strictEqual(data.blindAck, true);
    });

    test('3. GET /api/caretakers -> Recuperación y descifrado al vuelo (Audit Trail)', async () => {
        const res = await fetch(`${baseUrl}/caretakers`, {
            headers: { 'x-api-key': API_KEY }
        });
        
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        
        assert.strictEqual(data.status, 'success');
        assert.ok(data.data.length > 0, 'Debe retornar al menos un cuidador');
        
        const testUser = data.data.find(u => u.externalId === generatedInternalId);
        assert.ok(testUser, 'El usuario recién creado debe existir');
        assert.strictEqual(testUser.name, 'Jose Test API', 'El descifrado GCM del nombre falló');
        assert.strictEqual(testUser.phoneReal, testPhoneNumber, 'El descifrado GCM del teléfono falló');
    });

    test('4. DELETE /api/caretakers/:id -> Derecho al Olvido (Anonimización Irreversible)', async () => {
        const res = await fetch(`${baseUrl}/caretakers/${generatedInternalId}`, {
            method: 'DELETE',
            headers: { 'x-api-key': API_KEY }
        });
        
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, 'success');

        const verifyRes = await fetch(`${baseUrl}/caretakers`, { headers: { 'x-api-key': API_KEY } });
        const verifyData = await verifyRes.json();
        const deletedUser = verifyData.data.find(u => u.externalId === generatedInternalId);
        
        assert.strictEqual(deletedUser, undefined, 'La identidad debe haber sido purgada de la bóveda');
    });
});