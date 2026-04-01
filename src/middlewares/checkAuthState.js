// src/middlewares/checkAuthState.js

module.exports = (req, res, next) => {
    res.locals.isAuthenticated = !!req.cookies?.sara_session;
    res.locals.currentPath = req.path; // Inyecta la ruta actual
    next();
};