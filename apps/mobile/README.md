# NichE Mobile Local Setup

Expo SDK 54 / Expo Go(SDK 54)와 버전 싱크를 맞춰 두었다. `npx expo start` 후 Expo Go 앱으로 스캔해 실행한다.

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
