// src/server.js

const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

// 1. Interceptor Nativo de Logs
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, 'gateway.log');
const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
    const msg = `[${new Date().toISOString()}] INFO: ${args.join(' ')}\n`;
    fs.appendFileSync(logFile, msg);
    originalLog.apply(console, args);
};

console.error = function (...args) {
    const msg = `[${new Date().toISOString()}] ERROR: ${args.join(' ')}\n`;
    fs.appendFileSync(logFile, msg);
    originalError.apply(console, args);
};

// 2. Inicialización de Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Útil para procesar los micro-formularios

// 3. Configuración del Motor de Vistas (EJS) y Estáticos
app.set('view engine', 'ejs');
// Asumimos que la carpeta views está dentro de src/ (src/views/)
app.set('views', path.join(__dirname, 'views')); 
// Asumimos que tienes una carpeta public/ en la raíz del proyecto para tus CSS puros o assets
app.use(express.static(path.join(__dirname, '../public'))); 

// 4. Importación de Rutas
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

// 5. Registro de Rutas
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

// 6. Endpoint de la Landing Page (EJS)
app.get('/', (req, res) => {
    // Añadimos 'pages/' al path del renderizado
    res.render('pages/index', { 
        title: 'SARA - Sistema de Acompañamiento y Resiliencia Alostática'
    });
});

// Registro por el propio cuidador (Self-signup)
app.get('/register', (req, res) => {
    res.render('pages/register-caretaker', { title: 'Alta de Cuidador' });
});

// Registro por parte del Administrador/Investigador
app.get('/admin/register', (req, res) => {
    res.render('pages/admin-register-caretaker', { title: 'Panel de Control - Registro' });
});


// 7. Endpoint formulario prueba
app.get('/test-ema', (req, res) => {
    res.render('pages/ema', { title: 'SARA - Test de Evaluación' });
});

// 7. Arranque del Servidor
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sara_dev';

    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log('Conectado a MongoDB Atlas con éxito.');
            app.listen(PORT, () => {
                console.log(`SARA-Gateway operando en el puerto ${PORT}`);
            });
        })
        .catch(err => console.error('Error crítico al conectar a MongoDB:', err));
}

module.exports = app;