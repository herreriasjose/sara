const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

// 1. Interceptor Nativo de Logs (Subimos un nivel porque server.js ahora está en /src)
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

// 3. Importación de Rutas
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api'); // <-- 1. Importamos tu archivo de rutas

// 4. Registro de Rutas
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes); // <-- 2. Conectamos el cable. Ahora /api/patients y /api/ema existen.

// Endpoint básico para tests de disponibilidad
app.get('/', (req, res) => {
    res.send('<!DOCTYPE html><html><body><h1>SARA Dashboard MVP</h1></body></html>');
});

// 5. Arranque del Servidor
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