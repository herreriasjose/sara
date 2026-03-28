// src/controllers/emaController.js

const Caretaker = require('../models/Caretaker');
const EmaEntry = require('../models/EmaEntry');
const crypto = require('crypto');
const brainClient = require('../services/brainClient'); // Puente con FastAPI

/**
 * Motor de Privacidad: Generación de ID Interno Determinista
 * Transforma un número de teléfono en un identificador opaco "SARA-XXXXX"
 */
function generateInternalId(phoneNumber) {
    // 1. Limpiamos cualquier carácter que no sea numérico (espacios, guiones, +)
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // 2. Generamos un hash criptográfico rápido usando librerías nativas (cero dependencias)
    const hash = crypto.createHash('sha256').update(normalizedPhone).digest('hex');
    
    // 3. Formateamos el token para que sea manejable en URLs
    return `SARA-${hash.substring(0, 12).toUpperCase()}`;
}

/**
 * @route POST /api/caretakers
 * @desc Registra un nuevo cuidador y genera su gemelo digital opaco
 */
exports.registerCaretaker = async (req, res) => {
    try {
        const {
            phoneNumber,
            name,
            email,
            phoneAlt,
            postalCode,
            age,
            relationship,
            yearsCaregiving,
            patientDisabilityGrade,
            caretakerDisabilityGrade,
            consentAccepted
        } = req.body;

        // 1. Validación de Fricción Cero
        if (!phoneNumber || !name) {
            return res.status(400).json({ error: 'El nombre y el teléfono son obligatorios para iniciar el acompañamiento.' });
        }

        // 2. Blindaje Ético: Generación del Token
        const internalId = generateInternalId(phoneNumber);

        // 3. Persistencia del Modelo Enriquecido
        const newCaretaker = new Caretaker({
            externalId: internalId,
            phoneReal: phoneNumber, // Crítico: Se guarda para que el cron pueda enviar el mensaje de WhatsApp
            name,
            email,
            phoneAlt,
            postalCode,
            age: age ? parseInt(age) : undefined,
            relationship,
            yearsCaregiving: yearsCaregiving ? parseInt(yearsCaregiving) : 0,
            patientDisabilityGrade: patientDisabilityGrade ? parseInt(patientDisabilityGrade) : 0,
            caretakerDisabilityGrade: caretakerDisabilityGrade ? parseInt(caretakerDisabilityGrade) : 0,
            consentAccepted: consentAccepted === 'true' || consentAccepted === true
        });

        await newCaretaker.save();

        // 4. Orquestación Híbrida de la Respuesta
        if (req.accepts('html')) {
            // Interfaz EJS: Redirigimos al dashboard indicando el éxito
            return res.redirect('/?success=registered');
        } else {
            // Consumo por API pura
            return res.status(201).json({
                message: 'Cuidador registrado y blindado con éxito.',
                internalId: internalId
            });
        }

    } catch (error) {
        console.error('[Gateway] Error crítico en registro de cuidador:', error);

        // Gestión elegante de duplicados (MongoDB Error 11000)
        if (error.code === 11000) {
            const message = 'Este número de teléfono ya está participando en el estudio SARA.';
            if (req.accepts('html')) {
                return res.redirect(`/?error=duplicate`);
            }
            return res.status(409).json({ error: message });
        }

        res.status(500).json({ error: 'Fallo sistémico en la orquestación del alta.' });
    }
};

/**
 * @route POST /api/ema
 * @desc Captura la Evaluación Ecológica Momentaria y dispara el motor Bayesiano
 */
exports.submitEma = async (req, res) => {
    try {
        // Asumimos que requireAuth.js verifica el Token Efímero y extrae el ID
        const internalId = req.user ? req.user.externalId : req.body.externalId; 
        const { energy, tension, clarity, responseTimeMs } = req.body;

        if (!internalId || !energy || !tension || !clarity) {
            return res.status(400).json({ error: 'Faltan métricas psicométricas del ERP o identificación.' });
        }

        // 1. Recuperar el contexto histórico del cuidador
        const caretaker = await Caretaker.findOne({ externalId: internalId });
        if (!caretaker) {
            return res.status(404).json({ error: 'Contexto de cuidador no encontrado.' });
        }

        // 2. Persistir la micro-validación en bruto
        const newEma = new EmaEntry({
            patientId: caretaker._id, // Enlace interno al ObjectId de Mongo
            metrics: {
                energy: parseInt(energy),
                tension: parseInt(tension),
                clarity: parseInt(clarity)
            },
            responseTimeMs: parseInt(responseTimeMs) || 0
        });

        await newEma.save();

        // 3. JITAI & Inferencia Bayesiana (Puente Node.js ↔ Python)
        // Se ejecuta sin bloquear el hilo principal para mantener tiempos de respuesta de milisegundos.
        try {
            // Llamada al microservicio en Python (SARA-Brain)
            const prediction = await brainClient.predictBurnout({
                metrics: newEma.metrics,
                priorProbability: caretaker.lastBurnoutProbability,
                caretakerContext: {
                    age: caretaker.age,
                    caregivingYears: caretaker.yearsCaregiving,
                    burden: caretaker.patientDisabilityGrade,
                    capacity: caretaker.caretakerDisabilityGrade
                }
            });

            // 4. Actualizar el estado dinámico del Cuidador
            caretaker.lastBurnoutProbability = prediction.posteriorProbability || caretaker.lastBurnoutProbability;
            caretaker.lastInteractionAt = new Date();
            caretaker.streakCount += 1;
            await caretaker.save();

            // Lógica JITAI (Just-In-Time Adaptive Intervention)
            if (prediction.interventionRequired) {
                console.log(`[JITAI Trigger] Alerta de claudicación detectada para: ${caretaker.externalId}`);
                // TODO: Orquestar envío de mensaje de soporte vía WhatsApp
            }

        } catch (brainError) {
            // El Gateway debe ser resiliente. Si SARA-Brain falla, no castigamos al usuario.
            console.error('[Gateway ↔ Brain] Fallo de inferencia bayesiana. Dato crudo salvado.', brainError.message);
        }

        // 5. Cierre de ciclo
        if (req.accepts('html')) {
            // Renderizamos una vista hiper-ligera de agradecimiento
            return res.render('pages/ema', { success: true, message: 'Registro completado. Gracias por cuidarte.' });
        }

        return res.status(200).json({ status: 'ok', message: 'Métricas guardadas y procesadas.' });

    } catch (error) {
        console.error('[Gateway] Error en el procesado EMA:', error);
        res.status(500).json({ error: 'Fallo al procesar la evaluación momentaria.' });
    }
};