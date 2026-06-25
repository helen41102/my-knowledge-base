import { useState, useRef } from 'react';
import { api } from '../api/client';

interface Props {
  folders: { id: number; name: string; icon: string }[];
  defaultFolderId?: number | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

type Tab = 'text' | 'file';

export default function UploadModal({ folders, defaultFolderId, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState<number | undefined>(defaultFolderId || undefined);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let res: any;
      if (tab === 'file' && file) {
        res = await api.uploadFile(file, folderId);
      } else {
        const text = content || url;
        if (!text.trim()) { setError('请输入内容'); setLoading(false); return; }
        res = await api.addText({
          title: title || text.slice(0, 20),
          content: text,
          folder_id: folderId,
          source_url: url || undefined,
        });
      }
      setResult(res);
      setTimeout(() => {
        onSuccess(res);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">添加到知识库</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-gray-600">×</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {(['text', 'file'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-primary-500' : 'text-gray-400'}`}>
              {t === 'text' ? '📝 文字 / 链接' : '📎 文件 / 图片'}
            </button>
          ))}
        </div>

        {tab === 'text' ? (
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题（选填，AI 会自动生成）" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="粘贴文字内容、笔记、想法..." rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="或者粘贴链接 URL（选填）" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-primary-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">☁️</div>
                <p className="text-sm text-gray-500">点击选择文件</p>
                <p className="text-xs text-gray-400 mt-1">支持 PDF、Word、TXT、图片（最大 50MB）</p>
              </div>
            )}
          </div>
        )}

        {/* Folder selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">归入文件夹（AI 会自动推荐）</label>
          <select value={folderId || ''} onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="">让 AI 自动判断</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
            ))}
          </select>
        </div>

        {error && <div className="mt-3 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {result && (
          <div className="mt-3 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">
            <p className="font-medium">✅ 已保存：{result.title}</p>
            {result.ai_summary && <p className="mt-1 text-xs opacity-80">{result.ai_summary}</p>}
            {result.ai_tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {result.ai_tags.map((t: string) => (
                  <span key={t} className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !!result}
          className="mt-4 w-full bg-primary-500 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-60 active:scale-95 transition-transform"
        >
          {loading ? '🤖 AI 分析中...' : result ? '✅ 已保存' : '保存到知识库'}
        </button>
      </div>
    </div>
  );
}
