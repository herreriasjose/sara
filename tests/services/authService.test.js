const test = require('node:test');
const assert = require('node:assert');
const { generateBlindIndex, hashPassword, verifyPassword } = require('../../src/services/authService');

test('Servicio de Autenticación - Blind Indexing Determinista', (t) => {
    const email = 'investigador@unir.net';
    const index1 = generateBlindIndex(email);
    const index2 = generateBlindIndex('  INVESTIGADOR@unir.net  ');

    assert.strictEqual(index1, index2);
    assert.ok(index1.length === 64);
});

test('Servicio de Autenticación - Derivación Scrypt', (t) => {
    const password = 'password_segura_TFM';
    const hash = hashPassword(password);

    assert.ok(hash.includes(':'));
    assert.strictEqual(verifyPassword(password, hash), true);
    assert.strictEqual(verifyPassword('password_falsa', hash), false);
});