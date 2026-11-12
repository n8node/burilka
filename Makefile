.DEFAULT_GOAL := help
.PHONY: help setup up down build compose-check prod prod-up ps logs test lint migrate migrate-prod wp-install wp-install-prod ssl-init ssl-renew verify-release clean superadmin-bootstrap

COMPOSE := docker compose --env-file .env -f docker-compose.yml
COMPOSE_PROD := $(COMPOSE) -f docker-compose.prod.yml
DOMAIN ?= burilka.com
ACME_EMAIL ?= $(shell grep '^ACME_EMAIL=' .env 2>/dev/null | cut -d= -f2-)

help: ## Show available targets (default; makes no changes)
	@awk 'BEGIN {FS = ":.*##"; print "Burilka project commands:"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Create local .env if absent and explain prerequisites
	@test -f .env || cp .env.example .env
	@mkdir -p acme-webroot letsencrypt
	@echo "Created .env if it did not exist. Review it and replace all local example passwords before use."
	@echo "Requires Docker Engine/Desktop with Compose v2. For production, use the documented protected .env procedure."

up: ## Build and start local development stack (HTTP, localhost)
	$(COMPOSE) up --build -d

down: ## Stop local stack without deleting persistent data
	$(COMPOSE) down

build: ## Build application images without starting services
	$(COMPOSE) build frontend backend worker

compose-check: ## Validate local and production Compose configuration
	$(COMPOSE) config --quiet
	$(COMPOSE_PROD) config --quiet

prod: ## First production release: require TLS, start services, migrate, install WordPress, verify
	@test -f .env || (echo "Missing .env; copy .env.production.example and fill secrets securely"; exit 1)
	@test -f letsencrypt/live/$(DOMAIN)/fullchain.pem -a -f letsencrypt/live/$(DOMAIN)/privkey.pem || (echo "Missing TLS cert. Run make ssl-init DOMAIN=$(DOMAIN) first"; exit 1)
	$(COMPOSE_PROD) up --build -d postgres mysql wordpress frontend backend worker nginx
	$(MAKE) migrate-prod
	$(MAKE) wp-install-prod
	$(MAKE) verify-release

prod-up: ## Start/update production services after TLS has been issued
	$(COMPOSE_PROD) up --build -d

migrate: ## Apply forward goose migrations to local DB
	$(COMPOSE) --profile tools run --rm migrate

migrate-prod: ## Apply forward goose migrations to production DB
	$(COMPOSE_PROD) --profile tools run --rm migrate

wp-install: ## Idempotently install local WordPress (requires WP_ADMIN_PASSWORD in .env)
	$(COMPOSE) --profile tools run --rm wordpress-cli

wp-install-prod: ## Idempotently install production WordPress; credentials read from .env
	$(COMPOSE_PROD) --profile tools run --rm wordpress-cli

ssl-init: ## Obtain first Let's Encrypt cert through HTTP-01 webroot
	@test -n "$(ACME_EMAIL)" || (echo "Set ACME_EMAIL in .env or pass ACME_EMAIL=..."; exit 1)
	@mkdir -p acme-webroot letsencrypt
	$(COMPOSE_PROD) --profile acme up -d nginx-acme
	$(COMPOSE_PROD) --profile acme run --rm certbot certonly --webroot -w /var/www/certbot -d $(DOMAIN) --email $(ACME_EMAIL) --agree-tos --no-eff-email
	$(COMPOSE_PROD) --profile acme stop nginx-acme
	$(COMPOSE_PROD) up -d nginx

ssl-renew: ## Renew due certificates and reload production Nginx on success
	$(COMPOSE_PROD) --profile acme run --rm certbot renew --webroot -w /var/www/certbot --quiet
	$(COMPOSE_PROD) exec -T nginx nginx -s reload

verify-release: ## Check public production routes and health endpoints
	@curl --fail --silent --show-error https://$(DOMAIN)/ >/dev/null
	@curl --fail --silent --show-error https://$(DOMAIN)/app/health
	@curl --fail --silent --show-error https://$(DOMAIN)/app/api/v1/status

ps: ## Show local Compose service status
	$(COMPOSE) ps

logs: ## Follow logs (optional: SERVICE=backend)
	$(COMPOSE) logs --tail=100 -f $(SERVICE)

test: ## Run backend tests
	cd backend && go test ./...

lint: ## Run backend static checks and frontend lint
	cd backend && go vet ./...
	cd frontend && npm run lint

clean: ## Remove stopped local containers only; persistent data volumes are preserved
	$(COMPOSE) down

superadmin-bootstrap: ## Provision platform superadmin with hidden interactive password entry
	$(COMPOSE_PROD) exec -it backend /app/burilka-api superadmin-bootstrap erman.ai@yandex.ru