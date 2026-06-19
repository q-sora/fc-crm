from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.services.auth import decode_access_token
from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        await ws.close(code=4001)
        return

    await manager.connect(user_id, ws)
    try:
        while True:
            # We only push server→client; read to detect disconnects / ping-pong
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)
