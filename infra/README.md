# Infraestructura como Código (IaC) — PriceWatch (EP1)

Esta carpeta contiene la definición declarativa y reproducible de la infraestructura de PriceWatch utilizando **Terraform**.

---

## Proposito en la Entrega 1

Demostrar el uso de **Infraestructura como Código (IaC)** conforme a los resultados de aprendizaje de la asignatura (RA 2):
1. Definición modular con variables (`variables.tf`), outputs (`outputs.tf`) y recursos declarativos (`main.tf`).
2. Generación automática y versionable del **contrato de servicios de staging** (`staging-manifest.json`).
3. En la Entrega 2 (EP2), los recursos locales serán extendidos con proveedores cloud reales (ej. AWS o GCP) sin alterar los contratos existentes.

---

## Comandos de Validacion y Ejecucion

### 1. Inicializar Terraform
Descarga los providers requeridos (proveedor local oficial de HashiCorp):
```bash
terraform init
```

### 2. Validar sintaxis y configuracion
```bash
terraform validate
```

### 3. Planificar la ejecucion
```bash
terraform plan
```

### 4. Aplicar los cambios
Genera el manifiesto en `generated/staging-manifest.json`:
```bash
terraform apply -auto-approve
```

### 5. Consultar los outputs
```bash
terraform output
```
