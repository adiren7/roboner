from app.services.spacy_service import spacy_service
from app.storage.file_store import save_docs, save_spacy_validated_export
import uuid


class InferenceService:

    def run_batch(self, project, texts):

        nlp = spacy_service.load(project["model"])

        docs = []

        for text in texts:
            docs.append({
                "id": str(uuid.uuid4()),
                "text": text,
                "entities": spacy_service.predict(nlp, text),
                "validated": False
            })

        save_docs(project["id"], docs)
        save_spacy_validated_export(project["id"], docs)

        return docs
    
inference_service = InferenceService()