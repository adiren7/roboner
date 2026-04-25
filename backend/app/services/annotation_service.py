from app.storage.file_store import load_docs, save_docs, save_spacy_validated_export
import uuid


class AnnotationService:

    def _save_docs(self, project_id, docs):
        save_docs(project_id, docs)
        save_spacy_validated_export(project_id, docs)

    # overlap entity span validation
    def _validate_no_overlap(self, entities):
        ents = sorted(entities, key=lambda x: x["start"])

        for i in range(len(ents) - 1):
            if ents[i]["end"] > ents[i + 1]["start"]:
                raise ValueError("Overlapping entities detected")

    # add entity
    def add_entity(self, project_id, doc_id, entity):

        docs = load_docs(project_id)

        for doc in docs:
            if doc["id"] == doc_id:

                new_entity = {
                    "id": str(uuid.uuid4()),
                    "start": entity["start"],
                    "end": entity["end"],
                    "label": entity["label"],
                    "source": "user",     # ✅ FIXED
                    "confidence": 1
                }

                doc["entities"].append(new_entity)

                self._validate_no_overlap(doc["entities"])

                doc["validated"] = False
                self._save_docs(project_id, docs)

                return new_entity

        raise ValueError("Document not found")

    # update label
    def update_entity_label(self, project_id, doc_id, entity_id, label):

        docs = load_docs(project_id)

        for doc in docs:
            if doc["id"] == doc_id:

                found = False

                for e in doc["entities"]:
                    if e["id"] == entity_id:
                        e["label"] = label
                        e["source"] = "user"   
                        e["confidence"] = 1
                        found = True

                if not found:
                    raise ValueError("Entity not found")

                doc["validated"] = False
                self._save_docs(project_id, docs)

                # find the updated entity again to return it
                for e in doc["entities"]:
                    if e["id"] == entity_id:
                        return e

        raise ValueError("Document not found")

    # update span
    def update_entity_span(self, project_id, doc_id, entity_id, start, end):

        docs = load_docs(project_id)

        for doc in docs:
            if doc["id"] == doc_id:

                found = False

                updated_entities = []

                for e in doc["entities"]:
                    if e["id"] == entity_id:

                        updated_entities.append({
                            **e,
                            "start": start,
                            "end": end,
                            "source": "user",   
                            "confidence": 1
                        })

                        found = True
                    else:
                        updated_entities.append(e)

                if not found:
                    raise ValueError("Entity not found")

                self._validate_no_overlap(updated_entities)

                doc["entities"] = updated_entities
                doc["validated"] = False

                self._save_docs(project_id, docs)

                # return the updated entity
                for e in doc["entities"]:
                    if e["id"] == entity_id:
                        return e

        raise ValueError("Document not found")

    # delete entity

    def delete_entity(self, project_id, doc_id, entity_id):

        docs = load_docs(project_id)

        for doc in docs:
            if doc["id"] == doc_id:

                before = len(doc["entities"])

                doc["entities"] = [
                    e for e in doc["entities"]
                    if e["id"] != entity_id
                ]

                if len(doc["entities"]) == before:
                    raise ValueError("Entity not found")

                doc["validated"] = False
                self._save_docs(project_id, docs)

                return {"status": "entity_deleted"}

        raise ValueError("Document not found")

    # update doc validation tag

    def update_doc_validated(self, project_id, doc_id, validated: bool):

        docs = load_docs(project_id)

        for doc in docs:
            if doc["id"] == doc_id:
                doc["validated"] = bool(validated)
                self._save_docs(project_id, docs)
                return {"status": "validation_updated", "validated": doc["validated"]}

        raise ValueError("Document not found")

    # update all docs validation tag
    def validate_all_docs(self, project_id: str):
        docs = load_docs(project_id)
        for doc in docs:
            doc["validated"] = True
        self._save_docs(project_id, docs)
        return {
            "status": "all_validated",
            "count": len(docs),
        }