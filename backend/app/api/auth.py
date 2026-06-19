from fastapi import APIRouter

router = APIRouter()


@router.post("/login")
async def login():
    return {"detail": "not implemented yet"}


@router.post("/logout")
async def logout():
    return {"detail": "not implemented yet"}
