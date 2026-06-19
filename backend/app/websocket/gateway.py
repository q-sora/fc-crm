from fastapi import APIRouter

router = APIRouter()


@router.get("/ws-placeholder")
async def ws_placeholder():
    return {"detail": "websocket gateway — not implemented yet"}
