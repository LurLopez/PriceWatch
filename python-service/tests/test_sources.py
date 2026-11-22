"""Pruebas sin red para la extracción y preparación de DummyJSON."""

import asyncio

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from main import app
from sources import SourceSearchRequest, normalize_source_response, search_demo_products

client = TestClient(app)


def sample_product(product_id=1):
    return {
        "id": product_id,
        "title": "  Laptop de prueba  ",
        "category": "laptops",
        "brand": "Marca de prueba",
        "price": 123.45,
        "rating": 4.2,
        "stock": 12,
        "description": "No debe persistirse",
        "reviews": [{"reviewerEmail": "persona@example.test"}],
        "dimensions": {"width": 12, "height": 8, "depth": 2},
    }


def test_normalize_deduplicates_and_discards_unneeded_fields():
    result = normalize_source_response(
        {
            "products": [
                sample_product(),
                sample_product(),
                {"id": 2, "title": "Sin precio", "price": "desconocido"},
            ]
        },
        "laptop",
        retrieved_at="2026-10-22T12:00:00+00:00",
    )

    assert result.metrics.received == 3
    assert result.metrics.accepted == 1
    assert result.metrics.rejected == 1
    assert result.metrics.duplicates == 1
    listing = result.products[0]
    assert listing.title == "Laptop de prueba"
    assert listing.currency is None
    assert listing.specs["dimensions"] == {"width": 12.0, "height": 8.0, "depth": 2.0}
    assert "description" not in listing.specs
    assert "reviews" not in listing.specs
    assert "persona@example.test" not in listing.model_dump_json()
    assert len(listing.content_hash) == 64


def test_search_disabled_by_default(monkeypatch):
    monkeypatch.setenv("DEMO_PRODUCTS_SOURCE_ENABLED", "false")
    request = SourceSearchRequest(query="laptop", limit=5, acknowledged=True)

    with pytest.raises(HTTPException) as error:
        asyncio.run(search_demo_products(request))

    assert error.value.status_code == 503
    assert error.value.detail["code"] == "SOURCE_DISABLED"


def test_search_query_rejects_urls_and_email_like_values():
    with pytest.raises(ValidationError):
        SourceSearchRequest(query="https://example.test", limit=5, acknowledged=True)
    with pytest.raises(ValidationError):
        SourceSearchRequest(query="person@example.test", limit=5, acknowledged=True)


def test_search_uses_fixed_endpoint_timeout_and_one_bounded_request(monkeypatch):
    monkeypatch.setenv("DEMO_PRODUCTS_SOURCE_ENABLED", "true")
    calls = []

    def handler(request):
        calls.append(request)
        assert request.url.host == "dummyjson.com"
        assert request.url.path == "/products/search"
        assert request.url.params["q"] == "laptop"
        assert request.url.params["limit"] == "5"
        return httpx.Response(200, json={"products": [sample_product()]})

    request = SourceSearchRequest(query="laptop", limit=5, acknowledged=True)
    response = asyncio.run(
        search_demo_products(request, transport=httpx.MockTransport(handler))
    )

    assert len(calls) == 1
    assert response.provider == "dummyjson"
    assert response.metrics.accepted == 1
    assert response.products[0].source_url == "https://dummyjson.com/products/1"


def test_rate_limit_is_reported_without_exposing_upstream_body(monkeypatch):
    monkeypatch.setenv("DEMO_PRODUCTS_SOURCE_ENABLED", "true")

    def handler(_request):
        return httpx.Response(429, json={"private": "upstream detail"})

    request = SourceSearchRequest(query="laptop", limit=5, acknowledged=True)
    with pytest.raises(HTTPException) as error:
        asyncio.run(search_demo_products(request, transport=httpx.MockTransport(handler)))

    assert error.value.status_code == 429
    assert error.value.detail["code"] == "SOURCE_RATE_LIMITED"
    assert "private" not in str(error.value.detail)


def test_timeout_is_controlled(monkeypatch):
    monkeypatch.setenv("DEMO_PRODUCTS_SOURCE_ENABLED", "true")

    def handler(request):
        raise httpx.ReadTimeout("timeout", request=request)

    request = SourceSearchRequest(query="laptop", limit=5, acknowledged=True)
    with pytest.raises(HTTPException) as error:
        asyncio.run(search_demo_products(request, transport=httpx.MockTransport(handler)))

    assert error.value.status_code == 504
    assert error.value.detail["code"] == "SOURCE_TIMEOUT"


