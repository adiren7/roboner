from pydantic import BaseModel
from typing import Optional


class Entity(BaseModel):
    id: str
    start: int
    end: int
    label: str
    source: str  # "model" or "user"
    confidence: float


class CreateEntity(BaseModel):
    start: int
    end: int
    label: str

class UpdateLabel(BaseModel):
    label: str


class UpdateSpan(BaseModel):
    start: int
    end: int


class UpdateValidated(BaseModel):
    validated: bool