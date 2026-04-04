const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || 'sara_alostatic_shield_2027';

const requireAuth = (allowedRoles = []) => {
    return (req, res, next) => {
        let user = null;

        const jwtToken = req.cookies?.sara_session;
        if (jwtToken) {
            try {
                user = jwt.verify(jwtToken, JWT_SECRET, { algorithms: ['RS256', 'HS256'] });
            } catch (err) {}
        }

        const emaToken = req.headers['x-ema-token'] || req.query.token || req.params.token;
        if (!user && emaToken) {
            const patientId = authService.verifyEmaToken(emaToken);
            if (patientId) {
                user = { id: patientId, role: 'caretaker_write' };
            }
        }

        // Validación de existencia de usuario
        if (!user) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ error: 'Acceso Denegado. Credencial ausente/inválido.' });
            }
            return res.redirect('/login?error=auth');
        }

        console.log(`[RBAC Debug] Request a ${req.originalUrl} | Rol Detectado: ${user.role} | Roles Permitidos: ${allowedRoles}`);

        // Validación de permisos según rol
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(403).json({ error: 'Permisos insuficientes para el rol asignado.' });
            }
            return res.redirect('/login?error=auth');
        }

        req.user = user;
        next();
    };
};

module.exports = requireAuth;