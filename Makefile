# Makefile del Sistema de Turnos
# IMPORTANTE: copiar .env.example a .env antes de ejecutar `make up`:
#   cp .env.example .env

INFRA   = docker-compose.infra.yml
MICROS  = microservicios-turnos/docker-compose.yml

.PHONY: up down logs ps migrate seed reset

## Levanta red, infraestructura, microservicios y servicios core
up: .env
	docker network create net-shared 2>/dev/null || true
	docker compose -f $(INFRA) up -d
	docker compose -f $(MICROS) up -d --build
	docker compose up -d --build
	@echo ">> Listo. El backoffice (Next.js) tarda ~1 min en compilar la primera vez; si ves 504, espera y recarga."

## .env: si no existe, lo crea a partir del ejemplo
.env:
	cp .env.example .env
	@echo ">> Cree .env desde .env.example. Revisa los valores antes de usar en serio."

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
	@echo "Esperando a que MySQL este listo..."
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' turnos_mysql 2>/dev/null)" = "healthy" ]; do sleep 2; done
	docker compose -f $(MICROS) exec -T turnos_ms_agenda node db/migrations/runner.js

## Carga el admin de auth y los datos demo de negocio
seed:
	docker compose exec -T turnos_auth npm run create-admin
	docker compose -f $(MICROS) exec -T turnos_ms_agenda node db/seed.js

## reset: limpia volumenes y rehace todo desde cero (up + migrate + seed)
reset:
	docker compose down 2>/dev/null || true
	docker compose -f $(MICROS) down 2>/dev/null || true
	docker compose -f $(INFRA) down -v 2>/dev/null || true
	$(MAKE) up
	$(MAKE) migrate
	$(MAKE) seed
