const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Importamos los modelos reales de SARA
const Patient = require('../src/models/Patient');
const EmaEntry = require('../src/models/EmaEntry');

describe('MongoDB Atlas - Ciclo de Vida de la BD (sara_test)', () => {
  
  before(async () => {
    // Apuntamos exactamente a la variable MONGO_URI de tu .env.test
    const uri = process.env.MONGO_URI; 
    
    // Solo conectamos si no hay una conexión previa (para evitar conflictos con server.test.js)
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }
  });

  after(async () => {
    // Limpieza total: Destruimos la BD de prueba para no dejar basura y cerramos conexión.
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    }
  });

  // --- Tests del Modelo Patient (Perfil del Usuario) ---
  describe('Patient Model (Perfil de Cuidador/Power User)', () => {
    let savedPatientId;

    it('1. Debe crear un Paciente con valores por defecto (Streak = 0)', async () => {
      const patient = new Patient({ 
          externalId: 'USR-2026-TEST-01', 
          consentAccepted: true,
          disabilityGrade: 69,
          isQuotaParticipant: true
      });
      const savedPatient = await patient.save();
      savedPatientId = savedPatient._id;
      
      assert.ok(savedPatient._id);
      assert.strictEqual(savedPatient.streakCount, 0, 'La racha inicial debe ser 0');
      assert.strictEqual(savedPatient.disabilityGrade, 69, 'Debe guardar el grado de discapacidad');
    });

    it('2. Debe actualizar el Streak (Simulando Gamificación Duolingo)', async () => {
      const patient = await Patient.findById(savedPatientId);
      patient.streakCount += 1;
      const updatedPatient = await patient.save();
      
      assert.strictEqual(updatedPatient.streakCount, 1, 'La racha debe haberse incrementado');
    });

    it('3. Debe fallar si falta el externalId (Validación Mongoose)', async () => {
        try {
            const invalidPatient = new Patient({ consentAccepted: true });
            await invalidPatient.save();
            assert.fail('Debería haber lanzado un error de validación');
        } catch (error) {
            assert.match(error.message, /Path `externalId` is required/);
        }
    });

    it('4. Debe borrar el Paciente', async () => {
        const result = await Patient.deleteOne({ _id: savedPatientId });
        assert.strictEqual(result.deletedCount, 1);
    });
  });

  // --- Tests del Modelo EmaEntry (Micro-Evaluaciones 20s) ---
  describe('EmaEntry Model (Captura de Datos Híbrida 90/10)', () => {
    let testPatientId;
    let savedEntryId;

    // Necesitamos un paciente válido para asociarle la entrada EMA
    before(async () => {
        const p = new Patient({ externalId: 'USR-EMA-TEST', consentAccepted: true });
        const savedP = await p.save();
        testPatientId = savedP._id;
    });

    it('1. Debe registrar una entrada "active" (Micro-Encuesta)', async () => {
        const entry = new EmaEntry({
            patientId: testPatientId,
            type: 'active',
            metrics: { energy: 4, tension: 8, clarity: 5 },
            responseTimeMs: 15000 // 15 segundos (Regla de los 20s)
        });
        const savedEntry = await entry.save();
        savedEntryId = savedEntry._id;

        assert.ok(savedEntry._id);
        assert.strictEqual(savedEntry.metrics.tension, 8);
        assert.strictEqual(savedEntry.isHighQuality, true, 'Una respuesta de 15s debe ser High Quality');
    });

    it('2. Middleware: Debe marcar como baja calidad (isHighQuality=false) si la respuesta es < 1s o > 60s', async () => {
        const fastEntry = new EmaEntry({
            patientId: testPatientId,
            type: 'active',
            metrics: { energy: 5 },
            responseTimeMs: 500 // Medio segundo
        });
        const savedFastEntry = await fastEntry.save();
        
        assert.strictEqual(savedFastEntry.isHighQuality, false, 'Una respuesta menor a 1s se considera impulsiva/baja calidad');
    });

    it('3. Debe registrar una entrada "passive" (Sensor/Invisible)', async () => {
        const entry = new EmaEntry({
            patientId: testPatientId,
            type: 'passive',
            metadata: { agitación: "alta", movimiento: "constante" }
        });
        const savedEntry = await entry.save();
        assert.strictEqual(savedEntry.type, 'passive');
    });

    it('4. Debe borrar la entrada activa inicial', async () => {
        const result = await EmaEntry.deleteOne({ _id: savedEntryId });
        assert.strictEqual(result.deletedCount, 1);
    });
  });

});