from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
import pandas as pd
import io
from app.schemas.project import CreateProjectRequest
from app.services.export_service import export_service
from app.services.project_service import project_list_service, project_service
from app.services.inference_service import inference_service
from app.storage.file_store import get_id_by_name, load_docs, load_project, name_key, save_project

# Create project object first
# We mock a CreateProjectRequest for the service
from dataclasses import dataclass
@dataclass
class MockReq:
    name: str
    lang: str = "en"
    type: str = "core"
    genre: str = "web"
    size: str = "sm"


router = APIRouter(prefix="/projects", tags=["projects"])

def _require_project(project_id: str):
    p = load_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

@router.post("/", summary="Create a new NER project with file upload")
async def create_project(
    name: str = Form(...),
    model: str = Form(...),
    file: UploadFile = File(...)
):  
    # Check if model follows spacy naming or is just a name
    # If it contains underscores, it's likely a full name
    
    project = project_service.create_with_model(name, model)
    
    # process file
    contents = await file.read()
    df = None
    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(contents))
    elif file.filename.endswith(('.xls', '.xlsx')):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        raise HTTPException(status_code=400, detail="Only CSV or Excel files are supported")
    
    if 'texts' not in df.columns:
        # Try case insensitive
        cols = {c.lower(): c for c in df.columns}
        if 'texts' in cols:
            df = df.rename(columns={cols['texts']: 'texts'})
        else:
            raise HTTPException(status_code=400, detail="File must contain a 'texts' column")
    
    texts = df['texts'].dropna().astype(str).tolist()
    if not texts:
        raise HTTPException(status_code=400, detail="No text data found in 'texts' column")
    
    # inference
    inference_service.run_batch(project, texts)
    
    return project

@router.get("/{project_id}/export/validated", summary="Export only validated annotations")
def export_validated(project_id: str):
    _require_project(project_id)
    docs = load_docs(project_id)
    validated_docs = [d for d in docs if d.get("validated")]
    
    out = []
    for d in validated_docs:
        trip = [[e["start"], e["end"], e["label"]] for e in d.get("entities", [])]
        out.append([d["text"], {"entities": trip}])
    return out

@router.get("/{project_id}/export/pending", summary="Export only pending annotations")
def export_pending(project_id: str):
    _require_project(project_id)
    docs = load_docs(project_id)
    pending_docs = [d for d in docs if not d.get("validated")]
    
    out = []
    for d in pending_docs:
        trip = [[e["start"], e["end"], e["label"]] for e in d.get("entities", [])]
        out.append([d["text"], {"entities": trip}])
    return out


@router.get("/", summary="List projects with annotation progress")
def list_projects():
    return project_list_service.list_with_stats()

@router.get("/by-name/{name}", summary="Look up a project by display name")
def get_project_by_name(name: str):
    pid = get_id_by_name(name_key(name))
    if not pid:
        raise HTTPException(status_code=404, detail="No project with this name")
    return _require_project(pid)

@router.get("/{project_id}/config", summary="Get project config.json payload")
def get_project_config(project_id: str):
    return _require_project(project_id)

@router.get("/{project_id}/docs", summary="List all annotation documents")
def get_project_docs(project_id: str):
    _require_project(project_id)
    return load_docs(project_id)

@router.get("/{project_id}/export", summary="Export dataset for training")
def export_project(
    project_id: str,
    export_format: str = Query("spacy", alias="format"),
):
    _require_project(project_id)
    if export_format != "spacy":
        raise HTTPException(status_code=400, detail="Unsupported format")
    docs = load_docs(project_id)
    if not docs:
        raise HTTPException(status_code=400, detail="No documents in this project")
    if any(not d.get("validated") for d in docs):
        raise HTTPException(status_code=403, detail="All documents must be validated")
    raw = export_service.to_spacy_format(project_id)
    return [
        [text, {"entities": [list(ent) for ent in meta["entities"]]}]
        for text, meta in raw
    ]

@router.post("/{project_id}/labels", summary="Add a new label to the project")
def add_project_label(project_id: str, payload: dict):
    p = _require_project(project_id)
    label = payload.get("label")
    parent = payload.get("parent")
    if not label: raise HTTPException(status_code=400, detail="Label name is required")
    
    labels = p.get("labels", {})
    if not isinstance(labels, dict):
        labels = {l: {} for l in labels} if isinstance(labels, list) else {}

    def add_recursive(d, target, new_l):
        if target in d:
            if not isinstance(d[target], dict): d[target] = {}
            d[target][new_l] = {}
            return True
        for v in d.values():
            if isinstance(v, dict):
                if add_recursive(v, target, new_l): return True
        return False

    if parent:
        if not add_recursive(labels, parent, label): labels[label] = {}
    else:
        if label not in labels: labels[label] = {}
    p["labels"] = labels
    save_project(p)
    return p

@router.patch("/{project_id}/labels", summary="Update the entire labels hierarchy")
def update_project_labels(project_id: str, labels: dict):
    p = _require_project(project_id)
    from app.storage.file_store import save_project
    p["labels"] = labels
    save_project(p)
    return p


@router.delete("/{project_id}", summary="Delete project")
def delete_project(project_id: str):
    from app.storage.file_store import delete_project_data
    delete_project_data(project_id)
    return {"status": "ok"}


@router.patch("/{project_id}/rename", summary="Rename project")
def rename_project(project_id: str, payload: dict):
    new_name = payload.get("name")
    if not new_name:
        raise HTTPException(status_code=400, detail="New name is required")
    from app.storage.file_store import rename_project_data
    try:
        return rename_project_data(project_id, new_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))