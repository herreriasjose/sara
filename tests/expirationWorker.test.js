// tests/expirationWorker.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const EmaEntry = require('../src/models/EmaEntry');
const { sweepExpiredEntries } = require('../src/services/expirationWorker');
const brainClient = require('../src/services/brainClient');
const { encrypt, decrypt } = require('../src/services/encryptionService');

describe('Cron Worker (ERP): Expiración y Penalización Bayesiana', () => {
    let mockClinicalId;
    let originalBrainClientMock;
    const mockExternalId = 'SARA-WORKER-01';

    before(async () => {
        const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/sara_test_worker_${process.pid}`;
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
        await CaretakerClinical.deleteMany({});
        await EmaEntry.deleteMany({});

        // Mock del motor Bayesiano (evita peticiones HTTP reales al backend Python durante el test)
        originalBrainClientMock = brainClient.getBurnoutPrediction;
        brainClient.getBurnoutPrediction = async (data) => {
            // Verificamos que el worker envía el vector de máximo desgaste
            assert.strictEqual(data.metrics.energy, 1);
            assert.strictEqual(data.metrics.tension, 3);
            assert.strictEqual(data.metrics.clarity, 1);
            
            // Retornamos un colapso simulado (95% de burnout)
            return { posteriorProbability: 0.95 };
        };

        const clinical = await CaretakerClinical.create({
            externalId: mockExternalId,
            streakCount: 5, // Racha actual de 5 interacciones exitosas
            morningAnchor: '08:00',
            timezone: 'Europe/Madrid',
            lastBurnoutProbability: encrypt(0.1), // Probabilidad basal baja (10%)
            patientDisabilityGrade: encrypt('III'),
            caretakerDisabilityGrade: encrypt('II')
        });
        mockClinicalId = clinical._id;
    });

    after(async () => {
        // Restauración del mock y limpieza
        brainClient.getBurnoutPrediction = originalBrainClientMock;
        
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.db.dropDatabase();
            await mongoose.disconnect();
        }
        setTimeout(() => process.exit(0), 500).unref();
    });

    test('1. Ventana Segura: Entradas recientes no deben expirar', async () => {
        // Entrada creada hace solo 1 hora (dentro del límite de 2h)
        const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000);
        
        const entry = await EmaEntry.create({
            patientId: mockClinicalId,
            status: 'pending',
            dispatchedAt: recentDate
        });

        await sweepExpiredEntries();

        const checkEntry = await EmaEntry.findById(entry._id);
        assert.strictEqual(checkEntry.status, 'pending', 'El registro debe mantenerse en pending');
        
        const clinical = await CaretakerClinical.findById(mockClinicalId);
        assert.strictEqual(clinical.streakCount, 5, 'La racha no debe verse afectada');
    });

    test('2. Transición y Colapso (ERP): Entradas > 2 horas deben desencadenar penalización', async () => {
        // Entrada creada hace 3 horas (fuera del límite de 2h)
        const oldDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
        
        const entry = await EmaEntry.create({
            patientId: mockClinicalId,
            status: 'pending',
            dispatchedAt: oldDate
        });

        await sweepExpiredEntries();

        const checkEntry = await EmaEntry.findById(entry._id);
        assert.strictEqual(checkEntry.status, 'expired', 'El estado debe cambiar a expired');

        const clinical = await CaretakerClinical.findById(mockClinicalId);
        assert.strictEqual(clinical.streakCount, 0, 'La racha debe resetearse a 0 debido al colapso alostático');
        
        const updatedProb = Number(decrypt(clinical.lastBurnoutProbability));
        assert.strictEqual(updatedProb, 0.95, 'La probabilidad debe actualizarse al valor inyectado por el motor Bayesiano');
    });
});