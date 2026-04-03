// tests\studyRequests.test.js

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const app = require('../src/server');
const StudyRequest = require('../src/models/StudyRequest');

describe('Flujo de Captación: Gateway y Cuarentena de Datos (StudyRequests)', () => {
    let server;
    let baseUrl;

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        await StudyRequest.deleteMany({});
        
        server = createServer(app);
        await new Promise((resolve) => {
            server.listen(0, () => {
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

    test('1. POST /solicitud-acceso -> Ingesta cifrada, limpieza E.164 y estado pending', async () => {
        const payload = new URLSearchParams({
            alias: 'Cuidador Piloto',
            prefix: '+34',
            phone: '600 123 456',
            email: 'piloto@sara.local',
            descripcion: 'Fatiga severa, sin apoyo familiar.'
        });

        const res = await fetch(`${baseUrl}/solicitud-acceso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString(),
            redirect: 'manual'
        });

        assert.strictEqual(res.status, 302);

        const rawDoc = await mongoose.connection.db.collection('studyrequests').findOne();
        assert.ok(rawDoc.phone.includes(':'), 'Fuga detectada: Teléfono en texto plano en la BBDD');
        assert.ok(rawDoc.alias.includes(':'), 'Fuga detectada: Alias en texto plano en la BBDD');

        const requestDoc = await StudyRequest.findOne();
        assert.strictEqual(requestDoc.phone, '600123456', 'Fallo en descifrado o sanitización regex');
        assert.strictEqual(requestDoc.alias, 'Cuidador Piloto', 'Fallo en descifrado del alias');
        assert.strictEqual(requestDoc.priorSeverityWeight, 0.5, 'Prior Bayesiano inicial alterado');
    });

    test('2. GET / -> Renderizado SSR del Estado de Homeostasis (ERP)', async () => {
        const res = await fetch(`${baseUrl}/?status=solicitud_recibida`);
        assert.strictEqual(res.status, 200);
        
        const html = await res.text();
        assert.match(html, /¡Solicitud Registrada!/);
        assert.doesNotMatch(html, /name="phone"/);
    });
});