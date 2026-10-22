"""Obtención y normalización de la API de productos de demostración.

DummyJSON sirve datos de ejemplo para prototipos. No representa ofertas,
precios, valoraciones ni inventario reales.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator

SOURCE_NAME = "dummyjson"
SOURCE_ENDPOINT = "https://dummyjson.com/products/search"
MAX_RESPONSE_BYTES = 1_000_000


class SourceSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=80)
    limit: int = Field(default=10, ge=2, le=20)
    acknowledged: bool

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("La búsqueda debe tener al menos dos caracteres.")
        if not re.fullmatch(r"[\w .+#-]+", cleaned, flags=re.UNICODE):
            raise ValueError("La búsqueda solo puede contener palabras y códigos de producto.")
        return cleaned

    @field_validator("acknowledged")
    @classmethod
    def require_explicit_acknowledgement(cls, value: bool) -> bool:
        if not value:
            raise ValueError("La consulta requiere confirmación explícita.")
        return value


class SourceListing(BaseModel):
    external_id: str
    title: str
    category: Optional[str] = None
    brand: Optional[str] = None
    price: float
    currency: Optional[str] = None
    rating: Optional[float] = None
    availability_reference: Optional[int] = None
    specs: dict[str, Any] = Field(default_factory=dict)
    source_url: str
    content_hash: str
    retrieved_at: str


class SourceMetrics(BaseModel):
    received: int
    accepted: int
    rejected: int
    duplicates: int


class SourceSearchResponse(BaseModel):
    provider: str
    query: str
    retrieved_at: str
    duration_ms: float
    metrics: SourceMetrics
    products: list[SourceListing]


def _clean_text(value: Any, max_length: int = 160) -> Optional[str]:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return cleaned[:max_length] or None


def _clean_number(value: Any, minimum: float = 0) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if not math.isfinite(number) or number < minimum:
        return None
    return number


def _clean_specs(record: dict[str, Any]) -> dict[str, Any]:
    """Keep only a small allowlist; discard descriptions, images and reviews."""
    specs: dict[str, Any] = {}
    for source_key, target_key in (
        ("warrantyInformation", "warranty"),
        ("availabilityStatus", "availability_status"),
    ):
        value = _clean_text(record.get(source_key), 100)
        if value:
            specs[target_key] = value

    weight = _clean_number(record.get("weight"))
    if weight is not None:
        specs["weight"] = weight

    dimensions = record.get("dimensions")
    if isinstance(dimensions, dict):
        clean_dimensions = {
            key: number
            for key in ("width", "height", "depth")
            if (number := _clean_number(dimensions.get(key))) is not None
        }
        if clean_dimensions:
            specs["dimensions"] = clean_dimensions

    return specs


def _normalize_product(record: Any, retrieved_at: str) -> SourceListing:
    if not isinstance(record, dict):
        raise ValueError("invalid_record")

    external_id = record.get("id")
    if isinstance(external_id, bool) or not isinstance(external_id, (str, int)):
        raise ValueError("missing_id")
    external_id = str(external_id).strip()
    if not external_id.isdigit() or len(external_id) > 20:
        raise ValueError("invalid_id")

    title = _clean_text(record.get("title"), 240)
    if not title:
        raise ValueError("missing_title")

    price = _clean_number(record.get("price"), minimum=0.000001)
    if price is None:
        raise ValueError("invalid_price")

    rating = _clean_number(record.get("rating"))
    if rating is not None and rating > 5:
        rating = None

    stock_value = record.get("stock")
    availability = None
    if not isinstance(stock_value, bool) and isinstance(stock_value, int) and stock_value >= 0:
        availability = stock_value

    normalized_content = {
        "external_id": external_id,
        "title": title,
        "category": _clean_text(record.get("category"), 80),
        "brand": _clean_text(record.get("brand"), 100),
        "price": price,
        "rating": rating,
        "availability_reference": availability,
        "specs": _clean_specs(record),
    }
    serialized = json.dumps(
        normalized_content,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    content_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    return SourceListing(
        **normalized_content,
        currency=None,
        source_url=f"https://dummyjson.com/products/{external_id}",
        content_hash=content_hash,
        retrieved_at=retrieved_at,
    )


def normalize_source_response(
    payload: Any,
    query: str,
    duration_ms: float = 0,
    retrieved_at: Optional[str] = None,
) -> SourceSearchResponse:
    if not isinstance(payload, dict) or not isinstance(payload.get("products"), list):
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_INVALID_RESPONSE", "message": "La fuente devolvió un formato no válido."},
        )
    if len(payload["products"]) > 20:
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_LIMIT_EXCEEDED", "message": "La fuente superó el límite de registros."},
        )

    timestamp = retrieved_at or datetime.now(timezone.utc).isoformat()
    records = payload["products"]
    seen: set[str] = set()
    products: list[SourceListing] = []
    rejected = 0
    duplicates = 0

    for record in records:
        if isinstance(record, dict):
            raw_id = record.get("id")
            if isinstance(raw_id, (str, int)) and not isinstance(raw_id, bool):
                external_id = str(raw_id).strip()
                if external_id in seen:
                    duplicates += 1
                    continue
                seen.add(external_id)

        try:
            products.append(_normalize_product(record, timestamp))
        except ValueError:
            rejected += 1

    received = len(records)
    metrics = SourceMetrics(
        received=received,
        accepted=len(products),
        rejected=rejected,
        duplicates=duplicates,
    )
    return SourceSearchResponse(
        provider=SOURCE_NAME,
        query=query,
        retrieved_at=timestamp,
        duration_ms=round(max(0, duration_ms), 3),
        metrics=metrics,
        products=products,
    )


def _source_enabled() -> bool:
    return os.getenv("DEMO_PRODUCTS_SOURCE_ENABLED", "false").strip().lower() == "true"


async def search_demo_products(
    request: SourceSearchRequest,
    transport: Optional[httpx.AsyncBaseTransport] = None,
) -> SourceSearchResponse:
    if not _source_enabled():
        raise HTTPException(
            status_code=503,
            detail={"code": "SOURCE_DISABLED", "message": "La consulta a la fuente está desactivada."},
        )

    started = time.monotonic()
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
            follow_redirects=False,
            transport=transport,
        ) as client:
            response = await client.get(
                SOURCE_ENDPOINT,
                params={"q": request.query, "limit": request.limit},
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail={"code": "SOURCE_TIMEOUT", "message": "La fuente excedió el timeout de 10 segundos."},
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_UNAVAILABLE", "message": "No se pudo contactar con la fuente."},
        ) from exc

    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail={"code": "SOURCE_RATE_LIMITED", "message": "La fuente limitó las consultas."},
        )
    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_FORBIDDEN", "message": "La fuente rechazó el acceso."},
        )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_HTTP_ERROR", "message": "La fuente respondió con un error."},
        )
    if len(response.content) > MAX_RESPONSE_BYTES:
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_RESPONSE_TOO_LARGE", "message": "La respuesta superó el límite de tamaño."},
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_INVALID_JSON", "message": "La fuente devolvió JSON no válido."},
        ) from exc

    if not isinstance(payload, dict) or not isinstance(payload.get("products"), list):
        return normalize_source_response(payload, request.query)
    if len(payload["products"]) > request.limit:
        raise HTTPException(
            status_code=502,
            detail={"code": "SOURCE_LIMIT_EXCEEDED", "message": "La fuente superó el límite solicitado."},
        )

    retrieved_at = datetime.now(timezone.utc).isoformat()
    normalized = normalize_source_response(
        payload,
        request.query,
        retrieved_at=retrieved_at,
    )
    duration_ms = (time.monotonic() - started) * 1000
    return normalized.model_copy(update={"duration_ms": round(duration_ms, 3)})
