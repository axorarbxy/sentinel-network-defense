"""
FastAPI Server Entry Point (SIH26153)
Main application assembling REST routes, WebSocket handlers, and SQLite database.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .routes_scenarios import router as scenarios_router
from .routes_benchmarks import router as benchmarks_router
from .routes_analyze import router as analyze_router
from .routes_devices import router as devices_router
from .auth import router as auth_router, verify_websocket_token
from .ws_live import ws_manager
from .ws_replay import handle_replay_websocket
from ..storage.db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler initializing DB and background WS broadcast task."""
    init_db()
    broadcast_task = asyncio.create_task(ws_manager.broadcast_loop())
    print("[SENTINEL FastAPI] Engine initialized & WS broadcast loop started.")
    yield
    broadcast_task.cancel()
    print("[SENTINEL FastAPI] Engine shutdown.")

app = FastAPI(
    title="SENTINEL World-Model Engine API",
    description="Predictive Network Attack Forecasting Engine Backend for SIH26153",
    version="2.4.0",
    lifespan=lifespan,
)

# Enable CORS for React Frontend (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers
app.include_router(auth_router)
app.include_router(scenarios_router)
app.include_router(benchmarks_router)
app.include_router(analyze_router)
app.include_router(devices_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "SENTINEL World-Model Engine Backend (SIH26153)",
        "version": "2.4.0",
        "ws_endpoint": "ws://localhost:8000/ws",
    }

@app.websocket("/ws")
async def websocket_live_endpoint(websocket: WebSocket, token: str = None):
    """Live Monitor WebSocket endpoint with auth check."""
    if token is None:
        await websocket.close(code=4001, reason="Unauthorized token")
        return
    try:
        verify_websocket_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Unauthorized token")
        return
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.handle_client_message(websocket, data)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print("[SENTINEL WS] Connection exception:", e)
        ws_manager.disconnect(websocket)

@app.websocket("/ws/replay")
async def websocket_replay_endpoint(websocket: WebSocket, scenario_id: str = "scenario-cic-ids-2018", token: str = None):
    """Incident Replay WebSocket endpoint with auth check."""
    if token is None:
        await websocket.close(code=4001, reason="Unauthorized token")
        return
    try:
        verify_websocket_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Unauthorized token")
        return
    await handle_replay_websocket(websocket, scenario_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["src"])
