import spacy
import uuid
import subprocess


class SpacyService:
    def __init__(self):
        self.cache = {}

    def build_model_name(self, cfg):
        return f"{cfg.lang}_{cfg.type}_{cfg.genre}_{cfg.size}"

    def load(self, model_name: str):
        if model_name in self.cache:
            return self.cache[model_name]

        try:
            nlp = spacy.load(model_name)
        except OSError:
            subprocess.run(
                ["python", "-m", "spacy", "download", model_name],
                check=True
            )
            nlp = spacy.load(model_name)

        self.cache[model_name] = nlp
        return nlp

    def predict(self, nlp, text: str):
        doc = nlp(text)

        return [
            {
                "id": str(uuid.uuid4()),
                "start": ent.start_char,
                "end": ent.end_char,
                "label": ent.label_,
                "source": "model",
                "confidence": None
            }
            for ent in doc.ents
        ]

    def get_labels(self, nlp):
        return list(nlp.get_pipe("ner").labels)


spacy_service = SpacyService()