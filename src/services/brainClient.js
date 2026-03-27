// src/services/brainClient.js
const BRAIN_URL = process.env.PYTHON_BRAIN_URL || 'http://localhost:8000';

exports.getBurnoutPrediction = async (metrics, previousProbability = 0.1) => {
    try {
        // Acoplamos las métricas del formulario con la memoria del paciente
        const payload = {
            ...metrics,
            previous_probability: previousProbability
        };

        const response = await fetch(`${BRAIN_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            throw new Error(`Error en SARA-Brain: ${response.status} ${response.statusText}`);
        }
        
        return await response.json(); // Devuelve { burnout_probability: 0.XX }
        
    } catch (error) {
        // Fallback silencioso: El sistema anota las métricas aunque no haya predicción
        console.error('SARA-Brain inalcanzable o falló:', error.message);
        return null; 
    }
};