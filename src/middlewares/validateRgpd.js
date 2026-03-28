// src/middlewares/validateRgpd.js

module.exports = (req, res, next) => {
    // El navegador envía "true" (string), los tests envían true (boolean)
    const consent = req.body.consentAccepted;

    const isAccepted = consent === true || consent === 'true';

    if (!isAccepted) {
        return res.status(403).json({ 
            error: "Privacidad por Diseño: El consentimiento explícito es obligatorio para procesar datos de salud." 
        });
    }

    // Normalizamos a booleano para el controlador y la base de datos
    req.body.consentAccepted = true;
    next();
};