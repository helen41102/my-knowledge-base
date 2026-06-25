from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content_type = Column(String, nullable=False)  # text | file | image | url
    raw_content = Column(Text, nullable=True)       # original text / extracted text
    file_path = Column(String, nullable=True)       # relative path for uploaded files
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    source_url = Column(String, nullable=True)

    # AI generated
    ai_summary = Column(Text, nullable=True)
    ai_tags = Column(JSON, default=list)            # ["tag1", "tag2"]
    ai_category_suggestion = Column(String, nullable=True)

    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    folder = relationship("Folder", back_populates="items")
    owner = relationship("User", back_populates="items")


class AISummary(Base):
    """AI-generated summary for a folder's content"""
    __tablename__ = "ai_summaries"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=False)
    key_points = Column(JSON, default=list)         # ["point1", "point2"]
    keywords = Column(JSON, default=list)           # ["kw1", "kw2"]
    overview = Column(Text, nullable=True)          # overall summary paragraph
    item_count = Column(Integer, default=0)
    generated_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    folder = relationship("Folder", back_populates="ai_summaries")
