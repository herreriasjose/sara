from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"

def test_predict_burnout_stable():
    # Payload sincronizado con EmaInferencePayload (V4)
    payload = {
        "external_id": "SARA-TEST-STABLE",
        "energy": 5,
        "tension": 1,
        "clarity": 3,
        "latencies": {
            "attention_ms": 1000,
            "resolution_ms": 5000,
            "is_high_quality": True
        },
        "bayesian_state": {
            "alpha": 1.0,
            "beta": 1.0,
            "prior_probability": 0.5
        }
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "stable"
    assert data["probability"] < 0.5  # El superávit energético debe bajar la probabilidad
    assert "alpha" in data
    assert "beta" in data
    assert data["alpha"] > 1.0 # Alpha debe crecer por el buen estado energético

def test_predict_burnout_alert():
    # Escenario de fatiga extrema y latencia de atención elevada (>10 min)
    payload = {
        "external_id": "SARA-TEST-ALERT",
        "energy": 1,
        "tension": 3,
        "clarity": 1,
        "latencies": {
            "attention_ms": 650000, # Penalización por fricción ejecutiva
            "resolution_ms": 15000,
            "is_high_quality": True
        },
        "bayesian_state": {
            "alpha": 5.0,
            "beta": 5.0,
            "prior_probability": 0.5
        }
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["probability"] > 0.5
    assert data["beta"] > 5.0 # Beta debe crecer por tensión y penalización de latencia

def test_predict_low_quality_bypass():
    """
    Valida que si la calidad es baja (is_high_quality=False), 
    los parámetros alpha y beta no mutan (Bypass de Ruido).
    """
    prior_alpha = 2.5
    prior_beta = 1.8
    payload = {
        "external_id": "SARA-TEST-NOISE",
        "energy": 5, "tension": 1, "clarity": 3,
        "latencies": {
            "attention_ms": 100,
            "resolution_ms": 500, # < 2s (Ruido)
            "is_high_quality": False
        },
        "bayesian_state": {
            "alpha": prior_alpha,
            "beta": prior_beta,
            "prior_probability": 0.41
        }
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Los hiperparámetros deben retornar idénticos a los inyectados
    assert data["alpha"] == prior_alpha
    assert data["beta"] == prior_beta
    assert data["probability"] == 0.41

def test_predict_validation_error_v4():
    """
    Verifica que el contrato Pydantic V4 rechace payloads incompletos (422).
    """
    # Payload tipo V1 (sin latencias ni estado bayesiano)
    payload = {"energy": 5, "tension": 1, "clarity": 3}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422 

def test_predict_cold_start_convergence():
    """
    Verifica la primera actualización partiendo de una distribución no informativa (1,1).
    """
    payload = {
        "external_id": "SARA-COLD-START",
        "energy": 3, "tension": 2, "clarity": 2,
        "latencies": {
            "attention_ms": 5000, "resolution_ms": 10000, "is_high_quality": True
        },
        "bayesian_state": {
            "alpha": 1.0, "beta": 1.0, "prior_probability": 0.5
        }
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Alpha: 1.0 + (3/5 + 2/3) = 1.0 + 1.2666 = 2.2666
    # Beta: 1.0 + (2/3 + (4-2)/3) = 1.0 + 1.3333 = 2.3333
    assert data["alpha"] > 1.0
    assert data["beta"] > 1.0
    assert data["probability"] > 0.4  # Convergencia inicial