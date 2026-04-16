// src/services/brainClient.js
const BRAIN_URL = process.env.PYTHON_BRAIN_URL || 'http://localhost:8000';

exports.getBurnoutPrediction = async (data) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        console.log('[SARA-Brain] Solicitando inferencia para:', data.external_id);

        const response = await fetch(`${BRAIN_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error('[SARA-Brain] Motor devolvió HTTP', response.status);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[SARA-Brain] Timeout: El motor Python no responde (Latencia > 5s).');
        } else {
            console.error('[SARA-Brain] Falla de conexión:', error.message);
        }
        return null; 
    }
};