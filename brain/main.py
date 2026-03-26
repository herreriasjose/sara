from fastapi import FastAPI, HTTPException
from schemas import EmaMetrics
from engine.bayesian import calculate_posterior

app = FastAPI(title="SARA-Brain", version="1.0.0", description="Motor de Inferencia Bayesiana")

@app.get("/health")
async def health_check():
    return {"status": "alive", "engine": "Bayesian-McEwen-v1"}

@app.post("/predict")
async def predict_burnout(metrics: EmaMetrics):
    try:
        final_prob = calculate_posterior(metrics)
        return {
            "probability": round(final_prob, 4),
            "status": "alert" if final_prob > 0.7 else "stable"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
