// src/middlewares/requireAuth.js

const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || 'sara_alostatic_shield_2027';

const requireAuth = (allowedRoles = []) => {
    return (req, res, next) => {
        let user = null;

        const jwtToken = req.cookies?.sara_session;
        if (jwtToken) {
            try {
                const decoded = jwt.verify(jwtToken, JWT_SECRET, { algorithms: ['RS256', 'HS256'] });
                user = { id: decoded.id, role: decoded.role };
            } catch (err) {
                // Token inválido/expirado, user se mantiene null
            }
        }

        const emaToken = req.headers['x-ema-token'] || req.query.token || req.params.token;
        if (!user && emaToken) {
            const patientId = authService.verifyEmaToken(emaToken);
            if (patientId) {
                user = { id: patientId, role: 'caretaker_write' };
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Acceso Denegado. Credencial ausente/inválido.' });
        }

        console.log(`[RBAC Debug] Request a ${req.originalUrl} | Rol Detectado: ${user.role} | Roles Permitidos: ${allowedRoles}`);

        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Permisos insuficientes para el rol asignado.' });
        }

        req.user = user;
        next();
    };
};

module.exports = requireAuth;