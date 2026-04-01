// tests/sessionAuth.test.js

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const Researcher = require('../src/models/Researcher');
const { generateBlindIndex, hashPassword } = require('../src/services/authService');

describe('Autenticación Stateless (JWT y Cookies)', () => {
    let server;
    let baseUrl;
    const testEmail = 'jwt_test@sara.local';
    const testPassword = 'pwd_alostatica_2027';

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

        await Researcher.create({
            firstName: 'Test',
            lastName: 'JWT',
            alias: 'Tester',
            emailBlindIndex: generateBlindIndex(testEmail),
            emailEncrypted: 'encrypted',
            mobile: 'encrypted',
            passwordHash: hashPassword(testPassword),
            role: 'researcher'
        });
    });

    after(async () => {
        await Researcher.deleteOne({ emailBlindIndex: generateBlindIndex(testEmail) });
        server.close();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    test('1. POST /login -> Emisión de Cookie HttpOnly (Credenciales Válidas)', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: testPassword }),
            redirect: 'manual'
        });
        
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, 'success');
        
        const cookies = res.headers.get('set-cookie');
        assert.ok(cookies, 'Debe inyectar la cabecera set-cookie');
        assert.match(cookies, /sara_session=/, 'Debe contener el JWT');
        assert.match(cookies, /HttpOnly/, 'Debe prevenir XSS');
    });

    test('2. POST /login -> Rechazo (Credenciales Inválidas)', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: 'wrong_password' })
        });
        
        assert.strictEqual(res.status, 401);
    });

    test('3. POST /logout -> Revocación de Estado (Limpieza de Cookie)', async () => {
        const res = await fetch(`${baseUrl}/logout`, {
            method: 'POST',
            redirect: 'manual'
        });
        
        assert.strictEqual(res.status, 302);
        const cookies = res.headers.get('set-cookie');
        assert.ok(cookies);
        assert.match(cookies, /sara_session=;/, 'Debe vaciar el contenido de la cookie');
        assert.match(cookies, /Expires=Thu, 01 Jan 1970/, 'Debe forzar la expiración en el navegador');
    });
});