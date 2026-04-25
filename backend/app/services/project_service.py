import uuid
from fastapi import HTTPException

from app.services.spacy_service import spacy_service
from app.schemas.project import CreateProjectRequest
from app.storage.file_store import (
    is_name_taken,
    name_key,
    register_name,
    save_project,
)

from app.storage.file_store import BASE_PATH, load_docs, load_json


class ProjectService:
    def create(self, cfg: CreateProjectRequest):
        # Existing method kept for compatibility if needed, but we'll use create_with_model
        return self.create_with_model(cfg.name, spacy_service.build_model_name(cfg))

    def create_with_model(self, name: str, model_name: str):
        key = name_key(name)
        if is_name_taken(key):
            raise HTTPException(status_code=409, detail="A project with this name already exists")

        nlp = spacy_service.load(model_name)

        labels_list = spacy_service.get_labels(nlp)
        project = {
            "id": str(uuid.uuid4()),
            "name": name.strip(),
            "model": model_name,
            "labels": {l: {} for l in labels_list} # initialize as dict
        }

        save_project(project)
        register_name(key, project["id"])
        return project



class ProjectListService:
    def list_with_stats(self):
        out = []
        for path in sorted(BASE_PATH.iterdir()):
            if not path.is_dir():
                continue
            if path.name.startswith("."):
                continue
            cfg_path = path / "config.json"
            if not cfg_path.exists():
                continue
            cfg = load_json(cfg_path) or {}
            pid = path.name
            did = cfg.get("id") or pid
            docs = load_docs(did)
            n = len(docs)
            v = sum(1 for d in docs if d.get("validated"))
            out.append(
                {
                    "id": did,
                    "name": cfg.get("name", did[:8]),
                    "model": cfg.get("model", ""),
                    "labels": cfg.get("labels", {}),
                    "doc_count": n,
                    "validated_count": v,
                    "all_validated": n > 0 and v == n,
                    "validation_percent": int(100 * v / n) if n else 0,
                }
            )
        return sorted(out, key=lambda x: (x.get("name") or "").lower())


project_service = ProjectService()
project_list_service = ProjectListService()