// tests/authService.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const authService = require('../src/services/authService');

describe('Servicio de Autenticación (Tokens Efímeros)', () => {
  const mockCaretakerId = '65f1a2b3c4d5e6f7a8b9c0d1';

  it('Debe generar un token en formato JWT (tres segmentos)', () => {
    const token = authService.generateEmaToken(mockCaretakerId);
    assert.ok(token);
    assert.strictEqual(typeof token, 'string');
    
    // Validación de estructura JWT estándar (Header.Payload.Signature) URL-Safe
    assert.match(token, /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/, 'El token debe tener formato JWT');
  });

  it('Debe verificar un token válido y recuperar el clinicalId original', () => {
    const token = authService.generateEmaToken(mockCaretakerId);
    const payload = authService.verifyEmaToken(token);
    
    assert.ok(payload);
    assert.strictEqual(payload.clinicalId, mockCaretakerId);
    assert.strictEqual(payload.isSimulated, false); // Valor por defecto instanciado en el generador
  });

  it('Debe retornar null si el token ha sido manipulado', () => {
    const token = authService.generateEmaToken(mockCaretakerId);
    const tamperedToken = token.substring(0, token.length - 5) + 'xxxxx';
    const result = authService.verifyEmaToken(tamperedToken);
    assert.strictEqual(result, null);
  });

  it('Debe fallar ante un token con formato inválido', () => {
    const result = authService.verifyEmaToken('token.completamente.falso');
    assert.strictEqual(result, null);
  });
});