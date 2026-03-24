// server.js
const express = require('express');
const connectDB = require('./src/config/db'); // 1. Importamos la conexión
const apiRoutes = require('./src/routes/api');

const app = express();

// 2. Conectamos a MongoDB SOLO si no estamos en entorno de testing 
// (Porque los tests ya se conectan por su cuenta)
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// 3. EL SALVAVIDAS: Middleware para parsear JSON
app.use(express.json()); 

// 4. Montamos las rutas en el prefijo /api
app.use('/api', apiRoutes);

// Dashboard MVP (Opcional)
app.get('/', (req, res) => {
    res.send('<!DOCTYPE html><html><body><h1>SARA Dashboard MVP</h1></body></html>');
});

// 5. Exportamos la app "desnuda" para los tests
module.exports = app;

// 6. Levantamos el servidor
if (require.main === module) {
    // Leemos el puerto desde el .env.dev (3000) o usamos 3000 por defecto
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`SARA operativa y a la escucha en el puerto ${PORT} ⚡`);
    });
}