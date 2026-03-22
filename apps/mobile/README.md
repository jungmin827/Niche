# NichE Mobile Local Setup

## Local Run

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to a reachable FastAPI server.
3. Start the backend.
4. Run `npx expo start`.

## Local API Example

```bash
cd apps/api
uv run uvicorn src.main:app --host 127.0.0.1 --port 8000
```

```bash
cd apps/mobile
cp .env.example .env
npx expo start
```
