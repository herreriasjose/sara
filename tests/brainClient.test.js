// tests\brainClient.test.js

const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const brainClient = require('../src/services/brainClient');

describe('Cliente de Comunicación SARA-Brain (FastAPI)', () => {
  
  it('Debe procesar correctamente una predicción exitosa', async () => {
    // Simulamos una respuesta exitosa del motor de Python
    const mockResponse = { probability: 0.65 };
    
    mock.method(global, 'fetch', () => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
    });

    const metrics = { energy: 4, tension: 2, clarity: 3 };
    const result = await brainClient.getBurnoutPrediction(metrics);

    assert.strictEqual(result.probability, 0.65);
    assert.ok(result.probability > 0);
  });

  it('Debe gestionar el fallo del servidor de Python de forma resiliente', async () => {
    // Simulamos que FastAPI está caído o devuelve error 500
    mock.method(global, 'fetch', () => {
      return Promise.resolve({ ok: false });
    });

    const metrics = { energy: 1, tension: 3, clarity: 1 };
    const result = await brainClient.getBurnoutPrediction(metrics);

    // El sistema no debe romperse; devuelve null para que el Gateway maneje el fallback
    assert.strictEqual(result, null);
  });
});