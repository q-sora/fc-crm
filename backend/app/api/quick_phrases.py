from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.quick_phrase import QuickPhrase
from app.models.user import User
from app.schemas.quick_phrase import QuickPhraseCreate, QuickPhraseResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=list[QuickPhraseResponse])
async def list_phrases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.scalars(
        select(QuickPhrase)
        .where(QuickPhrase.created_by == current_user.id)
        .order_by(QuickPhrase.title)
    )
    return result.all()


@router.post("", response_model=QuickPhraseResponse, status_code=status.HTTP_201_CREATED)
async def create_phrase(
    body: QuickPhraseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    phrase = QuickPhrase(title=body.title, body=body.body, created_by=current_user.id)
    db.add(phrase)
    await db.commit()
    await db.refresh(phrase)
    return phrase


@router.delete("/{phrase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_phrase(
    phrase_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    phrase = await db.get(QuickPhrase, phrase_id)
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phrase not found")
    await db.delete(phrase)
    await db.commit()
