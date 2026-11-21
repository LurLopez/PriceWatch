output "database_container_name" {
  description = "Nombre del contenedor PostgreSQL gestionado por Terraform"
  value       = docker_container.database.name
}

output "network_name" {
  description = "Red Docker compartida con los contenedores de la aplicación"
  value       = docker_network.pricewatch.name
}

output "volume_name" {
  description = "Volumen persistente de PostgreSQL"
  value       = docker_volume.postgres_data.name
}

output "database_endpoint" {
  description = "Endpoint interno de PostgreSQL para NestJS"
  value       = "${docker_container.database.name}:5432"
}
