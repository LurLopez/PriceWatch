terraform {
  required_version = ">= 1.6.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "local" {}

# ==============================================================================
# PriceWatch — Manifiesto Declarativo de Staging (EP1)
# ==============================================================================
# Define de forma reproducible el contrato de configuracion de los servicios
# para el entorno de staging. En EP2 este recurso se extendera con proveedores
# cloud (AWS / GCP).
# ==============================================================================

resource "local_file" "staging_manifest" {
  filename = "${path.module}/generated/staging-manifest.json"
  content = jsonencode({
    project      = var.project_name
    environment  = var.environment
    generated_at = timestamp()
    services = {
      frontend = {
        name = "pricewatch-web"
        port = var.frontend_port
        url  = var.frontend_url
      }
      backend = {
        name = "pricewatch-api"
        port = var.backend_port
        url  = var.backend_url
      }
      analytics = {
        name = "pricewatch-evaluator"
        port = var.python_port
        url  = var.python_service_url
      }
      database = {
        engine   = "postgresql"
        version  = "16"
        database = var.db_name
        port     = 5432
      }
    }
    limits = {
      max_batch_evaluation_items = 100
      request_timeout_ms         = 5000
    }
  })
}
