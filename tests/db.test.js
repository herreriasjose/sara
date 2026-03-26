// tests\db.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Patient = require('../src/models/Patient');
const EmaEntry = require('../src/models/EmaEntry');

describe('MongoDB Atlas - Ciclo de Vida de la BD (sara_test)', () => {
  
  before(async () => {
    const uri = process.env.MONGO_URI; 
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    }
  });

  describe('Patient Model', () => {
    let savedPatientId;

    it('1. Debe crear un Paciente con externalId anónimo', async () => {
      const patient = new Patient({ 
          externalId: 'USR-2026-TEST-01', 
          consentAccepted: true,
          disabilityGrade: 69
      });
      const savedPatient = await patient.save();
      savedPatientId = savedPatient._id;
      
      assert.ok(savedPatient._id);
      assert.strictEqual(savedPatient.streakCount, 0);
    });

    it('2. Debe actualizar racha y probabilidad burnout', async () => {
      const patient = await Patient.findById(savedPatientId);
      patient.streakCount += 1;
      patient.lastBurnoutProbability = 0.45;
      const updated = await patient.save();
      
      assert.strictEqual(updated.streakCount, 1);
      assert.strictEqual(updated.lastBurnoutProbability, 0.45);
    });
  });

  describe('EmaEntry Model (Alineado con McEwen)', () => {
    let testPatientId;

    before(async () => {
        const p = new Patient({ externalId: 'USR-EMA-FIX', consentAccepted: true });
        const savedP = await p.save();
        testPatientId = savedP._id;
    });

    it('1. Debe registrar entrada con rangos corregidos (1-5, 1-3, 1-3)', async () => {
        const entry = new EmaEntry({
            patientId: testPatientId,
            metrics: { energy: 4, tension: 2, clarity: 3 }, // Valores dentro de rango
            responseTimeMs: 15000 
        });
        const savedEntry = await entry.save();
        assert.ok(savedEntry._id);
        assert.strictEqual(savedEntry.isHighQuality, true);
    });

    it('2. Debe marcar isHighQuality=false si responseTime < 2s', async () => {
        const fastEntry = new EmaEntry({
            patientId: testPatientId,
            metrics: { energy: 3, tension: 1, clarity: 2 },
            responseTimeMs: 500 
        });
        const saved = await fastEntry.save();
        assert.strictEqual(saved.isHighQuality, false, '500ms es demasiado rápido');
    });

    it('3. Debe fallar si los valores exceden los límites de McEwen (Tension > 3)', async () => {
        const entry = new EmaEntry({
            patientId: testPatientId,
            metrics: { energy: 5, tension: 10, clarity: 1 } // Tension 10 ya no es válida
        });
        try {
            await entry.save();
            assert.fail('Debería haber fallado por validación');
        } catch (error) {
            assert.ok(error.errors['metrics.tension']);
        }
    });
  });
});