import logging
import os
from fastapi import FastAPI, HTTPException
from schemas import EmaInferencePayload
from engine.bayesian import update_allostatic_state

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

app = FastAPI(title="SARA-Brain", version="1.0.0", description="Motor de Inferencia Bayesiana JITAI")

@app.get("/health")
async def health_check():
    return {"status": "alive", "engine": "Bayesian-Beta-Distribution-v4"}

@app.post("/predict")
async def predict_burnout(payload: EmaInferencePayload):
    try:
        new_alpha, new_beta, posterior = update_allostatic_state(payload)
        
        # Umbral JITAI establecido en 0.8 según arquitectura SARA
        status = "alert" if posterior > 0.8 else "stable"
        
        # TRAZABILIDAD CLÍNICA (Sismógrafo Alostático)
        logger.info(f"ID: {payload.external_id} | CINÉTICA ALOSTÁTICA | Prior: {payload.bayesian_state.prior_probability} -> Posterior: {posterior} | "
                    f"Beta({new_alpha}, {new_beta}) | "
                    f"Latencias(LA: {payload.latencies.attention_ms}ms, LR: {payload.latencies.resolution_ms}ms) | "
                    f"Calidad: {payload.latencies.is_high_quality}")
        
        return {
            "probability": posterior,
            "alpha": new_alpha,
            "beta": new_beta,
            "status": status
        }
    except Exception as e:
        logger.error(f"Error en el motor bayesiano: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))