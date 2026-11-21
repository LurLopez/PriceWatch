"""PriceWatch — Motor de Ponderación Multicriterio (FastAPI).

Microservicio de cálculo analítico especializado en normalización
Min-Max y optimización de utilidad multiatributo (MAUT).
"""

import json
import logging
import time
import uuid
from typing import Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from sources import (
    SourceSearchRequest,
    SourceSearchResponse,
    search_demo_products,
)

app = FastAPI(
    title="PriceWatch Analytics Evaluator",
    version="1.0.0",
    description="Motor de optimización y ranking multicriterio para productos comerciales.",
)

logger = logging.getLogger("pricewatch-evaluator")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)

METRICS = {
    "started_at": time.time(),
    "total_requests": 0,
    "error_requests": 0,
    "total_duration_ms": 0.0,
    "status_counts": {},
}


@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    """Propaga x-request-id y registra una línea JSON por solicitud."""
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    started_at = time.perf_counter()
    status = 500

    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["x-request-id"] = request_id
        return response
    finally:
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        METRICS["total_requests"] += 1
        METRICS["total_duration_ms"] += duration_ms
        if status >= 400:
            METRICS["error_requests"] += 1
        status_key = str(status)
        METRICS["status_counts"][status_key] = (
            METRICS["status_counts"].get(status_key, 0) + 1
        )
        logger.info(
            json.dumps(
                {
                    "timestamp": time.strftime(
                        "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
                    ),
                    "level": "error" if status >= 500 else "info",
                    "service": "pricewatch-evaluator",
                    "message": "request.completed",
                    "requestId": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": status,
                    "durationMs": duration_ms,
                }
            )
        )


class WeightVector(BaseModel):
    weight_price: float = Field(0.40, ge=0.0, le=1.0, description="Importancia del precio (0 a 1)")
    weight_quality: float = Field(0.30, ge=0.0, le=1.0, description="Importancia de la calidad (0 a 1)")
    weight_stock: float = Field(0.10, ge=0.0, le=1.0, description="Importancia de la disponibilidad (0 a 1)")
    weight_specs: float = Field(0.20, ge=0.0, le=1.0, description="Importancia de especificaciones (0 a 1)")


class ProductInput(BaseModel):
    id: str
    name: str
    category: str
    brand: str
    price: float = Field(..., gt=0)
    quality_rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    stock: Optional[int] = Field(None, ge=0)
    specs_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    image_url: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    currency: Optional[str] = None


class EvaluateRequest(BaseModel):
    weights: Optional[WeightVector] = None
    products: List[ProductInput]
    context_profile: Literal["economia", "equilibrado", "valoraciones", "personalizado"] = "personalizado"
    source_run_id: Optional[str] = None


class BreakdownScore(BaseModel):
    normalized_price: float
    normalized_quality: float
    normalized_stock: float
    normalized_specs: float
    weighted_price_contribution: float
    weighted_quality_contribution: float
    weighted_stock_contribution: float
    weighted_specs_contribution: float


class RankedProduct(BaseModel):
    id: str
    name: str
    category: str
    brand: str
    price: float
    quality_rating: Optional[float] = None
    stock: Optional[int] = None
    specs_score: Optional[float] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    currency: Optional[str] = None
    rank_position: int
    final_score: float
    level: str
    breakdown: BreakdownScore
    reasons: List[str]


class EvaluateResponse(BaseModel):
    status: str
    total_products_evaluated: int
    top_recommended_product_id: Optional[str]
    global_explanation: str
    warnings: List[str]
    ranking: List[RankedProduct]
    context_profile: str
    active_criteria: List[str]
    ignored_criteria: List[str]
    effective_weights: Dict[str, float]
    source_run_id: Optional[str] = None


@app.get("/health")
def health_check():
    """Chequeo de salud del servicio analítico."""
    return {
        "status": "ok",
        "service": "pricewatch-evaluator",
        "version": "1.0.0",
        "algorithm": "maut-multi-attribute-utility-theory-minmax",
    }


@app.post("/sources/demo-products/search", response_model=SourceSearchResponse)
async def search_demo_product_source(payload: SourceSearchRequest):
    """Consulta una página acotada de la API de productos de demostración."""
    return await search_demo_products(payload)


