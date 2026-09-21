output "staging_manifest_path" {
  description = "Ruta al manifiesto de staging generado"
  value       = local_file.staging_manifest.filename
}

output "environment" {
  description = "Ambiente configurado"
  value       = var.environment
}

output "services_summary" {
  description = "Resumen de endpoints de la infraestructura"
  value = {
    frontend = var.frontend_url
    backend  = var.backend_url
    python   = var.python_service_url
    database = var.db_name
  }
}
