from pydantic import BaseModel, Field
from typing import List, Dict

class ModelConfig(BaseModel):
    lang: str
    type: str
    genre: str
    size: str


class CreateProjectRequest(ModelConfig):
    name: str = Field(..., min_length=1, max_length=200)


class Project(BaseModel):
    id: str
    name: str
    model: str
    labels: dict