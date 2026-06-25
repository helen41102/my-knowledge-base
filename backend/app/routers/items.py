import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.item import KnowledgeItem, AISummary
from app.models.folder import Folder
from app.models.user import User
from app.utils.auth import get_current_user
from app.config import settings
from app.services.file_service import extract_text_from_file, ensure_upload_dir
from app.services.ai_service import analyze_content

router = APIRouter(prefix="/items", tags=["知识条目"])


class ItemCreate(BaseModel):
    title: str
    content: str
    folder_id: Optional[int] = None
    source_url: Optional[str] = None


class ItemOut(BaseModel):
    id: int
    title: str
    content_type: str
    raw_content: Optional[str]
    file_name: Optional[str]
    ai_summary: Optional[str]
    ai_tags: list
    folder_id: Optional[int]
    created_at: str

    class Config:
        from_attributes = True


async def _trigger_folder_digest(folder_id: int, db: AsyncSession, user_id: int):
    """Background task: regenerate folder digest after new item"""
    try:
        from app.services.ai_service import generate_folder_digest
        items_result = await db.execute(
            select(KnowledgeItem).where(KnowledgeItem.folder_id == folder_id).limit(20)
        )
        items = items_result.scalars().all()
        items_data = [{"title": i.title, "raw_content": i.raw_content or i.ai_summary} for i in items]

        folder_result = await db.execute(select(Folder).where(Folder.id == folder_id))
        folder = folder_result.scalar_one_or_none()
        if not folder:
            return

        digest = await generate_folder_digest(folder.name, items_data)

        summary_result = await db.execute(select(AISummary).where(AISummary.folder_id == folder_id))
        summary = summary_result.scalar_one_or_none()

        if summary:
            summary.overview = digest.get("overview")
            summary.key_points = digest.get("key_points", [])
            summary.keywords = digest.get("keywords", [])
            summary.item_count = len(items)
        else:
            summary = AISummary(
                folder_id=folder_id,
                overview=digest.get("overview"),
                key_points=digest.get("key_points", []),
                keywords=digest.get("keywords", []),
                item_count=len(items),
            )
            db.add(summary)

        await db.commit()
    except Exception:
        pass  # background task, silent fail


