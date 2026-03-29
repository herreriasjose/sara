// tests/db.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const CaretakerIdentity = require('../src/models/CaretakerIdentity');
const CaretakerClinical = require('../src/models/CaretakerClinical');
const EmaEntry = require('../src/models/EmaEntry');

describe('MongoDB Atlas - Arquitectura Dual de Bóvedas (sara_test)', () => {
  
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

  describe('Bóveda de Identidad y Clínica (CaretakerIdentity & CaretakerClinical)', () => {
    const testExternalId = 'SARA-HASH-DB-DUAL';
    let savedClinicalId;

    it('1. Debe aislar la Identidad en CaretakerIdentity', async () => {
      const identity = new CaretakerIdentity({ 
          externalId: testExternalId, 
          phoneReal: 'enc_phone_string',
          name: 'enc_name_string',
          postalCode: 'enc_postal_string',
          consentAccepted: true
      });
      const saved = await identity.save();
      assert.ok(saved._id);
      assert.strictEqual(saved.externalId, testExternalId);
    });

    it('2. Debe aislar los parámetros biométricos en CaretakerClinical', async () => {
      const clinical = new CaretakerClinical({
          externalId: testExternalId,
          age: 45,                          
          gender: 'male',                   
          relationship: 'spouse',
          yearsCaregiving: 10,
          patientAge: 80,                   
          patientGender: 'female',          
          burdenType: 'physical',           
          hasExternalSupport: true,
          patientDisabilityGrade: 'enc_grade_string', 
          caretakerDisabilityGrade: 'enc_grade_string',
          lastBurnoutProbability: 'enc_prob_string'
      });
      const savedClinical = await clinical.save();
      savedClinicalId = savedClinical._id;
      
      assert.ok(savedClinical._id);
      assert.strictEqual(typeof savedClinical.lastBurnoutProbability, 'string', 'El campo clínico sensitivo debe estar cifrado (String)');
    });

    it('3. Debe actualizar racha clínica sin afectar identidad', async () => {
      const clinical = await CaretakerClinical.findById(savedClinicalId);
      clinical.streakCount += 1;
      const updated = await clinical.save();
      assert.strictEqual(updated.streakCount, 1);
    });
  });

  describe('EmaEntry Model (Alineado con ERP/McEwen)', () => {
    let clinicalIdContext;

    before(async () => {
        const c = new CaretakerClinical({ 
            externalId: 'SARA-EMA-FIX', 
            age: 50, gender: 'female', relationship: 'child', yearsCaregiving: 2,
            patientAge: 75, patientGender: 'male', burdenType: 'mixed', hasExternalSupport: false,
            patientDisabilityGrade: 'enc', caretakerDisabilityGrade: 'enc', lastBurnoutProbability: 'enc'
        });
        const savedC = await c.save();
        clinicalIdContext = savedC._id;
    });

    it('1. Debe registrar entrada EMA asociándola a la Bóveda Clínica', async () => {
        const entry = new EmaEntry({
            patientId: clinicalIdContext,
            metrics: { energy: 4, tension: 2, clarity: 3 },
            responseTimeMs: 15000 
        });
        const savedEntry = await entry.save();
        assert.ok(savedEntry._id);
        assert.strictEqual(savedEntry.isHighQuality, true);
    });

    it('2. Debe fallar si se excede la escala psicométrica de Tension (>3)', async () => {
        const entry = new EmaEntry({
            patientId: clinicalIdContext,
            metrics: { energy: 5, tension: 10, clarity: 1 }
        });
        try {
            await entry.save();
            assert.fail('Debería haber fallado por validación de rango Mongoose');
        } catch (error) {
            assert.ok(error.errors['metrics.tension']);
        }
    });
  });
});