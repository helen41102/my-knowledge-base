from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.item import KnowledgeItem
from app.models.user import User
from app.utils.auth import get_current_user
from app.services.ai_service import search_answer

router = APIRouter(prefix="/search", tags=["搜索"])


@router.get("/")
async def search_items(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Keyword search across all knowledge items"""
    result = await db.execute(
        select(KnowledgeItem).where(
            KnowledgeItem.owner_id == current_user.id,
            or_(
                KnowledgeItem.title.ilike(f"%{q}%"),
                KnowledgeItem.raw_content.ilike(f"%{q}%"),
                KnowledgeItem.ai_summary.ilike(f"%{q}%"),
                KnowledgeItem.ai_tags.ilike(f"%{q}%"),
            ),
        ).limit(20)
    )
    items = result.scalars().all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "ai_summary": i.ai_summary,
            "ai_tags": i.ai_tags or [],
            "folder_id": i.folder_id,
            "content_type": i.content_type,
            "created_at": i.created_at.isoformat(),
        }
        for i in items
    ]


@router.post("/ask")
async def ask_knowledge_base(
    question: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ask a question, AI answers based on your knowledge base"""
    # Retrieve relevant items (simple keyword match first)
    result = await db.execute(
        select(KnowledgeItem).where(
            KnowledgeItem.owner_id == current_user.id
        ).limit(30)
    )
    items = result.scalars().all()
    items_data = [{"title": i.title, "raw_content": i.raw_content or i.ai_summary} for i in items]

    answer = await search_answer(question, items_data)
    return {"question": question, "answer": answer}
