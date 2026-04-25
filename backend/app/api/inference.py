from fastapi import APIRouter, HTTPException
from typing import List
from app.services.inference_service import inference_service
from app.storage.file_store import load_project

router = APIRouter(prefix="/inference", tags=["inference"])


@router.post(
    "/{project_id}/batch",
    summary="Run NER inference on a batch of texts",
    description="""
Runs named entity recognition over a list of text chunks.

### Input:
- `project_id`: ID of the NER project
- `texts`: list of raw text strings

### What it does:
- Loads the project configuration
- Loads the associated model
- Runs NER on each text independently
- Stores results as annotation documents

### Output:
List of documents:
- doc_id
- original text
- predicted entities (start, end, label)
- validation status (false by default)
"""
)
def run_batch(project_id: str, texts: List[str]):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return inference_service.run_batch(project, texts)