@app.get("/metrics")
def metrics_snapshot():
    """Métricas operativas internas del motor analítico."""
    total = METRICS["total_requests"]
    errors = METRICS["error_requests"]
    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptimeSeconds": round(time.time() - METRICS["started_at"], 2),
        "totalRequests": total,
        "errorRequests": errors,
        "errorRate": round((errors / total) * 100, 2) if total else 0,
        "averageResponseTimeMs": (
            round(METRICS["total_duration_ms"] / total, 2) if total else 0
        ),
        "statusCounts": METRICS["status_counts"],
    }


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate_ranking(payload: EvaluateRequest):
    """Calcula el ranking multicriterio MAUT con normalización Min-Max."""
    if not payload.products:
        raise HTTPException(status_code=400, detail="La lista de productos no puede estar vacía.")

    profiles = {
        "economia": WeightVector(
            weight_price=0.70,
            weight_quality=0.10,
            weight_stock=0.15,
            weight_specs=0.05,
        ),
        "equilibrado": WeightVector(
            weight_price=0.40,
            weight_quality=0.30,
            weight_stock=0.10,
            weight_specs=0.20,
        ),
        "valoraciones": WeightVector(
            weight_price=0.15,
            weight_quality=0.65,
            weight_stock=0.10,
            weight_specs=0.10,
        ),
    }
    weights = payload.weights or WeightVector()
    if payload.context_profile != "personalizado":
        weights = profiles[payload.context_profile]

    criteria_fields = {
        "price": [product.price for product in payload.products],
        "quality": [product.quality_rating for product in payload.products],
        "stock": [product.stock for product in payload.products],
        "specs": [product.specs_score for product in payload.products],
    }
    active_criteria = [
        criterion
        for criterion, values in criteria_fields.items()
        if all(value is not None for value in values)
    ]
    ignored_criteria = [
        criterion for criterion in criteria_fields if criterion not in active_criteria
    ]

    criterion_weights = {
        "price": weights.weight_price,
        "quality": weights.weight_quality,
        "stock": weights.weight_stock,
        "specs": weights.weight_specs,
    }
    active_weight_sum = sum(criterion_weights[key] for key in active_criteria)
    if active_weight_sum <= 0:
        raise HTTPException(
            status_code=400,
            detail="El perfil no asigna peso positivo a ningún criterio disponible.",
        )

    # Normalizar pesos para que sumen exactamente 1.0
    effective_weights = {
        key: (criterion_weights[key] / active_weight_sum if key in active_criteria else 0.0)
        for key in criterion_weights
    }
    w_p = effective_weights["price"]
    w_q = effective_weights["quality"]
    w_s = effective_weights["stock"]
    w_e = effective_weights["specs"]

    # Rangos para normalización Min-Max
    prices = [p.price for p in payload.products]
    min_price, max_price = min(prices), max(prices)
    price_range = max_price - min_price

    stocks = [p.stock for p in payload.products if p.stock is not None]
    min_stock = min(stocks) if stocks else 0
    max_stock = max(stocks) if stocks else 0
    stock_range = max_stock - min_stock

    ranked_items = []
    warnings = []

    for p in payload.products:
        # 1. Normalización de Precio (Invertida: menor precio = mayor utilidad)
        if price_range == 0:
            norm_price = 1.0
        else:
            norm_price = (max_price - p.price) / price_range

        # 2. Normalización de Calidad (Escala fija 1 a 5)
        norm_quality = (
            max(0.0, min(1.0, (p.quality_rating - 1.0) / 4.0))
            if p.quality_rating is not None and "quality" in active_criteria
            else 0.0
        )

        # 3. Normalización de Stock (Mayor disponibilidad = mayor utilidad)
        if p.stock is None or "stock" not in active_criteria:
            norm_stock = 0.0
        elif stock_range == 0:
            norm_stock = 1.0 if p.stock > 0 else 0.0
        else:
            norm_stock = (p.stock - min_stock) / stock_range

        # 4. Normalización de Especificaciones (Escala fija 0 a 100)
        norm_specs = (
            max(0.0, min(1.0, p.specs_score / 100.0))
            if p.specs_score is not None and "specs" in active_criteria
            else 0.0
        )

        # Contribución ponderada
        c_p = norm_price * w_p
        c_q = norm_quality * w_q
        c_s = norm_stock * w_s
        c_e = norm_specs * w_e

        final_score = round((c_p + c_q + c_s + c_e) * 100, 2)

        # Categorización de nivel
        if final_score >= 80:
            level = "Altamente Recomendado"
        elif final_score >= 60:
            level = "Recomendado"
        elif final_score >= 40:
            level = "Aceptable"
        else:
            level = "No Favorable"

        reasons = []
        if norm_price >= 0.75:
            reasons.append("Destacado ahorro económico frente al grupo comparado.")
        if "quality" in active_criteria and norm_quality >= 0.8:
            reasons.append(f"Alta satisfacción y valoración de usuarios ({p.quality_rating}/5.0).")
        if "stock" in active_criteria and p.stock is not None and p.stock <= 3:
            reasons.append(f"Stock reducido ({p.stock} unidades).")
            if p.stock == 0:
                warnings.append(f"El producto '{p.name}' no tiene stock disponible.")
        if "specs" in active_criteria and norm_specs >= 0.85:
            reasons.append(f"Rendimiento técnico superior ({p.specs_score}/100).")

        breakdown = BreakdownScore(
            normalized_price=round(norm_price, 3),
            normalized_quality=round(norm_quality, 3),
            normalized_stock=round(norm_stock, 3),
            normalized_specs=round(norm_specs, 3),
            weighted_price_contribution=round(c_p * 100, 2),
            weighted_quality_contribution=round(c_q * 100, 2),
            weighted_stock_contribution=round(c_s * 100, 2),
            weighted_specs_contribution=round(c_e * 100, 2),
        )

        ranked_items.append({
            "product": p,
            "final_score": final_score,
            "level": level,
            "breakdown": breakdown,
            "reasons": reasons,
        })

    # Ordenar de mayor a menor puntuación
    ranked_items.sort(key=lambda x: x["final_score"], reverse=True)

    final_ranking: List[RankedProduct] = []
    for idx, item in enumerate(ranked_items, start=1):
        p = item["product"]
        final_ranking.append(
            RankedProduct(
                id=p.id,
                name=p.name,
                category=p.category,
                brand=p.brand,
                price=p.price,
                quality_rating=p.quality_rating,
                stock=p.stock,
                specs_score=p.specs_score,
                image_url=p.image_url,
                description=p.description,
                source=p.source,
                source_url=p.source_url,
                currency=p.currency,
                rank_position=idx,
                final_score=item["final_score"],
                level=item["level"],
                breakdown=item["breakdown"],
                reasons=item["reasons"],
            )
        )

    top_item = final_ranking[0]
    top_bd = top_item.breakdown

    factors = []
    if top_bd.weighted_price_contribution >= 25:
        factors.append("su conveniencia económica")
    if top_bd.weighted_quality_contribution >= 25:
        factors.append("su alta valoración de calidad")
    if top_bd.weighted_stock_contribution >= 15:
        factors.append("su disponibilidad inmediata")
    if top_bd.weighted_specs_contribution >= 20:
        factors.append("su potencia en especificaciones")

    factor_text = ", ".join(factors) if factors else "un equilibrio consistente en todos los criterios"

    profile_labels = {
        "economia": "ahorro",
        "equilibrado": "equilibrado",
        "valoraciones": "valoraciones",
        "personalizado": "personalizado",
    }
    criterion_labels = {
        "price": "precio",
        "quality": "valoración",
        "stock": "disponibilidad",
        "specs": "especificaciones",
    }
    active_text = ", ".join(criterion_labels[key] for key in active_criteria)
    explanation = (
        f"El producto '{top_item.name}' ({top_item.brand}) lidera la muestra "
        f"con {top_item.final_score}/100 puntos usando el perfil de "
        f"{profile_labels[payload.context_profile]}. Se consideran: {active_text}. "
        f"La posición se explica principalmente por {factor_text}."
    )

    if ignored_criteria:
        ignored_text = ", ".join(criterion_labels[key] for key in ignored_criteria)
        warnings.append(
            "Criterios omitidos por falta de datos en toda la muestra: "
            + ignored_text
            + "."
        )
    if payload.source_run_id:
        warnings.append(
            "La fuente utilizada contiene datos sintéticos de demostración; "
            "no representan precios ni disponibilidad reales."
        )

    return EvaluateResponse(
        status="success",
        total_products_evaluated=len(final_ranking),
        top_recommended_product_id=top_item.id,
        global_explanation=explanation,
        warnings=list(dict.fromkeys(warnings)),
        ranking=final_ranking,
        context_profile=payload.context_profile,
        active_criteria=active_criteria,
        ignored_criteria=ignored_criteria,
        effective_weights={
            "weight_price": effective_weights["price"],
            "weight_quality": effective_weights["quality"],
            "weight_stock": effective_weights["stock"],
            "weight_specs": effective_weights["specs"],
        },
        source_run_id=payload.source_run_id,
    )
