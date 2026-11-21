variable "project_name" {
  type        = string
  description = "Nombre del proyecto"
  default     = "pricewatch"
}

variable "environment" {
  type        = string
  description = "Ambiente (staging/production)"
  default     = "staging"
}

variable "docker_host" {
  type        = string
  description = "Socket o endpoint del daemon Docker"
  default     = "unix:///var/run/docker.sock"
}

variable "postgres_image" {
  type        = string
  description = "Imagen de PostgreSQL"
  default     = "postgres:16-alpine"
}

variable "postgres_db" {
  type        = string
  description = "Nombre de la base de datos"
  default     = "pricewatch_db"
}

variable "postgres_user" {
  type        = string
  description = "Usuario de PostgreSQL"
  default     = "pricewatch_admin"
}

variable "postgres_password" {
  type        = string
  description = "Contraseña de PostgreSQL (usar variable de entorno TF_VAR_postgres_password)"
  sensitive   = true
}

variable "network_name" {
  type        = string
  description = "Nombre de la red Docker compartida con Docker Compose"
  default     = "pricewatch_staging_network"
}

variable "volume_name" {
  type        = string
  description = "Nombre del volumen persistente de PostgreSQL"
  default     = "pricewatch_staging_postgres_data"
}
