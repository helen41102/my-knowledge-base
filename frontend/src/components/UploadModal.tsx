import { useState } from 'react';
import { addItem, getFolders } from '../store/storage';
import type { Folder } from '../store/storage';
import { analyzeContent } from '../services/aiService';
import { getApiKey } from '../store/storage';

interface Props {
  folders: Folder[];
  defaultFolderId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'text' | 'file';

export default function UploadModal({ folders, defaultFolderId, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState<number | undefined>(defaultFolderId ?? undefined);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTextSubmit = async () => {
    const text = content || url;
    if (!text.trim()) { setError('请输入内容'); return; }
    setLoading(true); setError('');
    try {
      let aiResult = { title: title || text.slice(0, 20), summary: '', tags: [] as string[], suggestedFolder: null as string | null };

      if (getApiKey()) {
        const allFolderNames = getFolders().map(f => f.name);
        const ai = await analyzeContent(text, allFolderNames);
        aiResult = { ...ai, title: title || ai.title };
      }

      // Auto-assign folder from AI suggestion
      let actualFolderId = folderId;
      if (!actualFolderId && aiResult.suggestedFolder) {
        const matched = folders.find(f => f.name === aiResult.suggestedFolder);
        if (matched) actualFolderId = matched.id;
      }

      const item = addItem({
        title: aiResult.title || text.slice(0, 20),
        contentType: url && !content ? 'url' : 'text',
        rawContent: text,
        sourceUrl: url || undefined,
        aiSummary: aiResult.summary,
        aiTags: aiResult.tags,
        folderId: actualFolderId,
      });

      setResult({ ...item, suggestedFolder: aiResult.suggestedFolder });
      setTimeout(() => { onSuccess(); onClose(); }, 1800);
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (file: File) => {
    setLoading(true); setError('');
    try {
      // Read file as text
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['txt', 'md', 'csv'].includes(ext || '')) {
        text = await file.text();
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        text = `[图片：${file.name}]`;
      } else {
        text = `[文件：${file.name}]（${(file.size / 1024).toFixed(1)} KB）`;
      }

      let aiResult = { title: file.name, summary: '', tags: [] as string[], suggestedFolder: null as string | null };
      if (getApiKey() && text.length > 10) {
        const allFolderNames = getFolders().map(f => f.name);
        aiResult = await analyzeContent(text, allFolderNames);
      }

      let actualFolderId = folderId;
      if (!actualFolderId && aiResult.suggestedFolder) {
        const matched = folders.find(f => f.name === aiResult.suggestedFolder);
        if (matched) actualFolderId = matched.id;
      }

      const item = addItem({
        title: aiResult.title || file.name,
        contentType: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '') ? 'image' : 'file',
        rawContent: text,
        fileName: file.name,
        aiSummary: aiResult.summary,
        aiTags: aiResult.tags,
        folderId: actualFolderId,
      });

      setResult(item);
      setTimeout(() => { onSuccess(); onClose(); }, 1800);
    } catch (e: any) {
      setError(e.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">添加到知识库</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {(['text', 'file'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 rounded-lg text-sm font-medium transition-all" style={tab === t ? { backgroundColor: 'white', color: '#2D5BE3' } : { color: '#718096' }}>
              {t === 'text' ? '📝 文字 / 链接' : '📎 文件 / 图片'}
            </button>
          ))}
        </div>

        {tab === 'text' ? (
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题（选填，AI 会自动生成）" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" />
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="粘贴文字内容、笔记、想法..." rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none" />
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="或者粘贴链接 URL（选填）" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" />
          </div>
        ) : (
          <label className="block border-2 border-dashed border-blue-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
            <input type="file" className="hidden" accept=".txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSubmit(f); }} />
            <div className="text-4xl mb-3">☁️</div>
            <p className="text-sm text-gray-500">点击选择文件</p>
            <p className="text-xs text-gray-400 mt-1">支持 TXT、MD、图片（PDF 暂不支持本地版）</p>
          </label>
        )}

        {/* Folder */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">归入文件夹（AI 会自动推荐）</label>
          <select value={folderId ?? ''} onChange={e => setFolderId(e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white">
            <option value="">让 AI 自动判断</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
          </select>
        </div>

        {error && <div className="mt-3 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {result && (
          <div className="mt-3 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl space-y-1">
            <p className="font-medium">✅ 已保存：{result.title}</p>
            {result.aiSummary && <p className="text-xs opacity-80">{result.aiSummary}</p>}
            {result.aiTags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {result.aiTags.map((t: string) => <span key={t} className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{t}</span>)}
              </div>
            )}
          </div>
        )}

        {tab === 'text' && (
          <button onClick={handleTextSubmit} disabled={loading || !!result} className="mt-4 w-full text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60" style={{ backgroundColor: '#2D5BE3' }}>
            {loading ? '🤖 AI 分析中...' : result ? '✅ 已保存' : '保存到知识库'}
          </button>
        )}
      </div>
    </div>
  );
}
