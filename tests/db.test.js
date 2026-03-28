// tests/db.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Caretaker = require('../src/models/Caretaker');
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

  describe('Caretaker Model', () => {
    let savedCaretakerId;

    it('1. Debe crear un Cuidador con datos completos', async () => {
      const caretaker = new Caretaker({ 
          externalId: 'SARA-TEST-DB-01', 
          phoneReal: '+34600000000', // NUEVO CAMPO REQUERIDO
          name: 'Cuidador de Prueba DB',
          consentAccepted: true,
          caretakerDisabilityGrade: 69,
          patientDisabilityGrade: 80
      });
      const savedCaretaker = await caretaker.save();
      savedCaretakerId = savedCaretaker._id;
      
      assert.ok(savedCaretaker._id);
      assert.strictEqual(savedCaretaker.name, 'Cuidador de Prueba DB');
      assert.strictEqual(savedCaretaker.phoneReal, '+34600000000');
    });

    it('2. Debe actualizar racha y probabilidad burnout', async () => {
      const caretaker = await Caretaker.findById(savedCaretakerId);
      assert.notStrictEqual(caretaker, null, 'El cuidador debe existir en la BD');
      
      caretaker.streakCount += 1;
      caretaker.lastBurnoutProbability = 0.45;
      const updated = await caretaker.save();
      
      assert.strictEqual(updated.streakCount, 1);
      assert.strictEqual(updated.lastBurnoutProbability, 0.45);
    });
  });

  describe('EmaEntry Model (Alineado con McEwen)', () => {
    let testCaretakerId;

    before(async () => {
        const c = new Caretaker({ 
            externalId: 'SARA-EMA-FIX', 
            phoneReal: '+34611111111', // NUEVO CAMPO REQUERIDO
            name: 'Caretaker EMA Test',
            consentAccepted: true 
        });
        const savedC = await c.save();
        testCaretakerId = savedC._id;
    });

    it('1. Debe registrar entrada con rangos corregidos (1-5, 1-3, 1-3)', async () => {
        const entry = new EmaEntry({
            patientId: testCaretakerId,
            metrics: { energy: 4, tension: 2, clarity: 3 },
            responseTimeMs: 15000 
        });
        const savedEntry = await entry.save();
        assert.ok(savedEntry._id);
        assert.strictEqual(savedEntry.isHighQuality, true);
    });

    it('2. Debe marcar isHighQuality=false si responseTime < 2s', async () => {
        const fastEntry = new EmaEntry({
            patientId: testCaretakerId,
            metrics: { energy: 3, tension: 1, clarity: 2 },
            responseTimeMs: 500 
        });
        const saved = await fastEntry.save();
        assert.strictEqual(saved.isHighQuality, false);
    });

    it('3. Debe fallar si los valores exceden los límites de McEwen (Tension > 3)', async () => {
        const entry = new EmaEntry({
            patientId: testCaretakerId,
            metrics: { energy: 5, tension: 10, clarity: 1 }
        });
        try {
            await entry.save();
            assert.fail('Debería haber fallado por validación de rango');
        } catch (error) {
            assert.ok(error.errors['metrics.tension']);
        }
    });
  });
});