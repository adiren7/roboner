from fastapi import APIRouter, HTTPException

from app.schemas.ner import CreateEntity, UpdateLabel, UpdateSpan, UpdateValidated
from app.services.annotation_service import AnnotationService
from app.storage.file_store import load_project

router = APIRouter(prefix="/annotation", tags=["annotation"])

service = AnnotationService()


# update label
@router.patch(
    "/{project_id}/{doc_id}/{entity_id}/label",
    summary="Change entity label",
    description="""
Updates the label of an entity.

### Input:
- project_id
- doc_id
- entity_id
- new label

### Behavior:
- keeps same span (start/end)
- updates label only
- sets source = user
- sets confidence = 1

### Notes:
- new labels are allowed (dynamic label space)
"""
)
def update_label(project_id: str, doc_id: str, entity_id: str, payload: UpdateLabel):

    try:
        return service.update_entity_label(
            project_id,
            doc_id,
            entity_id,
            payload.label
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# update entity span
@router.patch(
    "/{project_id}/{doc_id}/{entity_id}/span",
    summary="Update entity span (start/end)",
    description="""
Updates the span of an entity.

### Input:
- project_id
- doc_id
- entity_id
- start (int)
- end (int)

### Behavior:
- updates only start/end positions
- keeps label unchanged
- sets source = user
- sets confidence = 1
- validates no overlap with other entities

### Errors:
- returns 400 if overlap detected
- returns 404 if entity not found
"""
)
def update_span(project_id: str, doc_id: str, entity_id: str, payload: UpdateSpan):

    try:
        return service.update_entity_span(
            project_id,
            doc_id,
            entity_id,
            payload.start,
            payload.end
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# delete entity

@router.delete(
    "/{project_id}/{doc_id}/{entity_id}",
    summary="Delete entity",
    description="""
Deletes an entity completely from a document.

### Input:
- project_id
- doc_id
- entity_id
"""
)
def delete_entity(project_id: str, doc_id: str, entity_id: str):

    try:
        return service.delete_entity(project_id, doc_id, entity_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# update doc validation logic
@router.patch(
    "/{project_id}/{doc_id}/validated",
    summary="Set document validation flag",
    description="""
Sets `validated` on a document in docs.json.
"""
)
def update_validated(
    project_id: str, doc_id: str, payload: UpdateValidated
):

    try:
        return service.update_doc_validated(
            project_id, doc_id, payload.validated
        )
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg) from e
        raise HTTPException(status_code=400, detail=msg) from e


# validate all docs

@router.post(
    "/{project_id}/validate-all",
    summary="Set validated=true on all documents in one save",
    description="Avoids race conditions from parallel per-doc PATCHes.",
)
def validate_all(project_id: str):
    
    if not load_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        return service.validate_all_docs(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# add entity
@router.post(
    "/{project_id}/{doc_id}",
    summary="Add entity",
    description="""
Adds a new entity to a document.

### Input:
- start (int)
- end (int)
- label (string)

### Behavior:
- generates id automatically
- sets source = user
- sets confidence = 1
- validates no overlap before saving
"""
)
def add_entity(project_id: str, doc_id: str, entity: CreateEntity):

    try:
        return service.add_entity(
            project_id,
            doc_id,
            entity.model_dump()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))