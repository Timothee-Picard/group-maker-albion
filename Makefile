# ENV vars
include .env
export

.PHONY: install dev docker-up db-push db-generate build deploy-commands

# Default goal
.DEFAULT_GOAL := help

install: ## Install all dependencies via npm
	npm install

docker-up: ## Start the database background container
	docker compose up -d

docker-down: ## Stop the database background container
	docker compose down

db-generate: ## Generate the Prisma client
	cd botdiscord && npx prisma generate

db-push: ## Push the Prisma schema to the database
	cd botdiscord && npx prisma db push

dev: ## Start the bot in development mode
	npm run dev:bot

deploy-commands: ## Deploy slash commands to Discord
	cd botdiscord && npm run deploy

build: ## Build the bot discord
	cd botdiscord && npm run build

setup: install docker-up db-generate db-push ## Full setup from scratch

help: ## Show this help message
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
