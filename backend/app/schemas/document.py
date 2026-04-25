from pydantic import BaseModel
from typing import List
from app.schemas.ner import Entity


class Document(BaseModel):
    id: str
    text: str
    entities: List[Entity]
    validated: bool = False