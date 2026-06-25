/**
 * DeepSeek AI service — runs entirely in the browser
 * API key stored in localStorage, calls DeepSeek directly
 */
import { getApiKey } from '../store/storage';

const BASE_URL = 'https://api.deepseek.com/v1';

async function chat(prompt: string, jsonMode = false): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('NO_KEY');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API 错误 ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function analyzeContent(
  text: string,
  folderNames: string[]
): Promise<{ title: string; summary: string; tags: string[]; suggestedFolder: string | null }> {
  const folders = folderNames.length ? folderNames.join('、') : '暂无';
  const prompt = `你是个人知识库助手。分析以下内容，以JSON格式返回结果。

内容：
${text.slice(0, 2000)}

用户现有文件夹：${folders}

返回JSON（不要多余文字）：
{
  "title": "简短标题（15字以内）",
  "summary": "2-3句摘要，说明核心信息",
  "tags": ["标签1", "标签2", "标签3"],
  "suggestedFolder": "最适合的文件夹名或null"
}`;

  try {
    const raw = await chat(prompt, true);
    return JSON.parse(raw);
  } catch {
    return {
      title: text.slice(0, 15),
      summary: '（AI 分析失败，内容已保存）',
      tags: [],
      suggestedFolder: null,
    };
  }
}

export async function generateDigest(
  folderName: string,
  items: { title: string; rawContent: string }[]
): Promise<{ overview: string; keyPoints: string[]; keywords: string[] }> {
  if (!items.length) return { overview: '还没有内容', keyPoints: [], keywords: [] };

  const content = items.slice(0, 15).map(i =>
    `【${i.title}】${(i.rawContent || '').slice(0, 400)}`
  ).join('\n\n');

  const prompt = `你是个人知识库助手。为文件夹「${folderName}」（共${items.length}条内容）生成智能摘要。

内容概览：
${content}

返回JSON（不要多余文字）：
{
  "overview": "2-3句话概括这个文件夹的主题和价值",
  "keyPoints": ["核心知识点1", "核心知识点2", "核心知识点3", "核心知识点4", "核心知识点5"],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6"]
}`;

  try {
    const raw = await chat(prompt, true);
    return JSON.parse(raw);
  } catch {
    return {
      overview: `「${folderName}」共有 ${items.length} 条内容`,
      keyPoints: ['AI 摘要生成失败，请检查 API Key'],
      keywords: [],
    };
  }
}

export async function askQuestion(
  question: string,
  items: { title: string; rawContent: string }[]
): Promise<string> {
  const context = items.slice(0, 10).map(i =>
    `【${i.title}】${(i.rawContent || '').slice(0, 600)}`
  ).join('\n\n');

  const prompt = `你是用户的个人知识库助手。根据以下知识库内容回答问题。如果没有相关信息请如实说明。

知识库内容：
${context}

用户问题：${question}

请给出简洁、有帮助的回答：`;

  return chat(prompt);
}
