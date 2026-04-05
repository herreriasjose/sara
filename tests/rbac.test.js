// tests/rbac.test.js

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const Researcher = require('../src/models/Researcher');
const { generateBlindIndex, hashPassword, generateSessionToken } = require('../src/services/authService');

describe('Control de Acceso Basado en Roles (RBAC)', () => {
    let server;
    let baseUrl;
    let adminCookie;
    let researcherCookie;

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        server = createServer(app);
        await new Promise((resolve) => {
            server.listen(0, () => {
                baseUrl = `http://localhost:${server.address().port}`;
                resolve();
            });
        });

        const adminId = new mongoose.Types.ObjectId();
        const researcherId = new mongoose.Types.ObjectId();

        const tokenAdmin = generateSessionToken(adminId, 'admin');
        const tokenResearcher = generateSessionToken(researcherId, 'researcher');

        adminCookie = `sara_session=${tokenAdmin}; HttpOnly`;
        researcherCookie = `sara_session=${tokenResearcher}; HttpOnly`;
    });

    after(async () => {
        server.close();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    test('1. Acceso Denegado (401) sin token JWT', async () => {
        const res = await fetch(`${baseUrl}/admin`, {
            headers: { 'Accept': 'application/json' }
        });
        assert.strictEqual(res.status, 401);
    });

    test('2. Investigador -> Acceso permitido a rutas compartidas', async () => {
        const res = await fetch(`${baseUrl}/admin`, {
            headers: { 'Cookie': researcherCookie }
        });
        assert.strictEqual(res.status, 200);
    });

    test('3. Investigador -> Acceso denegado (403) a rutas exclusivas de Admin', async () => {
        const res = await fetch(`${baseUrl}/admin/logs/gateway`, {
            headers: { 'Cookie': researcherCookie, 'Accept': 'application/json' }
        });
        assert.strictEqual(res.status, 403);
        const data = await res.json();
        assert.match(data.error, /Permisos insuficientes/);
    });

    test('4. Administrador -> Acceso total a rutas restrictivas', async () => {
        const res = await fetch(`${baseUrl}/admin/logs/gateway`, {
            headers: { 'Cookie': adminCookie }
        });
        assert.strictEqual(res.status, 200);
    });
});