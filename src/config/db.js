const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const env = process.env.NODE_ENV || 'development';

  if (!uri) {
    console.error('❌ Error: MONGO_URI no definida en el entorno actual.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    // Log informativo para ahorro cognitivo: sabes exactamente dónde estás escribiendo
    console.log(`🚀 SARA DB Conectada: ${conn.connection.name.toUpperCase()} (${env})`);
  } catch (err) {
    console.error(`❌ Fallo en conexión (${env}): ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;