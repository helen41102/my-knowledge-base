from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#2D5BE3")   # hex color
    icon = Column(String, default="📁")          # emoji icon
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="folders")
    children = relationship("Folder", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Folder", back_populates="children", remote_side=[id])
    items = relationship("KnowledgeItem", back_populates="folder", cascade="all, delete-orphan")
    ai_summaries = relationship("AISummary", back_populates="folder", cascade="all, delete-orphan")
