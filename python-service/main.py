"""PriceWatch — Motor de Ponderación Multicriterio (FastAPI).

Microservicio de cálculo analítico especializado en normalización
Min-Max y optimización de utilidad multiatributo (MAUT).
"""

from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="PriceWatch Analytics Evaluator",
    version="1.0.0",
    description="Motor de optimización y ranking multicriterio para productos comerciales.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    quality_rating: float = Field(..., ge=1.0, le=5.0)
    stock: int = Field(..., ge=0)
    specs_score: float = Field(..., ge=0.0, le=100.0)
    image_url: Optional[str] = None
    description: Optional[str] = None


class EvaluateRequest(BaseModel):
    weights: WeightVector
    products: List[ProductInput]


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
    quality_rating: float
    stock: int
    specs_score: float
    image_url: Optional[str] = None
    description: Optional[str] = None
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


@app.get("/health")
def health_check():
    """Chequeo de salud del servicio analítico."""
    return {
        "status": "ok",
        "service": "pricewatch-evaluator",
        "version": "1.0.0",
        "algorithm": "maut-multi-attribute-utility-theory-minmax",
    }


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate_ranking(payload: EvaluateRequest):
    """Calcula el ranking multicriterio MAUT con normalización Min-Max."""
    if not payload.products:
        raise HTTPException(status_code=400, detail="La lista de productos no puede estar vacía.")

    weights = payload.weights
    w_sum = weights.weight_price + weights.weight_quality + weights.weight_stock + weights.weight_specs
    if w_sum <= 0:
        raise HTTPException(status_code=400, detail="La suma de pesos debe ser mayor que 0.")

    # Normalizar pesos para que sumen exactamente 1.0
    w_p = weights.weight_price / w_sum
    w_q = weights.weight_quality / w_sum
    w_s = weights.weight_stock / w_sum
    w_e = weights.weight_specs / w_sum

    # Rangos para normalización Min-Max
    prices = [p.price for p in payload.products]
    min_price, max_price = min(prices), max(prices)
    price_range = max_price - min_price

    stocks = [p.stock for p in payload.products]
    min_stock, max_stock = min(stocks), max(stocks)
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
        norm_quality = (p.quality_rating - 1.0) / 4.0
        norm_quality = max(0.0, min(1.0, norm_quality))

        # 3. Normalización de Stock (Mayor disponibilidad = mayor utilidad)
        if stock_range == 0:
            norm_stock = 1.0 if p.stock > 0 else 0.0
        else:
            norm_stock = (p.stock - min_stock) / stock_range

        # 4. Normalización de Especificaciones (Escala fija 0 a 100)
        norm_specs = p.specs_score / 100.0
        norm_specs = max(0.0, min(1.0, norm_specs))

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
        if norm_quality >= 0.8:
            reasons.append(f"Alta satisfacción y valoración de usuarios ({p.quality_rating}/5.0).")
        if p.stock <= 3:
            reasons.append(f"Stock reducido ({p.stock} unidades).")
            if p.stock == 0:
                warnings.append(f"El producto '{p.name}' no tiene stock disponible.")
        if norm_specs >= 0.85:
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

    explanation = (
        f"El producto '{top_item.name}' ({top_item.brand}) lidera la comparativa "
        f"con {top_item.final_score}/100 puntos. Su primera posición se explica "
        f"principalmente por {factor_text}, de acuerdo con tus prioridades."
    )

    return EvaluateResponse(
        status="success",
        total_products_evaluated=len(final_ranking),
        top_recommended_product_id=top_item.id,
        global_explanation=explanation,
        warnings=list(set(warnings)),
        ranking=final_ranking,
    )
