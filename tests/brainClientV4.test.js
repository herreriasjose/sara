// tests/brainClientV4.test.js
const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const brainClient = require('../src/services/brainClient');

describe('BrainClient V4: Validación de Contrato Bayesiano', () => {
  
  it('Debe enviar el payload completo (ExternalId + BayesianState)', async () => {
    let capturedPayload = null;

    mock.method(global, 'fetch', (url, options) => {
      capturedPayload = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ probability: 0.42, alpha: 1.2, beta: 1.1, status: 'stable' })
      });
    });

    const fullData = {
        external_id: 'SARA-HASH-XYZ',
        energy: 4,
        latencies: { attention_ms: 5000, resolution_ms: 10000, is_high_quality: true },
        bayesian_state: { alpha: 1.0, beta: 1.0, prior_probability: 0.5 }
    };

    await brainClient.getBurnoutPrediction(fullData);

    assert.strictEqual(capturedPayload.external_id, 'SARA-HASH-XYZ');
    assert.strictEqual(capturedPayload.bayesian_state.alpha, 1.0);
    assert.ok(capturedPayload.latencies.is_high_quality);
  });
});