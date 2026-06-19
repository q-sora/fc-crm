from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # user_id → set of open WebSocket connections (one user can have multiple tabs)
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        bucket = self._connections.get(user_id)
        if bucket:
            bucket.discard(ws)
            if not bucket:
                del self._connections[user_id]

    async def send_to_user(self, user_id: int, payload: dict):
        for ws in list(self._connections.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast(self, payload: dict):
        for user_id in list(self._connections):
            await self.send_to_user(user_id, payload)


# Module-level singleton shared across the whole app
manager = ConnectionManager()
