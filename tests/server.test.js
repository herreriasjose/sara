const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { createServer } = require('node:http');
const app = require('../server');

describe('Suite de Pruebas: server.js', () => {
    let server;
    let baseUrl;

    // Configuración antes de los tests: Puerto dinámico para evitar conflictos
    before(() => {
        server = createServer(app);
        server.listen(0);
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
    });

    // Limpieza después de los tests: Liberar el puerto
    after(() => server.close());

    test('GET / debe retornar Status 200', async () => {
        const response = await fetch(`${baseUrl}/`);
        assert.strictEqual(response.status, 200);
    });

    test('Debe servir contenido HTML con el nombre del proyecto', async () => {
        const response = await fetch(`${baseUrl}/`);
        const html = await response.text();
        assert.ok(html.includes('SARA'), 'El HTML debe contener la palabra SARA');
        assert.ok(html.includes('<!DOCTYPE html>'), 'Debe ser un documento HTML válido');
    });

    test('GET a ruta inexistente debe retornar Status 404', async () => {
        const response = await fetch(`${baseUrl}/ruta-que-no-existe`);
        assert.strictEqual(response.status, 404);
    });
});