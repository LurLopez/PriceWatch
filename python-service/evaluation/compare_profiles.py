"""Evaluación offline de la adaptación por perfiles de PriceWatch.

Compara los perfiles `economia`, `equilibrado` y `valoraciones` contra una
versión base de pesos iguales. No es un estudio con usuarios: es una
evaluación reproducible del comportamiento del ranking.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import (  # noqa: E402
    EvaluateRequest,
    ProductInput,
    WeightVector,
    evaluate_ranking,
)

RESULTS_PATH = Path(__file__).with_name("results.json")

PRODUCTS: List[ProductInput] = [
    ProductInput(
        id="prod-001",
        name="Acer Aspire 3",
        category="Laptops",
        brand="Acer",
        price=389,
        quality_rating=3.9,
        stock=25,
        specs_score=64,
    ),
    ProductInput(
        id="prod-002",
        name="HP Pavilion 15",
        category="Laptops",
        brand="HP",
        price=649,
        quality_rating=4.3,
        stock=14,
        specs_score=79,
    ),
    ProductInput(
        id="prod-003",
        name="Lenovo ThinkPad X1",
        category="Laptops",
        brand="Lenovo",
        price=1250,
        quality_rating=4.8,
        stock=8,
        specs_score=92,
    ),
    ProductInput(
        id="prod-004",
        name="MacBook Air M2",
        category="Laptops",
        brand="Apple",
        price=1099,
        quality_rating=4.9,
        stock=5,
        specs_score=90,
    ),
    ProductInput(
        id="prod-005",
        name="ASUS ROG Strix G16",
        category="Laptops",
        brand="ASUS",
        price=1699,
        quality_rating=4.7,
        stock=4,
        specs_score=96,
    ),
    ProductInput(
        id="prod-006",
        name="Dell Inspiron 14",
        category="Laptops",
        brand="Dell",
        price=550,
        quality_rating=4.1,
        stock=18,
        specs_score=70,
    ),
    ProductInput(
        id="prod-007",
        name="MSI Modern 14",
        category="Laptops",
        brand="MSI",
        price=720,
        quality_rating=4.2,
        stock=12,
        specs_score=76,
    ),
    ProductInput(
        id="prod-008",
        name="Huawei MateBook D14",
        category="Laptops",
        brand="Huawei",
        price=600,
        quality_rating=4.4,
        stock=10,
        specs_score=82,
    ),
]

BASE_WEIGHTS = WeightVector(
    weight_price=0.25,
    weight_quality=0.25,
    weight_stock=0.25,
    weight_specs=0.25,
)


def rank_order(response) -> List[str]:
    return [item.id for item in response.ranking]


def spearman(ranked_a: List[str], ranked_b: List[str]) -> float:
    n = len(ranked_a)
    if n < 2:
        return 1.0
    pos_a = {item: index for index, item in enumerate(ranked_a)}
    pos_b = {item: index for index, item in enumerate(ranked_b)}
    d2 = sum((pos_a[item] - pos_b[item]) ** 2 for item in ranked_a)
    return round(1 - (6 * d2) / (n * (n * n - 1)), 4)


def top_overlap(ranked_a: List[str], ranked_b: List[str], k: int = 3) -> int:
    return len(set(ranked_a[:k]) & set(ranked_b[:k]))


def evaluate_profile(profile: str):
    started_at = time.perf_counter()
    response = evaluate_ranking(
        EvaluateRequest(products=PRODUCTS, context_profile=profile)  # type: ignore[arg-type]
    )
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 3)
    return response, elapsed_ms


def brand_blind_check() -> Dict[str, object]:
    anonymized = [
        product.model_copy(update={"brand": "Marca X"}) for product in PRODUCTS
    ]
    baseline = evaluate_ranking(
        EvaluateRequest(
            products=PRODUCTS,
            weights=BASE_WEIGHTS,
            context_profile="personalizado",
        )
    )
    blind = evaluate_ranking(
        EvaluateRequest(
            products=anonymized,
            weights=BASE_WEIGHTS,
            context_profile="personalizado",
        )
    )
    original_scores = {item.id: item.final_score for item in baseline.ranking}
    blind_scores = {item.id: item.final_score for item in blind.ranking}
    return {
        "identical_scores": original_scores == blind_scores,
        "differences": {
            item_id: round(blind_scores[item_id] - original_scores[item_id], 6)
            for item_id in original_scores
            if blind_scores[item_id] != original_scores[item_id]
        },
    }


def missing_data_check() -> Dict[str, object]:
    products = [product.model_copy() for product in PRODUCTS[:4]]
    products[0] = products[0].model_copy(update={"specs_score": None})
    response = evaluate_ranking(
        EvaluateRequest(
            products=products,
            weights=BASE_WEIGHTS,
            context_profile="personalizado",
        )
    )
    return {
        "active_criteria": response.active_criteria,
        "ignored_criteria": response.ignored_criteria,
        "effective_weights": response.effective_weights,
        "ranking_size": len(response.ranking),
    }


def main() -> None:
    baseline_started = time.perf_counter()
    baseline = evaluate_ranking(
        EvaluateRequest(
            products=PRODUCTS,
            weights=BASE_WEIGHTS,
            context_profile="personalizado",
        )
    )
    baseline_ms = round((time.perf_counter() - baseline_started) * 1000, 3)
    baseline_order = rank_order(baseline)

    results = {
        "dataset": {
            "products": len(PRODUCTS),
            "description": "8 laptops sintéticas con precio, valoración, stock y specs",
        },
        "baseline": {
            "profile": "personalizado (0.25/0.25/0.25/0.25)",
            "winner": baseline.ranking[0].name,
            "winner_id": baseline.ranking[0].id,
            "score": baseline.ranking[0].final_score,
            "order": baseline_order,
            "elapsed_ms": baseline_ms,
        },
        "profiles": {},
        "brand_blind": brand_blind_check(),
        "missing_data": missing_data_check(),
    }

    print("## Comparación de perfiles vs base\n")
    print(
        "| Perfil | Ganador | Puntaje | Top-3 con base | Spearman | Criterios omitidos | Tiempo (ms) |"
    )
    print("|---|---|---:|---:|---:|---|---:|")
    print(
        f"| base (0.25 cada uno) | {baseline.ranking[0].name} | "
        f"{baseline.ranking[0].final_score:.2f} | 3/3 | 1.0000 | — | {baseline_ms:.3f} |"
    )

    for profile in ("economia", "equilibrado", "valoraciones"):
        response, elapsed_ms = evaluate_profile(profile)
        order = rank_order(response)
        overlap = top_overlap(baseline_order, order)
        rho = spearman(baseline_order, order)
        winner = response.ranking[0]
        results["profiles"][profile] = {
            "winner": winner.name,
            "winner_id": winner.id,
            "score": winner.final_score,
            "order": order,
            "top3_overlap_with_baseline": overlap,
            "spearman_vs_baseline": rho,
            "winner_changed": winner.id != baseline.ranking[0].id,
            "active_criteria": response.active_criteria,
            "ignored_criteria": response.ignored_criteria,
            "effective_weights": response.effective_weights,
            "elapsed_ms": elapsed_ms,
        }
        print(
            f"| {profile} | {winner.name} | {winner.final_score:.2f} | "
            f"{overlap}/3 | {rho:.4f} | "
            f"{', '.join(response.ignored_criteria) or '—'} | {elapsed_ms:.3f} |"
        )

    print("\n## Pesos efectivos\n")
    for profile, data in results["profiles"].items():
        weights = data["effective_weights"]
        print(
            f"- **{profile}**: precio {weights['weight_price']:.2f}, "
            f"valoración {weights['weight_quality']:.2f}, "
            f"disponibilidad {weights['weight_stock']:.2f}, "
            f"especificaciones {weights['weight_specs']:.2f}"
        )

    print("\n## Prueba de sesgo de marca\n")
    blind = results["brand_blind"]
    print(
        f"- Puntajes idénticos al cambiar solo la marca: "
        f"**{blind['identical_scores']}**"
    )
    print(f"- Diferencias: {blind['differences']}")

    print("\n## Datos faltantes\n")
    missing = results["missing_data"]
    print(
        f"- Criterios activos: {missing['active_criteria']}; "
        f"omitidos: {missing['ignored_criteria']}"
    )
    print(f"- Pesos efectivos: {missing['effective_weights']}")
    print(
        "- El criterio sin datos se omite para toda la muestra y los pesos restantes "
        "se renormalizan; no se reemplaza por cero."
    )

    RESULTS_PATH.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\nResultados guardados en {RESULTS_PATH}")


if __name__ == "__main__":
    main()
