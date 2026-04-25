#!/bin/bash

backend/
│
├── app/
│   ├── api (routes)/    
│   │   ├── project.py 
│   │   ├── inference.py
│   │   └── annotation.py
│   │
│   ├── services/
│   │   ├── spacy_service.py (spacy models loading + prediction logic )
│   │   ├── project_service.py (project creation : model config loading and saving in project_id inside data folder)
│   │   ├── inference_service.py (inference engine : generates entities with spans and labels)
│   │   ├── annotation_service.py ( IMPORTANT : load entities doc for UI interaction + update entities doc after user correction)
│   │   └── export_service.py ( maintain training data format for spacy models)
│   │
│   ├── schemas/
│   │   ├── project.py
│   │   ├── document.py
│   │   └── ner.py
│   │
│   ├── storage/
│   │   └── file_store.py (files saving logic IT CAN BE CHANGED AFTER WITH POSTGRES ...)
│   │
│   └── main.py
│
├── data/ (where we save our files)
└── requirements.txt