variable "project_name" {
  type        = string
  description = "Nombre oficial del proyecto"
  default     = "pricewatch"
}

variable "environment" {
  type        = string
  description = "Ambiente de despliegue (staging / production)"
  default     = "staging"
}

variable "frontend_url" {
  type        = string
  description = "URL accesible del cliente web Angular"
  default     = "http://localhost:4200"
}

variable "frontend_port" {
  type        = number
  description = "Puerto expuesto del frontend"
  default     = 4200
}

variable "backend_url" {
  type        = string
  description = "URL de la API NestJS"
  default     = "http://localhost:3000/api"
}

variable "backend_port" {
  type        = number
  description = "Puerto expuesto del backend"
  default     = 3000
}

variable "python_service_url" {
  type        = string
  description = "URL interna del motor de ponderacion FastAPI"
  default     = "http://python-service:8000"
}

variable "python_port" {
  type        = number
  description = "Puerto del microservicio analitico"
  default     = 8000
}

variable "db_name" {
  type        = string
  description = "Nombre de la base de datos relacional"
  default     = "pricewatch_db"
}
