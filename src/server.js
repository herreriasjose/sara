// src/server.js

const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, 'gateway.log');
const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] INFO: ${args.join(' ')}\n`);
    originalLog.apply(console, args);
};

console.error = function (...args) {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ERROR: ${args.join(' ')}\n`);
    originalError.apply(console, args);
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const webRoutes = require('./routes/web');

app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/', webRoutes);

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sara_dev';

    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log('Conectado a MongoDB Atlas con éxito.');
            app.listen(PORT, () => console.log(`SARA-Gateway operando en el puerto ${PORT}`));
        })
        .catch(err => console.error('Error crítico al conectar a MongoDB:', err));
}

module.exports = app;