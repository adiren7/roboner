from fastapi import FastAPI
from app.api import project, inference, annotation

app = FastAPI(title="NER Benchmark API")

app.include_router(project.router)
app.include_router(inference.router)
app.include_router(annotation.router)


@app.get("/")
def root():
    return {"message": "NER Benchmark API is running"}