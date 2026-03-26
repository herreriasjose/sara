import logging
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

# 1. Configuración de Logs (Fricción Cero)
os.makedirs("../logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler("../logs/brain.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SARA-Brain")

# 2. Inicialización
app = FastAPI(title="SARA-Brain", version="1.0.0", description="Motor de Inferencia Bayesiana")

# 3. Contrato de Datos (McEwen ERP)
class EmaMetrics(BaseModel):
    energy: int = Field(..., ge=1, le=5, description="Nivel de Batería (1-5)")
    tension: int = Field(..., ge=1, le=3, description="Nivel de Agobio/Saturación (1-3)")
    clarity: int = Field(..., ge=1, le=3, description="Claridad Mental (1-3)")
    previous_probability: Optional[float] = Field(0.1, ge=0.0, le=1.0, description="P(H) Previa")

# 4. Endpoints
@app.get("/health")
async def health_check():
    logger.info("Health check solicitado por el Gateway.")
    return {"status": "alive", "engine": "Bayesian-McEwen-v1"}

@app.post("/predict")
async def predict_burnout(metrics: EmaMetrics):
    try:
        logger.info(f"Procesando métricas de Carga Alostática: {metrics.model_dump()}")
        
        # Lógica de Inferencia Bayesiana Simplificada (Energy Resistance Principle)
        likelihood_factor = metrics.tension / metrics.energy
        posterior = (metrics.previous_probability * likelihood_factor) / 1.5
        final_prob = min(max(posterior, 0.0), 1.0)
        
        status = "alert" if final_prob > 0.7 else "stable"
        logger.info(f"Predicción completada: P(H|E) = {final_prob:.4f} | Estado: {status}")
        
        return {
            "probability": round(final_prob, 4),
            "status": status
        }
    except Exception as e:
        logger.error(f"Error en el motor bayesiano: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))