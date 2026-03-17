/**
 * SARA - Sistema de Análisis y Resiliencia Auto-gestionado
 * Principal Server Entry Point (Node.js v24 LTS)
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración del Motor de Vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// 2. Middlewares Globales
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Rutas de la Aplicación
app.get('/', (req, res) => {
    res.render('pages/index', { 
        title: 'SARA | Inicio',
        stage: 'Fase 1: MVP - TFM'
    });
});

// 4. Manejo de Errores (404)
app.use((req, res) => {
    res.status(404).render('pages/index', { 
        title: '404 - No encontrado',
        stage: 'Error'
    });
});

// EXPORTACIÓN PARA TESTING:
// Permite que el test runner levante la app en puertos efímeros.
module.exports = app;

// INICIO DEL SERVIDOR:
// Solo se ejecuta si el archivo es llamado directamente (npm start / npm run dev)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🚀 SARA en ejecución: http://localhost:${PORT}`);
        console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🧠 Memoria optimizada para: Investigador Senior\n`);
    });
}