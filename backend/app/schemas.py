from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    lithology: str = Field(min_length=2, max_length=80)
    temperature_c: float = Field(ge=-50, le=2000)
    property: str = "ucs_mpa"

class PredictionResponse(BaseModel):
    property: str
    predicted_value: float
    model: str
    warning: str
