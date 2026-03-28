// src/services/brainClient.js
const BRAIN_URL = process.env.PYTHON_BRAIN_URL || 'http://localhost:8000';

exports.getBurnoutPrediction = async (data) => {
    try {
        const response = await fetch(`${BRAIN_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data) 
        });
        return response.ok ? await response.json() : null;
    } catch (error) {
        console.error('SARA-Brain Off:', error.message);
        return null; 
    }
};