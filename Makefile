# Makefile del Sistema de Turnos
# IMPORTANTE: copiar .env.example a .env antes de ejecutar `make up`:
#   cp .env.example .env

INFRA   = docker-compose.infra.yml
MICROS  = microservicios-turnos/docker-compose.yml

.PHONY: up down logs ps migrate seed

## Levanta red, infraestructura, microservicios y servicios core
up:
	docker network create net-shared 2>/dev/null || true
	docker compose -f $(INFRA) up -d
	docker compose -f $(MICROS) up -d
	docker compose up -d

## Baja los tres compose (servicios, microservicios e infraestructura)
down:
	docker compose down
	docker compose -f $(MICROS) down
	docker compose -f $(INFRA) down

## Muestra logs de los tres compose en vivo
logs:
	docker compose -f $(INFRA) -f $(MICROS) -f docker-compose.yml logs -f

## Lista el estado de los contenedores
ps:
	docker compose -f $(INFRA) -f $(MICROS) -f docker-compose.yml ps

## Ejecuta las migraciones de base de datos (dentro de un contenedor, donde shared/db está montado)
migrate:
	docker compose -f $(MICROS) exec turnos_ms_agenda node db/migrations/runner.js

## Carga el admin de auth y los datos demo de negocio
seed:
	docker compose exec -T turnos_auth npm run create-admin
	docker compose -f $(MICROS) exec -T turnos_ms_agenda node db/seed.js
