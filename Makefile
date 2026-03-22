# NichE — Local Development
# Usage:
#   make dev       — start API + Mobile (parallel)
#   make api       — start API only (port 8000)
#   make mobile    — start Expo (port 8081)
#   make ios       — start Expo + open iOS simulator
#   make migrate   — run Alembic migrations
#   make health    — curl API health check

.PHONY: dev api mobile ios migrate health

API_DIR  := apps/api
MOB_DIR  := apps/mobile

# ── Parallel dev ─────────────────────────────────────────────────────────────
dev:
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; \
	$(MAKE) api & \
	$(MAKE) mobile & \
	wait

# ── Backend ──────────────────────────────────────────────────────────────────
api:
	cd $(API_DIR) && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# ── Frontend ─────────────────────────────────────────────────────────────────
mobile:
	cd $(MOB_DIR) && npx expo start --port 8081

ios:
	cd $(MOB_DIR) && npx expo start --ios --port 8081

# ── DB migrations ─────────────────────────────────────────────────────────────
migrate:
	cd $(API_DIR) && uv run alembic upgrade head

migrate-status:
	cd $(API_DIR) && uv run alembic current

# ── Health check ──────────────────────────────────────────────────────────────
health:
	@curl -sf http://localhost:8000/ | python3 -m json.tool || echo "API not running"
