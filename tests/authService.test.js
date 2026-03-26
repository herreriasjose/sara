// tests\authService.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const authService = require('../src/services/authService');

describe('Servicio de Autenticación (Tokens Efímeros)', () => {
  const mockPatientId = '65f1a2b3c4d5e6f7a8b9c0d1';

  it('Debe generar un token en formato base64url', () => {
    const token = authService.generateEmaToken(mockPatientId);
    assert.ok(token);
    assert.strictEqual(typeof token, 'string');
    
    // Corregido: [a-zA-Z0-9_-] para permitir todos los números
    assert.match(token, /^[a-zA-Z0-9_-]+$/, 'El token debe ser URL-safe');
  });

  it('Debe verificar un token válido y recuperar el patientId original', () => {
    const token = authService.generateEmaToken(mockPatientId);
    const recoveredId = authService.verifyEmaToken(token);
    assert.strictEqual(recoveredId, mockPatientId);
  });

  it('Debe retornar null si el token ha sido manipulado', () => {
    const token = authService.generateEmaToken(mockPatientId);
    const tamperedToken = token.substring(0, token.length - 5) + 'xxxxx';
    const result = authService.verifyEmaToken(tamperedToken);
    assert.strictEqual(result, null);
  });

  it('Debe fallar ante un token con formato inválido', () => {
    const result = authService.verifyEmaToken('token-completamente-falso');
    assert.strictEqual(result, null);
  });
});