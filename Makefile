# MCP-RAG-V4 Makefile
# Provides convenient targets for RAG operations and system management

.PHONY: help bootstrap start stop test clean rag-ingest rag-reindex health status

# Default target
help: ## Show this help message
	@echo "MCP-RAG-V4 Management Commands"
	@echo "=============================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# System Management
bootstrap: ## Run the bootstrap script to setup environment
	@./scripts/bootstrap.sh

start: ## Start the full MCP-RAG-V4 stack
	@echo "🚀 Starting MCP-RAG-V4 Stack..."
	@docker-compose -f perfect-claude-env/docker-compose.yml up -d
	@sleep 5
	@npm run mcp:start:all
	@python start_all.py
	@echo "✅ Stack started successfully!"

stop: ## Stop the full MCP-RAG-V4 stack  
	@echo "🛑 Stopping MCP-RAG-V4 Stack..."
	@npm run mcp:stop:all || true
	@python stop_all.py || true
	@docker-compose -f perfect-claude-env/docker-compose.yml down
	@echo "✅ Stack stopped successfully!"

restart: stop start ## Restart the full stack

status: ## Show status of all services
	@echo "📊 MCP-RAG-V4 System Status"
	@echo "=========================="
	@echo ""
	@echo "Docker Services:"
	@docker-compose -f perfect-claude-env/docker-compose.yml ps
	@echo ""
	@echo "MCP Server Processes:"
	@if [ -d "logs/mcp-servers" ]; then \
		for pidfile in logs/mcp-servers/*.pid; do \
			if [ -f "$$pidfile" ]; then \
				pid=$$(cat "$$pidfile"); \
				if kill -0 "$$pid" 2>/dev/null; then \
					echo "  ✅ $$(basename "$$pidfile" .pid) (PID: $$pid)"; \
				else \
					echo "  ❌ $$(basename "$$pidfile" .pid) (not running)"; \
				fi; \
			fi; \
		done; \
	else \
		echo "  No MCP server logs found"; \
	fi

health: ## Check health of all services
	@echo "🏥 Health Check"
	@echo "==============="
	@echo ""
	@echo -n "Qdrant: "
	@curl -s -f http://localhost:6333/health >/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Redis: "
	@docker-compose -f perfect-claude-env/docker-compose.yml exec -T redis redis-cli ping >/dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Prometheus: "
	@curl -s -f http://localhost:9090/-/healthy >/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Grafana: "
	@curl -s -f http://localhost:3000/api/health >/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy"

# RAG Operations
rag-ingest: ## Ingest documents into RAG system (usage: make rag-ingest FILE=path/to/doc.pdf)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Error: FILE parameter required"; \
		echo "Usage: make rag-ingest FILE=docs/document.pdf"; \
		exit 1; \
	fi
	@if [ ! -f "$(FILE)" ]; then \
		echo "❌ Error: File $(FILE) not found"; \
		exit 1; \
	fi
	@echo "📥 Ingesting $(FILE) into RAG system..."
	@python scripts/rag_ingest.py "$(FILE)"
	@echo "✅ Document ingested successfully!"

rag-reindex: ## Rebuild the entire RAG index
	@echo "🔄 Rebuilding RAG index..."
	@python scripts/rag_reindex.py
	@echo "✅ RAG index rebuilt successfully!"

rag-search: ## Search the RAG system (usage: make rag-search QUERY="your search term")
	@if [ -z "$(QUERY)" ]; then \
		echo "❌ Error: QUERY parameter required"; \
		echo "Usage: make rag-search QUERY=\"your search term\""; \
		exit 1; \
	fi
	@echo "🔍 Searching for: $(QUERY)"
	@python scripts/rag_search.py "$(QUERY)"

rag-status: ## Show RAG system status and statistics
	@echo "📊 RAG System Status"
	@echo "==================="
	@python scripts/rag_status.py

# Testing & Quality
test: ## Run all tests
	@echo "🧪 Running tests..."
	@python -m pytest tests/ -v
	@echo "✅ Tests completed!"

test-mcp: ## Run MCP integration tests only
	@echo "🔗 Running MCP integration tests..."
	@python -m pytest tests/test_mcp_integration.py::TestMCPAgentIntegration -v
	@echo "✅ MCP integration tests completed!"

test-integration: ## Run integration tests
	@echo "🔗 Running integration tests..."
	@python tests/test_mcp_integration.py
	@echo "✅ Integration tests completed!"

lint: ## Run linting on all code
	@echo "🔍 Running linters..."
	@npm run lint
	@echo "✅ Linting completed!"

format: ## Format all code
	@echo "✨ Formatting code..."
	@npm run format
	@echo "✅ Code formatted!"

security-scan: ## Run security vulnerability scan
	@echo "🔒 Running security scan..."
	@npm run security:scan
	@echo "✅ Security scan completed!"

# Development
dev: start ## Start development environment (alias for start)

logs: ## Show logs from all services
	@docker-compose -f perfect-claude-env/docker-compose.yml logs -f

logs-mcp: ## Show MCP server logs
	@if [ -d "logs/mcp-servers" ]; then \
		tail -f logs/mcp-servers/*.log; \
	else \
		echo "No MCP server logs found"; \
	fi

clean: ## Clean up logs and temporary files
	@echo "🧹 Cleaning up..."
	@rm -rf logs/mcp-servers/*.log
	@rm -rf logs/mcp-servers/*.pid
	@docker-compose -f perfect-claude-env/docker-compose.yml down -v
	@docker system prune -f
	@echo "✅ Cleanup completed!"

clean-worktrees: ## Clean all worktrees (DANGEROUS)
	@echo "⚠️  This will delete all work in .worktrees directories!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	@./scripts/clean_worktrees.sh

# Agent Operations
agent-status: ## Show status of all agents
	@echo "🤖 Agent Status"
	@echo "==============="
	@jq '.agents' coordination/ACTIVE_TASKS.json

tasks: ## Show active tasks
	@echo "📋 Active Tasks"
	@echo "==============="
	@jq '.tasks' coordination/ACTIVE_TASKS.json

tasks-pending: ## Show pending tasks
	@echo "⏳ Pending Tasks"
	@echo "================"
	@jq '.tasks[] | select(.status == "pending")' coordination/ACTIVE_TASKS.json

tasks-active: ## Show in-progress tasks  
	@echo "🔄 Active Tasks"
	@echo "==============="
	@jq '.tasks[] | select(.status == "in_progress")' coordination/ACTIVE_TASKS.json

# Backup & Restore
backup: ## Create backup of current state
	@echo "💾 Creating backup..."
	@mkdir -p backups
	@tar -czf "backups/mcp-rag-v4-backup-$$(date +%Y%m%d-%H%M%S).tar.gz" \
		--exclude='node_modules' \
		--exclude='.venv' \
		--exclude='logs' \
		--exclude='*.log' \
		.
	@echo "✅ Backup created in backups/ directory"

# Installation
install-deps: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	@npm install
	@if [ -f ".venv/bin/activate" ]; then \
		source .venv/bin/activate && pip install -r perfect-claude-env/mcp-servers/*/requirements.txt; \
	else \
		echo "Virtual environment not found. Run 'make bootstrap' first."; \
	fi
	@echo "✅ Dependencies installed!"

