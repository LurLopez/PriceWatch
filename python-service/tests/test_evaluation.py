"""Pruebas de la evaluación offline de perfiles."""

from main import EvaluateRequest, evaluate_ranking
from evaluation.compare_profiles import (
    BASE_WEIGHTS,
    PRODUCTS,
    brand_blind_check,
    missing_data_check,
    rank_order,
    spearman,
    top_overlap,
)


def _baseline():
    return evaluate_ranking(
        EvaluateRequest(
            products=PRODUCTS,
            weights=BASE_WEIGHTS,
            context_profile="personalizado",
        )
    )


def test_baseline_evalua_ocho_productos_y_ordena():
    response = _baseline()
    assert response.total_products_evaluated == 8
    assert len(response.ranking) == 8
    scores = [item.final_score for item in response.ranking]
    assert scores == sorted(scores, reverse=True)
    assert 0 <= scores[0] <= 100


def test_perfil_valoraciones_cambia_el_ganador_respecto_de_la_base():
    baseline = rank_order(_baseline())
    valoraciones = evaluate_ranking(
        EvaluateRequest(products=PRODUCTS, context_profile="valoraciones")
    )
    order = rank_order(valoraciones)
    assert order[0] != baseline[0]
    assert spearman(baseline, order) < 1.0
    assert top_overlap(baseline, order) >= 1


def test_prueba_de_sesgo_de_marca_no_altera_puntajes():
    result = brand_blind_check()
    assert result["identical_scores"] is True
    assert result["differences"] == {}


def test_datos_faltantes_omiten_criterio_y_renormalizan():
    result = missing_data_check()
    assert "specs" in result["ignored_criteria"]
    assert "specs" not in result["active_criteria"]
    assert result["effective_weights"]["weight_specs"] == 0.0
    assert abs(sum(result["effective_weights"].values()) - 1.0) < 1e-9
