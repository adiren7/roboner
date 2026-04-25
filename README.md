# NER Benchmark Platform

A SOTA platform for benchmarking and refining Named Entity Recognition (NER) models. This tool allows you to upload datasets, perform automated inference using spaCy models, and manually verify/correct annotations with a high efficiency frame based UI.

### Clone the repository

```bash
git clone <repository-url>
cd ner_benchmark_app_backend
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Start the services
```bash
docker compose up -d --build
```

- **Frontend**: [http://localhost:8080](http://localhost:8080)
- **Backend API**: [http://localhost:8001](http://localhost:8001) (API Docs: [http://localhost:8001/docs](http://localhost:8001/docs))


## 📂 Data Storage
Project configurations, documents, and annotations are saved in the `backend/data` directory.

- `backend/data/project_registry.json`: Mapping of project names to IDs.
- `backend/data/<project_id>/config.json`: Project settings and label hierarchy.
- `backend/data/<project_id>/docs.json`: All documents and their current entity states.
