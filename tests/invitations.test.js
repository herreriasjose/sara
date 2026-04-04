// tests/invitations.test.js

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const app = require('../src/server');
const InvitationCaretakerToken = require('../src/models/InvitationCaretakerToken');
const CaretakerIdentity = require('../src/models/CaretakerIdentity');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const StudyRequest = require('../src/models/StudyRequest');
const { generateSessionToken } = require('../src/services/authService');

let server;
let baseUrl;
let adminCookie;

before(async () => {
    // Aislamiento por PID para evitar condiciones de carrera en test runner concurrente
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/sara_test_${process.pid}`;
    
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
    
    await InvitationCaretakerToken.deleteMany({});
    await CaretakerIdentity.deleteMany({});
    await CaretakerClinical.deleteMany({});
    await StudyRequest.deleteMany({});

    const mockAdminId = new mongoose.Types.ObjectId();
    const tokenAdmin = generateSessionToken(mockAdminId, 'admin');
    adminCookie = `sara_session=${tokenAdmin}; HttpOnly`;

    return new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://localhost:${server.address().port}`;
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

test('Flujo de Bóveda: Invitaciones Contextuales y Triaje', async (t) => {
    let activeToken = '';
    let requestId = '';

    await t.test('1. Configuración: Crear Solicitud de Estudio Cifrada', async () => {
        const doc = await StudyRequest.create({
            alias: 'Candidato Test',
            phone: '600111222',
            descripcion: 'Cuadro de claudicación inminente.'
        });
        requestId = doc._id.toString();
        assert.ok(requestId);
    });

    await t.test('2. POST /admin/invitations/caretaker/:id -> Genera token y actualiza estado a SENT', async () => {
        const res = await fetch(`${baseUrl}/admin/invitations/caretaker/${requestId}`, { 
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        });
        
        assert.strictEqual(res.status, 200);
        
        const data = await res.json();
        assert.ok(data.token);
        activeToken = data.token;
        
        const updatedReq = await StudyRequest.findById(requestId);
        assert.strictEqual(updatedReq.status, 'sent', 'La solicitud no pasó a estado SENT tras generar invitación');
    });

    await t.test('3. GET /register/:tokenId -> Renderiza formulario de alta (Validación OK)', async () => {
        const res = await fetch(`${baseUrl}/register/${activeToken}`);
        assert.strictEqual(res.status, 200);
        
        const html = await res.text();
        assert.ok(html.includes(activeToken), 'El token no está presente en la vista de registro');
    });

    await t.test('4. POST /api/caretakers -> Registro final y destrucción de token', async () => {
        const payload = {
            phoneNumber: '600111222',
            name: 'Candidato Test',
            postalCode: '28001',
            age: 50,
            gender: 'female',
            caretakerDisabilityGrade: 33,
            patientAge: 85,
            patientGender: 'male',
            patientDisabilityGrade: 75,
            relationship: 'child', 
            yearsCaregiving: 10,
            burdenType: 'mixed',  
            hasExternalSupport: 'false',
            consentAccepted: 'true',
            tokenId: activeToken
        };

        const res = await fetch(`${baseUrl}/api/caretakers`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        assert.strictEqual(res.status, 201, 'El registro de API debe retornar 201 Created');
        
        const tokenCheck = await InvitationCaretakerToken.findOne({ token: activeToken });
        assert.strictEqual(tokenCheck, null, 'Fallo de seguridad: El token no fue destruido tras el alta');
    });
});