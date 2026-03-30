// tests\services\encryptionService.test.js

const test = require('node:test');
const assert = require('node:assert');
const { encrypt, decrypt } = require('../../src/services/encryptionService');

test('Servicio de Cifrado - Simetría AES-256-GCM', (t) => {
    const payload = 'dato_clinico_sensible_2027';
    const encrypted = encrypt(payload);

    assert.notStrictEqual(encrypted, payload);
    assert.ok(encrypted.includes(':'));

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, payload);
});

test('Servicio de Cifrado - Integridad de estructuras JSON', (t) => {
    const payload = { role: 'researcher', level: 5, active: true };
    const encrypted = encrypt(payload);
    const decrypted = decrypt(encrypted);

    assert.deepStrictEqual(decrypted, payload);
});

test('Servicio de Cifrado - Resiliencia ante mutaciones', (t) => {
    const invalidHash = 'bad_iv:bad_tag:bad_data';
    const decrypted = decrypt(invalidHash);
    
    assert.strictEqual(decrypted, null);
});