@router.get("/", response_model=List[dict])
async def list_items(
    folder_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(KnowledgeItem).where(KnowledgeItem.owner_id == current_user.id)
    if folder_id is not None:
        query = query.where(KnowledgeItem.folder_id == folder_id)
    if search:
        query = query.where(
            or_(
                KnowledgeItem.title.ilike(f"%{search}%"),
                KnowledgeItem.raw_content.ilike(f"%{search}%"),
                KnowledgeItem.ai_summary.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(KnowledgeItem.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    return [
        {
            "id": i.id,
            "title": i.title,
            "content_type": i.content_type,
            "raw_content": (i.raw_content or "")[:300],
            "file_name": i.file_name,
            "file_size": i.file_size,
            "ai_summary": i.ai_summary,
            "ai_tags": i.ai_tags or [],
            "folder_id": i.folder_id,
            "created_at": i.created_at.isoformat(),
        }
        for i in items
    ]


@router.post("/text", response_model=dict)
async def add_text_item(
    req: ItemCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a text / URL note to the knowledge base"""
    # Get existing folders for AI categorization
    folders_result = await db.execute(
        select(Folder.name).where(Folder.owner_id == current_user.id)
    )
    folder_names = [r[0] for r in folders_result.all()]

    # AI analysis
    analysis = await analyze_content(req.content, folder_names)

    # Auto-assign folder if AI suggests one
    folder_id = req.folder_id
    if not folder_id and analysis.get("suggested_folder"):
        folder_res = await db.execute(
            select(Folder).where(
                Folder.name == analysis["suggested_folder"],
                Folder.owner_id == current_user.id,
            )
        )
        suggested = folder_res.scalar_one_or_none()
        if suggested:
            folder_id = suggested.id

    item = KnowledgeItem(
        title=req.title or analysis.get("title", "未命名笔记"),
        content_type="url" if req.source_url else "text",
        raw_content=req.content,
        source_url=req.source_url,
        ai_summary=analysis.get("summary"),
        ai_tags=analysis.get("tags", []),
        ai_category_suggestion=analysis.get("suggested_folder"),
        folder_id=folder_id,
        owner_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    if folder_id:
        background_tasks.add_task(_trigger_folder_digest, folder_id, db, current_user.id)

    return {
        "id": item.id,
        "title": item.title,
        "ai_summary": item.ai_summary,
        "ai_tags": item.ai_tags,
        "suggested_folder": analysis.get("suggested_folder"),
        "folder_id": folder_id,
    }


@router.post("/upload", response_model=dict)
async def upload_file_item(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file (PDF, DOCX, image, txt) to the knowledge base"""
    ensure_upload_dir()

    # Save file
    ext = Path(file.filename).suffix.lower()
    safe_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="文件超过 50MB 限制")

    with open(file_path, "wb") as f:
        f.write(content)

    # Extract text
    text = await extract_text_from_file(file_path, file.content_type or "")

    # Get folders for AI
    folders_result = await db.execute(select(Folder.name).where(Folder.owner_id == current_user.id))
    folder_names = [r[0] for r in folders_result.all()]

    # AI analysis
    analysis = await analyze_content(text or file.filename, folder_names)

    # Auto folder
    actual_folder_id = folder_id
    if not actual_folder_id and analysis.get("suggested_folder"):
        folder_res = await db.execute(
            select(Folder).where(Folder.name == analysis["suggested_folder"], Folder.owner_id == current_user.id)
        )
        suggested = folder_res.scalar_one_or_none()
        if suggested:
            actual_folder_id = suggested.id

    item = KnowledgeItem(
        title=analysis.get("title") or file.filename,
        content_type="image" if ext in (".jpg", ".jpeg", ".png", ".gif", ".webp") else "file",
        raw_content=text,
        file_path=safe_name,
        file_name=file.filename,
        file_size=len(content),
        ai_summary=analysis.get("summary"),
        ai_tags=analysis.get("tags", []),
        ai_category_suggestion=analysis.get("suggested_folder"),
        folder_id=actual_folder_id,
        owner_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    if actual_folder_id:
        background_tasks.add_task(_trigger_folder_digest, actual_folder_id, db, current_user.id)

    return {
        "id": item.id,
        "title": item.title,
        "file_name": item.file_name,
        "ai_summary": item.ai_summary,
        "ai_tags": item.ai_tags,
        "folder_id": actual_folder_id,
    }


@router.get("/{item_id}", response_model=dict)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeItem).where(KnowledgeItem.id == item_id, KnowledgeItem.owner_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="内容不存在")

    return {
        "id": item.id,
        "title": item.title,
        "content_type": item.content_type,
        "raw_content": item.raw_content,
        "file_name": item.file_name,
        "source_url": item.source_url,
        "ai_summary": item.ai_summary,
        "ai_tags": item.ai_tags or [],
        "folder_id": item.folder_id,
        "created_at": item.created_at.isoformat(),
    }


@router.put("/{item_id}/folder")
async def move_item(
    item_id: int,
    folder_id: Optional[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeItem).where(KnowledgeItem.id == item_id, KnowledgeItem.owner_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="内容不存在")
    item.folder_id = folder_id
    await db.commit()
    return {"message": "移动成功"}


@router.delete("/{item_id}")
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeItem).where(KnowledgeItem.id == item_id, KnowledgeItem.owner_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="内容不存在")
    if item.file_path:
        try:
            os.remove(os.path.join(settings.UPLOAD_DIR, item.file_path))
        except FileNotFoundError:
            pass
    await db.delete(item)
    await db.commit()
    return {"message": "删除成功"}
