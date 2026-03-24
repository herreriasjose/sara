// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // MONGO_URI viene de tu archivo .env.dev o .env
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ SARA conectada a MongoDB Atlas: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Error crítico: SARA no pudo conectar a MongoDB.', error.message);
        // Si no hay base de datos, el sistema no puede operar. Apagamos el proceso.
        process.exit(1);
    }
};

module.exports = connectDB;