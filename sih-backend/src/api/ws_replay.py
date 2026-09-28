"""
Incident Replay WebSocket Handler (SIH26153)
Streams labeled historical incident frames for the Incident Replay page.
Pushes baseline_forecast array parallel to world_model predictions for overlay plotting.
"""

import asyncio
import json
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from .routes_scenarios import SCENARIOS_DATA
from .ws_live import ws_manager

async def handle_replay_websocket(websocket: WebSocket, scenario_id: str = "scenario-cic-ids-2018"):
    """Stream replay frames and honor playback controls from the client."""
    await websocket.accept()
    print(f"[SENTINEL Replay WS] Started playback stream for scenario: {scenario_id}")

    scenario = next((s for s in SCENARIOS_DATA if s["id"] == scenario_id), SCENARIOS_DATA[0])
    total_duration = scenario["totalDurationSeconds"]
    current_time = 0
    playback_speed = 1.0
    is_playing = False

    async def receive_controls():
        nonlocal current_time, playback_speed, is_playing
        while True:
            message = json.loads(await websocket.receive_text())
            command = message.get("command")
            if command == "play":
                is_playing = True
            elif command == "pause":
                is_playing = False
            elif command == "speed":
                playback_speed = max(0.25, min(8.0, float(message.get("value", 1))))
            elif command == "seek":
                current_time = max(0, min(total_duration, int(message.get("time_sec", 0))))
            elif command == "reset":
                current_time = 0
                is_playing = False

    async def send_frame(time_sec: int):
        state_update = ws_manager.generate_current_state_update(t_offset=time_sec // 15)
        baseline_prob = min(0.75, 0.10 + (time_sec / total_duration) * 0.55)
        world_model_prob = min(0.99, 0.15 + (time_sec / total_duration) * 0.82)
        await websocket.send_text(json.dumps({
            **state_update,
            "type": "replay_state_update",
            "scenario_id": scenario_id,
            "current_time_sec": time_sec,
            "total_duration_sec": total_duration,
            "model_vs_baseline": {
                "time_sec": time_sec,
                "world_model_prob": round(world_model_prob, 2),
                "baseline_prob": round(baseline_prob, 2),
            },
        }))

    control_task = asyncio.create_task(receive_controls())
    try:
        await send_frame(current_time)
        last_sent_time = current_time
        while True:
            await asyncio.sleep(0.1)
            if not is_playing:
                continue
            if current_time >= total_duration:
                is_playing = False
                continue
            current_time = min(total_duration, current_time + 5)
            if current_time != last_sent_time:
                await send_frame(current_time)
                last_sent_time = current_time
            await asyncio.sleep(max(0.05, 1.0 / playback_speed - 0.1))

    except WebSocketDisconnect:
        print(f"[SENTINEL Replay WS] Client disconnected from replay scenario: {scenario_id}")
    except Exception as e:
        print("[SENTINEL Replay WS] Playback error:", e)
    finally:
        control_task.cancel()
