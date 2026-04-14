# brain/schemas.py

from pydantic import BaseModel, Field
from typing import Optional

class BayesianState(BaseModel):
    alpha: float = Field(..., ge=0.0, description="Acumulado de Resiliencia")
    beta: float = Field(..., ge=0.0, description="Acumulado de Desgaste Alostático")
    prior_probability: float = Field(..., ge=0.0, le=1.0, description="P(H) Previa")

class EmaLatencies(BaseModel):
    attention_ms: int = Field(..., description="Latencia de Atención (LA) en ms")
    resolution_ms: int = Field(..., description="Latencia de Resolución (LR) en ms")
    is_high_quality: bool = Field(..., description="Filtro de automatismo/ruido")

class EmaContext(BaseModel):
    caregiver_age: Optional[int] = None
    burden_type: Optional[str] = None

class EmaInferencePayload(BaseModel):
    external_id: str = Field(..., description="ID Anonimizado (Hash SHA-256)")
    energy: int = Field(..., ge=1, le=5)
    tension: int = Field(..., ge=1, le=3)
    clarity: int = Field(..., ge=1, le=3)
    latencies: EmaLatencies
    bayesian_state: BayesianState
    context: Optional[EmaContext] = None
