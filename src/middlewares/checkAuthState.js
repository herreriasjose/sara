// src/middlewares/checkAuthState.js

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || 'sara_alostatic_shield_2027';

module.exports = (req, res, next) => {
    const token = req.cookies?.sara_session;
    res.locals.isAuthenticated = !!token;
    res.locals.currentPath = req.path;
    res.locals.user = null;

    if (token) {
        try {
            // Inyecta automáticamente los claims del JWT en EJS (locals.user)
            res.locals.user = jwt.verify(token, JWT_SECRET, { algorithms: ['RS256', 'HS256'] });
        } catch (err) {}
    }
    
    next();
};