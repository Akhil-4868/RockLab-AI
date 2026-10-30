from sqlalchemy import Integer, Float, String
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Experiment(Base):
    __tablename__ = "experiments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sample_id: Mapped[str] = mapped_column(String(80), default="unknown", index=True)
    lithology: Mapped[str] = mapped_column(String(80), index=True)
    temperature_c: Mapped[float] = mapped_column(Float, index=True)
    ucs_mpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    porosity_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    pwave_km_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    elastic_modulus_gpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    strain_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    stress_mpa: Mapped[float | None] = mapped_column(Float, nullable=True)
