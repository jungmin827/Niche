from fastapi import FastAPI
from src.routers import health

app = FastAPI(title="NichE API")

app.include_router(health.router)

@app.get("/")
async def root():
    return {"service": "NichE API"}
