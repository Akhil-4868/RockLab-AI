# RockLab AI
**Thermal Damage & Rock Mechanical Properties Analysis Platform**

RockLab AI is a full-stack research MVP for organizing rock mechanics experiments, analyzing temperature-dependent changes in rock properties, visualizing stress-strain curves, and exploring baseline machine-learning predictions.

## Features
- Synthetic sandstone/dolerite experiment dataset for immediate testing.
- CSV upload for experimental observations.
- Temperature/property trend analysis for UCS, porosity, P-wave velocity and elastic modulus.
- Derived thermal damage indicator based on normalized P-wave velocity reduction relative to the lowest-temperature reference for each lithology/sample group.
- Stress-strain curve visualization when strain and stress columns are supplied.
- Random Forest regression with train/test evaluation when enough rows and temperature/property variation exist.
- Experiment records persisted in SQLite by default; PostgreSQL can be configured.
- REST API with interactive Swagger docs.

> Research caution: synthetic data is illustrative. The thermal damage indicator is an operational proxy, not a universal standard. ML predictions are exploratory and must not replace laboratory testing, geological interpretation or validation on independent samples.

## Stack
- Frontend: React, Vite, TypeScript, Recharts
- Backend: Python, FastAPI, SQLAlchemy, Pandas, NumPy, scikit-learn
- Database: SQLite by default; PostgreSQL supported via `DATABASE_URL`

## Requirements
- Python 3.10+
- Node.js 20+
- npm

## Run on Windows (PowerShell)

### 1. Backend
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
API docs: http://127.0.0.1:8000/docs

### 2. Frontend
Open a second terminal from the project root:
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## CSV format
Required columns:
- `temperature_c`
- `lithology` (e.g. Sandstone, Dolerite)
- At least one property column: `ucs_mpa`, `porosity_pct`, `pwave_km_s`, `elastic_modulus_gpa`

Optional:
- `sample_id`
- `strain_pct`
- `stress_mpa`

Example:
```csv
sample_id,lithology,temperature_c,ucs_mpa,porosity_pct,pwave_km_s,elastic_modulus_gpa
S01,Sandstone,25,82,5.2,4.1,24
S01,Sandstone,200,75,5.8,3.9,22
S01,Sandstone,400,61,7.1,3.4,18
```

## API overview
- `GET /api/health`
- `GET /api/experiments`
- `GET /api/summary`
- `GET /api/trends?property=ucs_mpa`
- `GET /api/synthetic`
- `POST /api/upload` (multipart CSV)
- `POST /api/predict` (JSON prediction request)

## Database
SQLite database is created automatically at `backend/rocklab.db`. To use PostgreSQL, set `DATABASE_URL` in `backend/.env`, for example:
`postgresql+psycopg://rocklab:password@localhost:5432/rocklab`

## Project structure
```text
rocklab-ai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── analysis.py
│   │   └── ml.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── sample-data/
│   └── synthetic_rock_experiments.csv
└── .gitignore
```

## GitHub
Create an empty repository named `RockLab-AI`, then run from the project root:
```powershell
git init -b main
git add .
git commit -m "Initial release: RockLab AI"
git remote add origin https://github.com/YOUR_USERNAME/RockLab-AI.git
git push -u origin main
```

## Responsible interpretation
- Compare like-for-like lithologies and sample groups.
- Do not infer causal mechanisms from correlation alone.
- Avoid training/testing leakage: samples from the same physical core should ideally be grouped together in validation.
- Report dataset size, missingness and model metrics alongside predictions.
