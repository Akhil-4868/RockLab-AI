import io, os
import pandas as pd
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import Base, engine, get_db
from .models import Experiment
from .analysis import PROPERTIES, LABELS, synthetic_rows, records_to_frame, add_damage_index
from .ml import train_predict
from .schemas import PredictionRequest

Base.metadata.create_all(bind=engine)
app = FastAPI(title="RockLab AI API", version="1.0.0",
              description="Rock mechanics and thermal damage research MVP.")
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in origins],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def serialize(r):
    return {c: getattr(r, c) for c in ["id","sample_id","lithology","temperature_c",*PROPERTIES,"strain_pct","stress_mpa"]}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "RockLab AI"}

@app.get("/api/experiments")
def experiments(db: Session = Depends(get_db)):
    rows = db.query(Experiment).order_by(Experiment.lithology, Experiment.sample_id, Experiment.temperature_c).all()
    return [serialize(r) for r in rows]

@app.get("/api/summary")
def summary(db: Session = Depends(get_db)):
    q = db.query(Experiment)
    total = q.count()
    lithologies = [x[0] for x in db.query(Experiment.lithology).distinct().all()]
    avg_ucs = db.query(func.avg(Experiment.ucs_mpa)).scalar()
    avg_pwave = db.query(func.avg(Experiment.pwave_km_s)).scalar()
    max_temp = db.query(func.max(Experiment.temperature_c)).scalar()
    return {"total_observations": total, "lithologies": lithologies,
            "average_ucs_mpa": round(avg_ucs,2) if avg_ucs is not None else None,
            "average_pwave_km_s": round(avg_pwave,3) if avg_pwave is not None else None,
            "maximum_temperature_c": max_temp}

@app.post("/api/seed")
def seed(db: Session = Depends(get_db)):
    if db.query(Experiment).count() == 0:
        db.add_all([Experiment(**r) for r in synthetic_rows()])
        db.commit()
    return {"message": "Synthetic dataset ready", "count": db.query(Experiment).count()}

@app.get("/api/synthetic")
def synthetic():
    return synthetic_rows()

@app.get("/api/trends")
def trends(property: str = "ucs_mpa", db: Session = Depends(get_db)):
    if property not in PROPERTIES:
        raise HTTPException(400, f"Choose one of: {', '.join(PROPERTIES)}")
    rows = db.query(Experiment).all()
    if not rows:
        return []
    df = records_to_frame(rows)
    grouped = df.groupby(["lithology", "temperature_c"], as_index=False)[property].mean()
    return grouped.where(pd.notna(grouped), None).to_dict(orient="records")

@app.get("/api/damage")
def damage(db: Session = Depends(get_db)):
    rows = db.query(Experiment).all()
    if not rows:
        return []
    df = add_damage_index(records_to_frame(rows))
    return df.where(pd.notna(df), None).to_dict(orient="records")

@app.post("/api/upload")
async def upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file.")
    try:
        df = pd.read_csv(io.BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(400, f"Could not read CSV: {e}")
    required = {"temperature_c", "lithology"}
    if not required.issubset(df.columns):
        raise HTTPException(400, "CSV must include temperature_c and lithology.")
    if not set(PROPERTIES).intersection(df.columns):
        raise HTTPException(400, f"CSV must include at least one property: {', '.join(PROPERTIES)}")
    for col in ["sample_id", *PROPERTIES, "strain_pct", "stress_mpa"]:
        if col not in df.columns:
            df[col] = None if col != "sample_id" else "unknown"
    numeric = ["temperature_c", *PROPERTIES, "strain_pct", "stress_mpa"]
    for col in numeric:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["temperature_c", "lithology"])
    if df.empty:
        raise HTTPException(400, "No valid rows found.")
    objects = []
    for _, row in df.iterrows():
        payload = {"sample_id": str(row["sample_id"]), "lithology": str(row["lithology"]),
                   **{c: (None if pd.isna(row[c]) else float(row[c])) for c in numeric if c != "temperature_c"},
                   "temperature_c": float(row["temperature_c"])}
        objects.append(Experiment(**payload))
    db.add_all(objects); db.commit()
    return {"message": "Upload successful", "inserted_rows": len(objects)}

@app.post("/api/predict")
def predict(req: PredictionRequest, db: Session = Depends(get_db)):
    rows = db.query(Experiment).all()
    if not rows:
        raise HTTPException(400, "No experiments found. Load synthetic data or upload a CSV first.")
    try:
        result = train_predict(records_to_frame(rows), req.lithology, req.temperature_c, req.property)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"property": req.property, "model": "RandomForestRegressor", **result}
