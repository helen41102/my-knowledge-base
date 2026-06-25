import { useState, useEffect } from 'react';
import { getSummary, saveSummary, getItems } from '../store/storage';
import type { Folder } from '../store/storage';
import { generateDigest } from '../services/aiService';
import { getApiKey } from '../store/storage';

interface Props {
  folder: Folder;
}

export default function DigestPanel({ folder }: Props) {
  const [digest, setDigest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const s = getSummary(folder.id);
    setDigest(s);
    setLoading(false);
  }, [folder.id]);

  const handleRegenerate = async () => {
    if (!getApiKey()) { alert('请先配置 DeepSeek API Key'); return; }
    setRegenerating(true);
    try {
      const items = getItems(folder.id).map(i => ({ title: i.title, rawContent: i.rawContent || '' }));
      const result = await generateDigest(folder.name, items);
      const summary = {
        folderId: folder.id,
        overview: result.overview,
        keyPoints: result.keyPoints,
        keywords: result.keywords,
        itemCount: items.length,
        generatedAt: new Date().toISOString(),
      };
      saveSummary(summary);
      setDigest(summary);
    } catch (e: any) {
      alert('生成失败：' + e.message);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return (
    <div className="bg-white rounded-2xl p-5 mb-4 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-100 rounded w-full mb-2" />
      <div className="h-3 bg-gray-100 rounded w-5/6" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm border border-gray-100">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        style={{ borderLeft: `4px solid ${folder.color}` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">AI 智能清单</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{folder.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); handleRegenerate(); }}
            disabled={regenerating}
            className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-400 hover:text-blue-500 px-3 py-1.5 rounded-lg transition-all"
          >
            {regenerating ? '⏳ 生成中...' : '🔄 AI 刷新'}
          </button>
          <span className="text-gray-300 text-lg">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {digest ? (
            <>
              {digest.overview && (
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">{digest.overview}</p>
              )}
              {digest.keyPoints?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2">📋 核心知识点</p>
                  <ul className="space-y-2">
                    {digest.keyPoints.map((pt: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white mt-0.5" style={{ backgroundColor: folder.color }}>{i + 1}</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {digest.keywords?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2">🏷️ 关键词</p>
                  <div className="flex flex-wrap gap-2">
                    {digest.keywords.map((kw: string) => (
                      <span key={kw} className="text-xs px-3 py-1 rounded-full border font-medium" style={{ color: folder.color, borderColor: folder.color + '40', backgroundColor: folder.color + '10' }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {digest.generatedAt && (
                <p className="text-xs text-gray-300 text-right">
                  更新于 {new Date(digest.generatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <p className="text-sm">还没有 AI 摘要</p>
              <p className="text-xs mt-1">点击「AI 刷新」生成智能清单</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
