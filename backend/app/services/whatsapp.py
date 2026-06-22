import asyncio
import httpx

from app.config import settings


async def send_wa_text(phone: str, text: str) -> None:
    await _post("/send", {"phone": phone, "message": text})


async def send_wa_file(phone: str, file_url: str, mime_type: str, file_name: str, caption: str = "") -> None:
    await _post("/send", {
        "phone": phone,
        "message": caption,
        "fileUrl": file_url,
        "mimeType": mime_type,
        "fileName": file_name,
    })


async def _post(path: str, body: dict, retries: int = 2) -> None:
    url = f"{settings.wa_bridge_url}{path}"
    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json=body, headers={"authToken": settings.wa_bridge_token})
                resp.raise_for_status()
            return
        except (httpx.ReadTimeout, httpx.ConnectError, httpx.ConnectTimeout):
            if attempt == retries:
                raise
            await asyncio.sleep(3)
