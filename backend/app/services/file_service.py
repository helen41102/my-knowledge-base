"""
File parsing service: extract text from PDF, DOCX, images, plain text
"""
import os
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)


def ensure_upload_dir():
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


async def extract_text_from_file(file_path: str, content_type: str) -> str:
    """Extract readable text from an uploaded file."""
    ext = Path(file_path).suffix.lower()

    try:
        if ext == ".pdf":
            return _extract_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return _extract_docx(file_path)
        elif ext in (".txt", ".md", ".csv"):
            return _extract_text(file_path)
        elif ext in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
            return f"[图片文件: {Path(file_path).name}]（图片内容已保存，AI 摘要基于文件名）"
        else:
            return f"[文件: {Path(file_path).name}]（不支持自动提取文本，内容已保存）"
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return f"[文件解析失败: {Path(file_path).name}]"


def _extract_pdf(file_path: str) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        texts = []
        for page in reader.pages[:20]:  # max 20 pages
            t = page.extract_text()
            if t:
                texts.append(t)
        return "\n".join(texts)
    except Exception as e:
        return f"[PDF 解析错误: {e}]"


def _extract_docx(file_path: str) -> str:
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    except Exception as e:
        return f"[DOCX 解析错误: {e}]"


def _extract_text(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        return f"[文本读取错误: {e}]"
