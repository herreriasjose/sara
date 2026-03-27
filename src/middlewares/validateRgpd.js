// src/middlewares/validateRgpd.js

module.exports = (req, res, next) => {
    const { consentAccepted } = req.body;

    // Blindaje Ético (RGPD): Rechazo automático en la puerta de enlace
    if (consentAccepted !== true) {
        console.error(`[RGPD ALERTA] Intento de registro sin consentimiento explícito.`);
        return res.status(400).json({ 
            error: 'Privacidad por Diseño: El consentimiento explícito es obligatorio para procesar datos de salud.' 
        });
    }

    // Si hay consentimiento, pasamos el control al controlador (emaController)
    next();
};