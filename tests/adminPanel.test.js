// tests/adminPanel.test.js

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const CaretakerIdentity = require('../src/models/CaretakerIdentity');
const Researcher = require('../src/models/Researcher');
const { generateSessionToken } = require('../src/services/authService');

describe('Panel de Administración: RBAC, Trazabilidad y Generación Agnóstica', () => {
    let server;
    let baseUrl;
    let adminCookie;
    let researcherCookie;
    let mockAdminId;
    let mockResearcherId;

    before(async () => {
        const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/sara_test_${process.pid}`;
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
        await CaretakerIdentity.deleteMany({});
        await Researcher.deleteMany({});

        mockAdminId = new mongoose.Types.ObjectId();
        mockResearcherId = new mongoose.Types.ObjectId();

        // Resolución de colapso: Cumplimiento estricto del Schema de Researcher
        await Researcher.insertMany([
            { 
                _id: mockAdminId, 
                role: 'admin', 
                firstName: 'enc_admin',
                lastName: 'enc_admin',
                alias: 'AdminRoot',
                emailBlindIndex: 'admin_idx',
                emailEncrypted: 'enc_email',
                mobile: 'enc_mobile',
                passwordHash: 'hashed_pwd_dummy'
            },
            { 
                _id: mockResearcherId, 
                role: 'researcher', 
                firstName: 'enc_res',
                lastName: 'enc_res',
                alias: 'ResWorker',
                emailBlindIndex: 'res_idx',
                emailEncrypted: 'enc_email',
                mobile: 'enc_mobile',
                passwordHash: 'hashed_pwd_dummy'
            }
        ]);

        adminCookie = 'sara_session=' + generateSessionToken(mockAdminId.toString(), 'admin') + '; HttpOnly';
        researcherCookie = 'sara_session=' + generateSessionToken(mockResearcherId.toString(), 'researcher') + '; HttpOnly';

        server = createServer(app);
        await new Promise((resolve) => {
            server.listen(0, () => {
                baseUrl = 'http://localhost:' + server.address().port;
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


    test('1. Aislamiento RBAC -> Poblar BD con identidades segregadas', async () => {
        await CaretakerIdentity.insertMany([
            {
                externalId: 'SARA-ADMIN-1',
                phoneReal: 'enc_phone',
                name: 'enc_name',
                postalCode: 'enc_pc',
                consentAccepted: true,
                registeredTo: mockAdminId
            },
            {
                externalId: 'SARA-RES-1',
                phoneReal: 'enc_phone2',
                name: 'enc_name2',
                postalCode: 'enc_pc2',
                consentAccepted: true,
                registeredTo: mockResearcherId
            }
        ]);
        
        const count = await CaretakerIdentity.countDocuments();
        assert.strictEqual(count, 2, 'La BD debe contener ambos registros');
    });

    test('2. GET /admin -> Admin visualiza el pool global (Ignora segregación)', async () => {
        const res = await fetch(baseUrl + '/admin', {
            headers: { 'Cookie': adminCookie }
        });
        
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        
        const matchesActive = html.match(/MONITORIZACIÓN ACTIVA/g) || [];
        assert.strictEqual(matchesActive.length, 2, 'El perfil admin debe renderizar todos los cuidadores de la colección');
    });

    test('3. GET /admin -> Investigador visualiza el pool global de cuidadores (Reducción de complejidad)', async () => {
        const res = await fetch(baseUrl + '/admin', {
            headers: { 'Cookie': researcherCookie }
        });
        
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        
        const matchesActive = html.match(/MONITORIZACIÓN ACTIVA/g) || [];
        // Cambiamos la aserción de 1 a 2
        assert.strictEqual(matchesActive.length, 2, 'El perfil researcher ahora debe renderizar la totalidad de cuidadores de la colección');
    });
});