def test_search_route_requires_explicit_source_enablement(monkeypatch):
    monkeypatch.setenv("DEMO_PRODUCTS_SOURCE_ENABLED", "false")
    response = client.post(
        "/sources/demo-products/search",
        json={"query": "laptop", "limit": 5, "acknowledged": True},
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "SOURCE_DISABLED"


def test_normalizer_counts_all_records():
    payload = {"products": [sample_product(1), sample_product(2)]}
    result = normalize_source_response(payload, "laptop")

    assert (
        result.metrics.received
        == result.metrics.accepted + result.metrics.rejected + result.metrics.duplicates
    )


def test_profile_adapts_ranking_and_reports_missing_criteria():
    products = [
        {
            "id": "cheap",
            "name": "Opción económica",
            "category": "laptops",
            "brand": "A",
            "price": 500,
            "quality_rating": 2,
            "stock": 10,
            "specs_score": None,
        },
        {
            "id": "rated",
            "name": "Mejor valorada",
            "category": "laptops",
            "brand": "B",
            "price": 1000,
            "quality_rating": 5,
            "stock": 10,
            "specs_score": None,
        },
    ]
    weights = {
        "weight_price": 0.4,
        "weight_quality": 0.3,
        "weight_stock": 0.1,
        "weight_specs": 0.2,
    }
    economy = client.post(
        "/evaluate",
        json={"weights": weights, "products": products, "context_profile": "economia"},
    )
    ratings = client.post(
        "/evaluate",
        json={"weights": weights, "products": products, "context_profile": "valoraciones"},
    )

    assert economy.status_code == 200
    assert ratings.status_code == 200
    economy_data = economy.json()
    ratings_data = ratings.json()
    assert economy_data["ranking"][0]["id"] == "cheap"
    assert ratings_data["ranking"][0]["id"] == "rated"
    assert economy_data["active_criteria"] == ["price", "quality", "stock"]
    assert economy_data["ignored_criteria"] == ["specs"]
    assert economy_data["effective_weights"]["weight_specs"] == 0
    assert any("sintéticos" in warning for warning in client.post(
        "/evaluate",
        json={
            "weights": weights,
            "products": products,
            "context_profile": "economia",
            "source_run_id": "demo-run-1",
        },
    ).json()["warnings"])


def test_custom_profile_with_only_missing_criteria_fails():
    response = client.post(
        "/evaluate",
        json={
            "context_profile": "personalizado",
            "weights": {
                "weight_price": 0,
                "weight_quality": 0.5,
                "weight_stock": 0,
                "weight_specs": 0.5,
            },
            "products": [
                {
                    "id": "one",
                    "name": "Producto",
                    "category": "laptops",
                    "brand": "A",
                    "price": 50,
                    "quality_rating": None,
                    "stock": None,
                    "specs_score": None,
                }
            ],
        },
    )

    assert response.status_code == 400


def test_search_by_category_uses_category_endpoint(monkeypatch):
    monkeypatch.setenv("DEMO_PRODUCTS_SOURCE_ENABLED", "true")
    calls = []

    def handler(request):
        calls.append(request)
        assert request.url.host == "dummyjson.com"
        assert request.url.path == "/products/category/smartphones"
        assert "q" not in request.url.params
        assert request.url.params["limit"] == "5"
        return httpx.Response(200, json={"products": [sample_product()]})

    request = SourceSearchRequest(
        query="Smartphones",
        category="smartphones",
        limit=5,
        acknowledged=True,
    )
    response = asyncio.run(
        search_demo_products(request, transport=httpx.MockTransport(handler))
    )

    assert len(calls) == 1
    assert response.query == "Smartphones"
    assert response.metrics.accepted == 1


def test_category_rejects_path_or_injection_characters():
    with pytest.raises(ValidationError):
        SourceSearchRequest(
            query="Laptops",
            category="../../etc/passwd",
            limit=5,
            acknowledged=True,
        )
