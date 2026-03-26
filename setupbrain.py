import os
from pathlib import Path

def create_sara_brain_scaffolding():
    print("🧠 Iniciando el despliegue de SARA-Brain (FastAPI)...")
    
    # Directorio base (se creará dentro de la ruta actual donde ejecutes el script)
    base_dir = Path("brain")
    
    # Definición de la estructura de archivos y su contenido (Boilerplate)
    structure = {
        "requirements.txt": """fastapi==0.110.0
uvicorn==0.29.0
pydantic==2.6.3
scipy==1.12.0
pymc==5.10.4
pytest==8.1.1
httpx==0.27.0
""",
        
        "schemas.py": """from pydantic import BaseModel, Field
from typing import Optional

class EmaMetrics(BaseModel):
    energy: int = Field(..., ge=1, le=5, description="Nivel de Batería (1-5)")
    tension: int = Field(..., ge=1, le=3, description="Nivel de Agobio/Saturación (1-3)")
    clarity: int = Field(..., ge=1, le=3, description="Claridad Mental (1-3)")
    previous_probability: Optional[float] = Field(0.1, ge=0.0, le=1.0, description="P(H) Previa")
""",

        "engine/__init__.py": "",
        
        "engine/bayesian.py": """def calculate_posterior(metrics) -> float:
    # Lógica de Inferencia Bayesiana Simplificada (Energy Resistance Principle)
    # P(H|E) = (P(E|H) * P(H)) / P(E)
    
    # 1. Likelihood basada en el ERP de McEwen
    likelihood_factor = metrics.tension / metrics.energy
    
    # 2. Actualización de la probabilidad
    posterior = (metrics.previous_probability * likelihood_factor) / 1.5
    
    # 3. Normalización [0, 1]
    return min(max(posterior, 0.0), 1.0)
""",

        "main.py": """from fastapi import FastAPI, HTTPException
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
""",

        "tests/__init__.py": "",
        
        "tests/test_api.py": """from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"

def test_predict_burnout_stable():
    payload = {"energy": 5, "tension": 1, "clarity": 3, "previous_probability": 0.2}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "stable"
    assert data["probability"] < 0.2  # La probabilidad debe bajar
"""
    }

    # Ejecución de la creación
    for file_path_str, content in structure.items():
        file_path = base_dir / file_path_str
        
        # Crear directorios si no existen
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Escribir el archivo
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"  ✅ Creado: {file_path}")

    print("\n🚀 Despliegue completado. Siguientes pasos:")
    print("  1. cd brain")
    print("  2. pip install -r requirements.txt")
    print("  3. pytest tests/")

if __name__ == "__main__":
    create_sara_brain_scaffolding()