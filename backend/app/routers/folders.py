from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.folder import Folder
from app.models.item import KnowledgeItem, AISummary
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/folders", tags=["文件夹"])


class FolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#2D5BE3"
    icon: str = "📁"
    parent_id: Optional[int] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class FolderOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: str
    icon: str
    parent_id: Optional[int]
    item_count: int = 0
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[dict])
async def list_folders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Folder).where(Folder.owner_id == current_user.id)
    )
    folders = result.scalars().all()

    folder_list = []
    for f in folders:
        count_result = await db.execute(
            select(func.count(KnowledgeItem.id)).where(KnowledgeItem.folder_id == f.id)
        )
        item_count = count_result.scalar() or 0
        folder_list.append({
            "id": f.id,
            "name": f.name,
            "description": f.description,
            "color": f.color,
            "icon": f.icon,
            "parent_id": f.parent_id,
            "item_count": item_count,
            "created_at": f.created_at.isoformat(),
        })
    return folder_list


@router.post("/", response_model=dict)
async def create_folder(
    req: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = Folder(
        name=req.name,
        description=req.description,
        color=req.color,
        icon=req.icon,
        parent_id=req.parent_id,
        owner_id=current_user.id,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return {"id": folder.id, "name": folder.name, "color": folder.color, "icon": folder.icon, "item_count": 0, "created_at": folder.created_at.isoformat()}


@router.put("/{folder_id}", response_model=dict)
async def update_folder(
    folder_id: int,
    req: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.owner_id == current_user.id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    if req.name: folder.name = req.name
    if req.description is not None: folder.description = req.description
    if req.color: folder.color = req.color
    if req.icon: folder.icon = req.icon

    await db.commit()
    return {"message": "更新成功"}


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.owner_id == current_user.id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")
    await db.delete(folder)
    await db.commit()
    return {"message": "删除成功"}


@router.get("/{folder_id}/digest", response_model=dict)
async def get_folder_digest(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated smart digest for a folder"""
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.owner_id == current_user.id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    # Get latest summary
    summary_result = await db.execute(
        select(AISummary).where(AISummary.folder_id == folder_id).order_by(AISummary.updated_at.desc())
    )
    summary = summary_result.scalar_one_or_none()

    if summary:
        return {
            "folder_id": folder_id,
            "folder_name": folder.name,
            "overview": summary.overview,
            "key_points": summary.key_points,
            "keywords": summary.keywords,
            "item_count": summary.item_count,
            "generated_at": summary.generated_at.isoformat(),
        }
    return {
        "folder_id": folder_id,
        "folder_name": folder.name,
        "overview": "还没有内容，快去上传你的第一条知识吧！",
        "key_points": [],
        "keywords": [],
        "item_count": 0,
        "generated_at": None,
    }


@router.post("/{folder_id}/regenerate-digest")
async def regenerate_digest(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI digest regeneration for a folder"""
    from app.services.ai_service import generate_folder_digest

    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.owner_id == current_user.id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    items_result = await db.execute(
        select(KnowledgeItem).where(KnowledgeItem.folder_id == folder_id).limit(20)
    )
    items = items_result.scalars().all()
    items_data = [{"title": i.title, "raw_content": i.raw_content or i.ai_summary} for i in items]

    digest = await generate_folder_digest(folder.name, items_data)

    # Upsert summary
    summary_result = await db.execute(
        select(AISummary).where(AISummary.folder_id == folder_id)
    )
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
    return {"message": "AI 摘要已更新", "overview": digest.get("overview")}
