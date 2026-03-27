const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { createServer } = require('node:http');
const mongoose = require('mongoose'); // Importación necesaria
const app = require('../src/server'); 

describe('Suite de Pruebas: Disponibilidad de SARA (MVP)', () => {
    let server;
    let baseUrl;

    before(async () => {
        // 1. Aseguramos conexión a la DB de TEST antes de levantar el server
        // Esto garantiza que los modelos de 'Caretaker' y 'EmaEntry' estén listos
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }

        // 2. Servidor en puerto dinámico
        server = createServer(app);
        return new Promise((resolve) => {
            server.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://localhost:${port}`;
                resolve();
            });
        });
    });

    // Limpieza total: Server + DB
    after(async () => {
        server.close();
        if (process.env.NODE_ENV === 'test') {
            // Borrado preventivo para mantener el "huerto" limpio para el Doctorado 2027
            await mongoose.connection.db.dropDatabase();
            await mongoose.disconnect();
        }
    });

    test('GET / debe retornar Status 200 y cargar el Dashboard', async () => {
        const response = await fetch(`${baseUrl}/`);
        assert.strictEqual(response.status, 200);
    });

    test('Debe identificar la marca SARA en el frontend', async () => {
        const response = await fetch(`${baseUrl}/`);
        const html = await response.text();
        // Verificamos que el EJS esté renderizando correctamente el nombre del sistema
        assert.match(html, /SARA/i, 'El HTML debe contener la palabra SARA');
        assert.ok(html.includes('<!DOCTYPE html>'), 'Debe ser un documento HTML5 válido');
    });

    test('Manejo de errores: Ruta inexistente (404)', async () => {
        const response = await fetch(`${baseUrl}/api/v1/invalid-route`);
        assert.strictEqual(response.status, 404);
    });
});