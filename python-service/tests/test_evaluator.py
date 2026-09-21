"""Pruebas unitarias para el microservicio evaluador MAUT de PriceWatch."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "pricewatch-evaluator"
    assert "MAUT" in data["algorithm"].upper()


def test_evaluate_single_product():
    payload = {
        "weights": {
            "weight_price": 0.4,
            "weight_quality": 0.3,
            "weight_stock": 0.1,
            "weight_specs": 0.2,
        },
        "products": [
            {
                "id": "prod-1",
                "name": "ThinkPad Pro",
                "category": "Laptops",
                "brand": "Lenovo",
                "price": 1200.0,
                "quality_rating": 4.8,
                "stock": 10,
                "specs_score": 90.0,
            }
        ],
    }
    response = client.post("/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_products_evaluated"] == 1
    assert data["top_recommended_product_id"] == "prod-1"
    assert len(data["ranking"]) == 1
    assert data["ranking"][0]["final_score"] > 0


def test_evaluate_price_priority_ranking():
    payload = {
        "weights": {
            "weight_price": 0.85,
            "weight_quality": 0.05,
            "weight_stock": 0.05,
            "weight_specs": 0.05,
        },
        "products": [
            {
                "id": "prod-cheap",
                "name": "Económico",
                "category": "Laptops",
                "brand": "BrandA",
                "price": 300.0,
                "quality_rating": 3.5,
                "stock": 20,
                "specs_score": 60.0,
            },
            {
                "id": "prod-expensive",
                "name": "Gama Alta",
                "category": "Laptops",
                "brand": "BrandB",
                "price": 1800.0,
                "quality_rating": 4.9,
                "stock": 5,
                "specs_score": 98.0,
            },
        ],
    }
    response = client.post("/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    ranking = data["ranking"]
    assert ranking[0]["id"] == "prod-cheap"
    assert ranking[0]["rank_position"] == 1
    assert ranking[0]["final_score"] > ranking[1]["final_score"]


def test_evaluate_empty_products_fails():
    payload = {
        "weights": {
            "weight_price": 0.25,
            "weight_quality": 0.25,
            "weight_stock": 0.25,
            "weight_specs": 0.25,
        },
        "products": [],
    }
    response = client.post("/evaluate", json=payload)
    assert response.status_code == 400


def test_evaluate_zero_weights_fails():
    payload = {
        "weights": {
            "weight_price": 0.0,
            "weight_quality": 0.0,
            "weight_stock": 0.0,
            "weight_specs": 0.0,
        },
        "products": [
            {
                "id": "prod-1",
                "name": "Test",
                "category": "Laptops",
                "brand": "Brand",
                "price": 500.0,
                "quality_rating": 4.0,
                "stock": 10,
                "specs_score": 75.0,
            }
        ],
    }
    response = client.post("/evaluate", json=payload)
    assert response.status_code == 400
