// src/services/brainClient.js
const BRAIN_URL = process.env.PYTHON_BRAIN_URL || 'http://localhost:8000';

exports.getBurnoutPrediction = async (metrics) => {
    try {
        const response = await fetch(`${BRAIN_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metrics) // Envía energy, tension, clarity
        });
        
        if (!response.ok) throw new Error('Error en el motor Bayesiano');
        
        return await response.json(); // Devuelve { burnout_probability: 0.XX }
    } catch (error) {
        console.error('SARA-Brain inalcanzable:', error.message);
        return null; // Fallback: el sistema sigue funcionando sin la predicción
    }
};