// tests/invitations.test.js

const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const app = require('../src/server');
const InvitationCaretakerToken = require('../src/models/InvitationCaretakerToken');
const CaretakerIdentity = require('../src/models/CaretakerIdentity');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const { generateSessionToken } = require('../src/services/authService');

let server;
let baseUrl;
let adminCookie;

test.before(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sara_test';
    
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
    
    await InvitationCaretakerToken.deleteMany({});
    await CaretakerIdentity.deleteMany({});
    await CaretakerClinical.deleteMany({});

    // Generamos credencial efímera de administrador para sortear el RBAC
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

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    server.close();
});

test('Flujo de Bóveda: Invitaciones Efímeras y Consumo de Token', async (t) => {
    let activeToken = '';

    await t.test('1. POST /admin/invitations -> Genera token criptográfico y persiste en BD', async () => {
        const res = await fetch(`${baseUrl}/admin/invitations`, { 
            method: 'POST',
            headers: { 'Cookie': adminCookie } // Inyección de sesión Stateless
        });
        assert.strictEqual(res.status, 201);
        
        const data = await res.json();
        assert.ok(data.token, 'Falta el token en la respuesta');
        assert.ok(data.url.includes(data.token), 'La URL devuelta no contiene el token');
        
        activeToken = data.token;
        
        const tokenDoc = await InvitationCaretakerToken.findOne({ token: activeToken });
        assert.ok(tokenDoc, 'El token no se ha insertado en MongoDB');
    });

    await t.test('2. GET /register/:tokenId -> Renderiza vista inyectando el token (Validación OK)', async () => {
        const res = await fetch(`${baseUrl}/register/${activeToken}`);
        assert.strictEqual(res.status, 200);
        
        const html = await res.text();
        assert.ok(html.includes(`value="${activeToken}"`), 'El token no está inyectado en el input hidden del formulario');
    });

    await t.test('3. GET /register/:tokenId -> Deniega acceso con token caducado o inexistente', async () => {
        const res = await fetch(`${baseUrl}/register/token-invalido-sha256`);
        assert.strictEqual(res.status, 403);
    });

    await t.test('4. POST /api/caretakers -> Destruye el token tras instanciar la Bóveda (Consumo)', async () => {
        const payload = {
            phoneNumber: '+34600000001',
            name: 'Sujeto Pruebas',
            postalCode: '28001',
            age: 45,
            gender: 'female',
            caretakerDisabilityGrade: 0,
            patientAge: 80,
            patientGender: 'male',
            patientDisabilityGrade: 75,
            relationship: 'child',
            yearsCaregiving: 5,
            burdenType: 'mixed',
            hasExternalSupport: 'false',
            consentAccepted: 'true',
            tokenId: activeToken
        };

        const res = await fetch(`${baseUrl}/api/caretakers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });

        assert.strictEqual(res.status, 201);
        
        // Validación crítica de seguridad (Consumo del token de un solo uso)
        const tokenDoc = await InvitationCaretakerToken.findOne({ token: activeToken });
        assert.strictEqual(tokenDoc, null, 'Fallo de seguridad: El token no fue destruido tras su uso.');
    });
});