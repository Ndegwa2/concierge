.PHONY: help build up down restart logs shell-backend shell-nginx clean migrate

# Default target
help: ## Show this help message
	@echo "AutoConcierge Docker Management"
	@echo "==============================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker compose build

up: ## Start all services in background
	docker compose up -d

up-logs: ## Start all services and show logs
	docker compose up

down: ## Stop all services
	docker compose down

down-volumes: ## Stop all services and remove volumes
	docker compose down -v

restart: ## Restart all services
	docker compose restart

restart-backend: ## Restart backend service only
	docker compose restart backend

restart-nginx: ## Restart nginx service only
	docker compose restart nginx

logs: ## Show logs from all services
	docker compose logs -f

logs-backend: ## Show backend logs
	docker compose logs -f backend

logs-nginx: ## Show nginx logs
	docker compose logs -f nginx

logs-postgres: ## Show PostgreSQL logs
	docker compose logs -f postgres

logs-redis: ## Show Redis logs
	docker compose logs -f redis

logs-celery: ## Show Celery worker logs
	docker compose logs -f celery-worker

logs-celery-beat: ## Show Celery beat logs
	docker compose logs -f celery-beat

shell-backend: ## Open a shell in the backend container
	docker compose exec backend /bin/bash

shell-nginx: ## Open a shell in the nginx container
	docker compose exec nginx /bin/sh

shell-postgres: ## Open a PostgreSQL shell
	docker compose exec postgres psql -U autoconcierge -d autoconcierge

shell-redis: ## Open a Redis shell
	docker compose exec redis redis-cli -a $(shell grep REDIS_PASSWORD .env | cut -d= -f2)

restart-celery: ## Restart Celery worker
	docker compose restart celery-worker

restart-celery-beat: ## Restart Celery beat
	docker compose restart celery-beat

migrate: ## Run database migrations
	docker compose exec backend flask db upgrade

migrate-create: ## Create a new migration (usage: MIGRATION="message" make migrate-create)
	docker compose exec backend flask db migrate -m "$(MIGRATION)"

migrate-rollback: ## Rollback last migration
	docker compose exec backend flask db downgrade

status: ## Show status of all services
	docker compose ps

health: ## Check health of all services
	@echo "PostgreSQL:" && docker compose exec postgres pg_isready -U autoconcierge
	@echo "Redis:" && docker compose exec redis redis-cli -a $(shell grep REDIS_PASSWORD .env | cut -d= -f2) ping
	@echo "Backend:" && curl -s http://localhost:8000/api/health || echo "Unreachable"
	@echo "" && echo "Nginx:" && curl -s http://localhost/api/health || echo "Unreachable"

clean: down-volumes ## Remove all containers, volumes, and images
	docker compose down -v --rmi all --remove-orphans

setup: ## Initial setup - create .env and generate secrets
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example - please edit with your values"; \
	else \
		echo ".env already exists"; \
	fi
	@echo ""
	@echo "Generate secrets with:"
	@echo "  SECRET_KEY: python -c \"import secrets; print(secrets.token_hex(32))\""
	@echo "  JWT_SECRET_KEY: python -c \"import secrets; print(secrets.token_hex(32))\""
	@echo "  ENCRYPTION_KEY: python -c \"import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())\""
