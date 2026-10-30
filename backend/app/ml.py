import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from .analysis import PROPERTIES

def train_predict(df: pd.DataFrame, lithology: str, temperature_c: float, prop: str):
    if prop not in PROPERTIES:
        raise ValueError(f"Property must be one of: {', '.join(PROPERTIES)}")
    data = df[["lithology", "temperature_c", prop]].dropna().copy()
    if len(data) < 12 or data["lithology"].nunique() < 1 or data[prop].nunique() < 3:
        raise ValueError("At least 12 valid observations and 3 distinct target values are required.")
    data["lithology_code"] = data["lithology"].astype("category").cat.codes
    categories = data["lithology"].astype("category")
    code_map = dict(enumerate(categories.cat.categories))
    reverse = {v: k for k, v in code_map.items()}
    if lithology not in reverse:
        raise ValueError("Requested lithology is not present in the uploaded dataset.")
    X = data[["lithology_code", "temperature_c"]]
    y = data[prop]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
    model = RandomForestRegressor(n_estimators=160, random_state=42, min_samples_leaf=2)
    model.fit(X_train, y_train)
    pred = model.predict(pd.DataFrame([{"lithology_code": reverse[lithology], "temperature_c": temperature_c}]))[0]
    test_pred = model.predict(X_test)
    return {
        "predicted_value": round(float(pred), 4),
        "mae": round(float(mean_absolute_error(y_test, test_pred)), 4),
        "r2": round(float(r2_score(y_test, test_pred)), 4) if len(y_test) > 1 else None,
        "train_rows": len(X_train), "test_rows": len(X_test),
        "warning": "Exploratory model trained on the current dataset. Random row split may overestimate performance when repeated measurements belong to the same core; validate with sample-grouped splits."
    }
