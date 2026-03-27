# brain\schemas.py

from pydantic import BaseModel, Field
from typing import Optional

class EmaMetrics(BaseModel):
    energy: int = Field(..., ge=1, le=5, description="Nivel de Batería (1-5)")
    tension: int = Field(..., ge=1, le=3, description="Nivel de Agobio/Saturación (1-3)")
    clarity: int = Field(..., ge=1, le=3, description="Claridad Mental (1-3)")
    previous_probability: Optional[float] = Field(0.1, ge=0.0, le=1.0, description="P(H) Previa")
