from app.storage.file_store import load_docs


class ExportService:

    def to_spacy_format(self, project_id):

        docs = load_docs(project_id)

        dataset = []

        for d in docs:
            entities = [
                (e["start"], e["end"], e["label"])
                for e in d["entities"]
            ]

            dataset.append((d["text"], {"entities": entities}))

        return dataset


export_service = ExportService()