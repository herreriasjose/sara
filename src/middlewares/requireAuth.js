// src/middlewares/requireAuth.js

module.exports = (req, res, next) => {
    // Buscamos el token en la cabecera (Bearer), cabecera personalizada, o query param (enlace de WhatsApp)
    const token = req.headers.authorization?.split(' ')[1] 
               || req.headers['x-api-key'] 
               || req.query.token;

    if (!token) {
        return res.status(401).json({ 
            error: 'Acceso Denegado. No se detectó un token de sesión válido.' 
        });
    }

    // Para el MVP, validamos contra una variable de entorno. 
    // En producción, aquí se desencriptaría el JWT o se validaría el hash efímero.
    const EXPECTED_TOKEN = process.env.SARA_API_KEY || 'sara_dev_token_2026';

    if (token !== EXPECTED_TOKEN) {
        return res.status(403).json({ 
            error: 'El token proporcionado es inválido o ha expirado.' 
        });
    }

    // Token válido, adelante.
    next();
};