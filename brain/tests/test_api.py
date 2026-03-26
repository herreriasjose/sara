from fastapi.testclient import TestClient
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
