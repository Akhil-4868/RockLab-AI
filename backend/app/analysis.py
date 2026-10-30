import numpy as np
import pandas as pd

PROPERTIES = ["ucs_mpa", "porosity_pct", "pwave_km_s", "elastic_modulus_gpa"]
LABELS = {
    "ucs_mpa": "UCS (MPa)",
    "porosity_pct": "Porosity (%)",
    "pwave_km_s": "P-wave velocity (km/s)",
    "elastic_modulus_gpa": "Elastic modulus (GPa)",
}

def records_to_frame(rows):
    return pd.DataFrame([{
        "sample_id": r.sample_id, "lithology": r.lithology,
        "temperature_c": r.temperature_c, **{p: getattr(r, p) for p in PROPERTIES},
        "strain_pct": r.strain_pct, "stress_mpa": r.stress_mpa
    } for r in rows])

def add_damage_index(df):
    df = df.copy()
    # Operational proxy: fractional decrease in P-wave velocity vs lowest-temperature
    # observation within each sample_id/lithology group. Not a universal damage standard.
    df["thermal_damage_index"] = np.nan
    if "pwave_km_s" not in df or df["pwave_km_s"].notna().sum() == 0:
        return df
    keys = ["sample_id", "lithology"]
    for _, idx in df.groupby(keys, dropna=False).groups.items():
        group = df.loc[idx]
        baseline_rows = group[group["temperature_c"] == group["temperature_c"].min()]
        baseline = baseline_rows["pwave_km_s"].dropna()
        if len(baseline):
            v0 = baseline.iloc[0]
            if v0 > 0:
                df.loc[idx, "thermal_damage_index"] = (1 - df.loc[idx, "pwave_km_s"] / v0).clip(0, 1)
    return df

def synthetic_rows():
    rows = []
    temps = [25, 100, 200, 300, 400, 500, 600, 700]
    for lith, base in [("Sandstone", (88, 5.0, 4.2, 26)), ("Dolerite", (165, 1.8, 5.8, 72))]:
        for s in range(1, 9):
            factor = 1 + (s - 4.5) * 0.018
            for t in temps:
                thermal = max(0, t - 25) / 675
                # Illustrative deterministic trends with mild variation.
                ucs = base[0] * factor * (1 - 0.58 * thermal**1.35)
                por = base[1] + (2.0 if lith == "Sandstone" else 3.2) * thermal + 0.3 * thermal**2
                pw = base[2] * (1 - 0.42 * thermal) * factor**0.15
                em = base[3] * factor * (1 - 0.52 * thermal**1.2)
                rows.append(dict(sample_id=f"{lith[:2].upper()}-{s:02d}", lithology=lith,
                    temperature_c=t, ucs_mpa=round(ucs,2), porosity_pct=round(por,2),
                    pwave_km_s=round(pw,3), elastic_modulus_gpa=round(em,2),
                    strain_pct=None, stress_mpa=None))
    return rows
