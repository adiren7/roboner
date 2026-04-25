import json
import re
from pathlib import Path
from typing import Optional

import threading
import os

BASE_PATH = Path("data")
REGISTRY_PATH = BASE_PATH / "project_registry.json"
_file_lock = threading.Lock()


def _registry_default():
    return {"name_to_id": {}}


def get_project_path(project_id: str) -> Path:
    return BASE_PATH / project_id


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with _file_lock:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())


def load_json(path: Path):
    if not path.exists():
        return None
    with _file_lock:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


def load_project(project_id: str):
    path = get_project_path(project_id) / "config.json"
    return load_json(path)


def save_project(project: dict):
    path = get_project_path(project["id"]) / "config.json"
    save_json(path, project)


def load_docs(project_id: str):
    path = get_project_path(project_id) / "docs.json"
    return load_json(path) or []


def save_docs(project_id: str, docs):
    path = get_project_path(project_id) / "docs.json"
    save_json(path, docs)


def normalize_project_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip())


def load_registry() -> dict:
    data = load_json(REGISTRY_PATH)
    if not data:
        return _registry_default()
    if "name_to_id" not in data:
        data["name_to_id"] = {}
    return data


def save_registry(registry: dict):
    save_json(REGISTRY_PATH, registry)


def is_name_taken(name_key: str) -> bool:
    reg = load_registry()
    return name_key in reg["name_to_id"]


def register_name(name_key: str, project_id: str):
    reg = load_registry()
    if name_key in reg["name_to_id"] and reg["name_to_id"][name_key] != project_id:
        raise ValueError("Project name already in use")
    reg["name_to_id"][name_key] = project_id
    save_registry(reg)


def remove_registry_name(name_key: str, project_id: str):
    reg = load_registry()
    if reg["name_to_id"].get(name_key) == project_id:
        del reg["name_to_id"][name_key]
        save_registry(reg)


def get_id_by_name(name_key: str) -> Optional[str]:
    reg = load_registry()
    return reg["name_to_id"].get(name_key)


def name_key(name: str) -> str:
    return normalize_project_name(name).lower()


def save_spacy_validated_export(project_id: str, docs: list) -> None:
    out = []
    for d in docs:
        if not d.get("validated"):
            continue
        trip = [
            [e["start"], e["end"], e["label"]]
            for e in d.get("entities", [])
        ]
        out.append([d["text"], {"entities": trip}])
    path = get_project_path(project_id) / "spacy_validated.json"
    save_json(path, out)


def delete_project_data(project_id: str):
    p = load_project(project_id)
    if p:
        remove_registry_name(name_key(p["name"]), project_id)
    path = get_project_path(project_id)
    if path.exists():
        import shutil
        shutil.rmtree(path)


def rename_project_data(project_id: str, new_name: str):
    p = load_project(project_id)
    if not p:
        raise ValueError("Project not found")
    
    old_key = name_key(p["name"])
    new_key = name_key(new_name)
    
    if old_key != new_key:
        if is_name_taken(new_key):
            raise ValueError("New name already in use")
        remove_registry_name(old_key, project_id)
        register_name(new_key, project_id)
    
    p["name"] = normalize_project_name(new_name)
    save_project(p)
    return p