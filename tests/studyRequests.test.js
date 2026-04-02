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

    test('1. POST /solicitud-acceso -> Ingesta correcta, limpieza E.164 y estado pending', async () => {
        // Simulamos envío de formulario nativo (application/x-www-form-urlencoded)
        const payload = new URLSearchParams({
            alias: 'Cuidador Piloto',
            prefix: '+34',
            phone: '600 123 456', // Simulamos input sucio con espacios
            email: 'piloto@sara.local',
            descripcion: 'Fatiga severa, sin apoyo familiar.'
        });

        const res = await fetch(`${baseUrl}/solicitud-acceso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString(),
            redirect: 'manual'
        });

        assert.strictEqual(res.status, 302, 'Debe interceptar vía SSR y redirigir');
        assert.strictEqual(res.headers.get('location'), '/?status=solicitud_recibida');

        const requestDoc = await StudyRequest.findOne({ alias: 'Cuidador Piloto' });
        
        assert.ok(requestDoc, 'El documento debe persistir en la colección de Cuarentena');
        assert.strictEqual(requestDoc.phone, '600123456', 'Fallo en la limpieza regex para formato API WhatsApp');
        assert.strictEqual(requestDoc.prefix, '+34');
        assert.strictEqual(requestDoc.status, 'pending', 'Vulnerabilidad: El registro no entró aislado');
        assert.strictEqual(requestDoc.priorSeverityWeight, 0.5, 'El peso del Prior Bayesiano inicial no es el base');
    });

    test('2. GET / -> Renderizado SSR del Estado de Homeostasis (ERP)', async () => {
        const res = await fetch(`${baseUrl}/?status=solicitud_recibida`);
        assert.strictEqual(res.status, 200);
        
        const html = await res.text();
        assert.match(html, /¡Solicitud Registrada!/, 'Debe inyectar el feedback de éxito');
        assert.doesNotMatch(html, /name="phone"/, 'Fallo ERP: El formulario sigue renderizándose consumiendo carga visual');
    });
});