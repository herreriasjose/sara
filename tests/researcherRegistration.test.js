const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const app = require('../src/server');
const InvitationResearcherToken = require('../src/models/InvitationResearcherToken');
const Researcher = require('../src/models/Researcher');

test('Flujo de Bóveda Investigador (Integración)', async (t) => {
    let server;
    let baseUrl;

    t.before(async () => {
        // Aprovecha la conexión existente si el server.js ya la levantó, 
        // o inicializa una nueva resolviendo el nombre correcto de la variable.
        if (mongoose.connection.readyState === 0) {
            const dbUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
            await mongoose.connect(dbUri);
        }
        
        server = app.listen(0);
        baseUrl = `http://localhost:${server.address().port}`;
    });

    t.after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        server.close();
    });

    await t.test('Consumo atómico de token y segregación criptográfica', async () => {
        const tokenDoc = await InvitationResearcherToken.create({ role: 'admin' });

        const payload = {
            firstName: 'Jose',
            lastName: 'Herrerias',
            alias: 'Dr. H',
            email: 'admin@sara.local',
            mobile: '+34600000000',
            password: 'secure_password_2027'
        };

        const response = await fetch(`${baseUrl}/api/researchers/register/${tokenDoc.token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        assert.strictEqual(response.status, 201);

        const tokenExists = await InvitationResearcherToken.findById(tokenDoc._id);
        assert.strictEqual(tokenExists, null);

        const researcher = await Researcher.findOne({ alias: 'Dr. H' });
        assert.ok(researcher);
        assert.notStrictEqual(researcher.emailEncrypted, payload.email);
        assert.notStrictEqual(researcher.mobile, payload.mobile);
        assert.strictEqual(researcher.role, 'admin');
    });

    await t.test('Rechazo de tokens consumidos o inválidos', async () => {
        const response = await fetch(`${baseUrl}/api/researchers/register/token_fantasma_123`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        assert.strictEqual(response.status, 403);
    });
});