# Documentation
docs: ## Generate documentation
	@echo "📚 Generating documentation..."
	@mkdir -p docs/generated
	@find . -name "*.md" -not -path "./node_modules/*" -not -path "./.venv/*" > docs/generated/md-files.txt
	@echo "✅ Documentation index created!"

# Debugging & Troubleshooting
debug: ## Run system debugger
	@./scripts/debug-system.sh

debug-verbose: ## Run system debugger with verbose output
	@./scripts/debug-system.sh --all --verbose

troubleshoot: ## Run automated troubleshooting tool
	@python scripts/troubleshoot.py

troubleshoot-json: ## Run troubleshooting tool with JSON output
	@python scripts/troubleshoot.py --json

# Quick setup for new users
setup: bootstrap install-deps start health ## Complete setup for new users
	@echo ""
	@echo "🎉 MCP-RAG-V4 Setup Complete!"
	@echo "=============================="
	@echo ""
	@echo "Next steps:"
	@echo "1. Configure your API keys in .env file"
	@echo "2. Open Claude Desktop and configure .mcp.json"
	@echo "3. Open 3 Claude Code tabs for Architect, Builder, and Validator"
	@echo ""
	@echo "Available commands:"
	@echo "  make help     - Show all available commands"
	@echo "  make status   - Check system status"  
	@echo "  make tasks    - View active tasks"
	@echo ""