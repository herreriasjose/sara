const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, 'gateway.log');
const originalLog = console.log;
const originalError = console.error;

const getLocalTimestamp = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, -1);
};

console.log = function (...args) {
    fs.appendFileSync(logFile, `[${getLocalTimestamp()}] INFO: ${args.join(' ')}\n`);
    originalLog.apply(console, args);
};

console.error = function (...args) {
    fs.appendFileSync(logFile, `[${getLocalTimestamp()}] ERROR: ${args.join(' ')}\n`);
    originalError.apply(console, args);
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(require('./middlewares/checkAuthState'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const webRoutes = require('./routes/web');
const emaRoutes = require('./routes/ema');

app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/ema', emaRoutes);
app.use('/', webRoutes);

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sara_dev';

    mongoose.connect(MONGO_URI)
        .then(async () => {
            console.log('Conectado a MongoDB Atlas con éxito.');
            
            // Sincronización destructiva de índices huérfanos para evitar colisiones 11000
            await require('./models/Researcher').syncIndexes();
            console.log('[SARA-DB] Índices sincronizados purgados.');
            
            app.listen(PORT, () => console.log(`SARA-Gateway operando en el puerto ${PORT}`));
        })
        .catch(err => console.error('Error crítico al conectar a MongoDB:', err));
}

module.exports = app;