"""
AI Service - DeepSeek API integration
Handles: content summarization, tag generation, folder categorization, smart digest
"""
import json
import logging
from typing import Optional
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)


def get_client() -> Optional[AsyncOpenAI]:
    if not settings.DEEPSEEK_API_KEY:
        return None
    return AsyncOpenAI(
        api_key=settings.DEEPSEEK_API_KEY,
        base_url=settings.DEEPSEEK_BASE_URL,
    )


async def analyze_content(text: str, existing_folders: list[str]) -> dict:
    """
    Analyze uploaded content, return:
    - summary: 2-3 sentence summary
    - tags: list of 3-5 keywords
    - suggested_folder: best matching folder name from existing_folders
    - title: auto-generated title if content is long
    """
    client = get_client()
    if not client:
        return _mock_analysis(text)

    folders_str = "、".join(existing_folders) if existing_folders else "暂无文件夹"

    prompt = f"""你是一个个人知识库助手。请分析以下内容，并以 JSON 格式返回结果。

内容：
{text[:3000]}

用户现有的文件夹分类：{folders_str}

请返回以下 JSON（不要有多余的文字）：
{{
  "title": "简短标题（15字以内）",
  "summary": "2-3句话摘要，说明这段内容的核心信息",
  "tags": ["标签1", "标签2", "标签3"],
  "suggested_folder": "最适合归入的文件夹名（从现有文件夹中选，如果都不合适返回null）",
  "confidence": 0.85
}}"""

    try:
        response = await client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=500,
        )
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        logger.error(f"DeepSeek API error in analyze_content: {e}")
        return _mock_analysis(text)


async def generate_folder_digest(folder_name: str, items: list[dict]) -> dict:
    """
    Generate AI smart digest for a folder:
    - overview: paragraph summary of the whole folder
    - key_points: list of bullet-point insights
    - keywords: top keywords across all content
    """
    client = get_client()
    if not client or not items:
        return _mock_digest(folder_name, items)

    # Build content summary from items
    items_text = "\n\n".join([
        f"【{item.get('title', '无标题')}】\n{(item.get('raw_content') or '')[:500]}"
        for item in items[:20]  # limit to 20 items to avoid token overflow
    ])

    prompt = f"""你是一个个人知识库助手。请为以下文件夹内容生成智能摘要清单。

文件夹名称：{folder_name}
内容共 {len(items)} 条，以下是各条目摘要：

{items_text}

请返回以下 JSON（不要有多余文字）：
{{
  "overview": "2-3句话概括这个文件夹里的知识主题和价值",
  "key_points": [
    "核心知识点1",
    "核心知识点2",
    "核心知识点3",
    "核心知识点4",
    "核心知识点5"
  ],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6", "关键词7", "关键词8"]
}}"""

    try:
        response = await client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=800,
        )
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        logger.error(f"DeepSeek API error in generate_folder_digest: {e}")
        return _mock_digest(folder_name, items)


async def search_answer(query: str, items: list[dict]) -> str:
    """
    Answer a natural language question based on knowledge base content.
    """
    client = get_client()
    if not client:
        return "AI 功能暂未配置，请设置 DEEPSEEK_API_KEY。"

    context = "\n\n".join([
        f"【{item.get('title')}】{(item.get('raw_content') or '')[:800]}"
        for item in items[:10]
    ])

    prompt = f"""你是用户的个人知识库助手。请根据以下知识库内容回答用户的问题。
如果知识库中没有相关信息，请如实说明。

知识库内容：
{context}

用户问题：{query}

请给出简洁、有帮助的回答："""

    try:
        response = await client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=600,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"DeepSeek API error in search_answer: {e}")
        return f"AI 回答暂时不可用：{str(e)}"


# ---- Mock responses when API key is not set ----

def _mock_analysis(text: str) -> dict:
    words = text[:50].strip()
    return {
        "title": words[:15] + "..." if len(words) > 15 else words,
        "summary": f"这段内容共 {len(text)} 个字符。请配置 DEEPSEEK_API_KEY 以启用 AI 智能分析。",
        "tags": ["待分析", "知识笔记", "个人收藏"],
        "suggested_folder": None,
        "confidence": 0.0,
    }


def _mock_digest(folder_name: str, items: list) -> dict:
    return {
        "overview": f"「{folder_name}」文件夹共有 {len(items)} 条内容。请配置 DEEPSEEK_API_KEY 以启用 AI 智能摘要。",
        "key_points": [
            "配置 DeepSeek API Key 后将自动生成核心知识点",
            f"当前共收录 {len(items)} 条内容",
        ],
        "keywords": ["待分析"],
    }
