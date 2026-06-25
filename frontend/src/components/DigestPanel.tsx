import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Props {
  folderId: number;
  folderName: string;
  folderColor: string;
}

export default function DigestPanel({ folderId, folderName, folderColor }: Props) {
  const [digest, setDigest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getFolderDigest(folderId).then(setDigest).finally(() => setLoading(false));
  }, [folderId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await api.regenerateDigest(folderId);
      const updated = await api.getFolderDigest(folderId);
      setDigest(updated);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 mb-4 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        style={{ borderLeft: `4px solid ${folderColor}` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">AI 智能清单</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{folderName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}
            disabled={regenerating}
            className="text-xs bg-gray-100 hover:bg-primary-50 hover:text-primary-500 text-gray-400 px-3 py-1.5 rounded-lg transition-all"
          >
            {regenerating ? '⏳ 生成中...' : '🔄 刷新'}
          </button>
          <span className="text-gray-300 text-lg">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && digest && (
        <div className="px-4 pb-4 space-y-4">
          {/* Overview */}
          {digest.overview && (
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
              {digest.overview}
            </p>
          )}

          {/* Key Points */}
          {digest.key_points?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">📋 核心知识点</p>
              <ul className="space-y-2">
                {digest.key_points.map((pt: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white mt-0.5" style={{ backgroundColor: folderColor }}>
                      {i + 1}
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords */}
          {digest.keywords?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">🏷️ 关键词</p>
              <div className="flex flex-wrap gap-2">
                {digest.keywords.map((kw: string) => (
                  <span key={kw} className="text-xs px-3 py-1 rounded-full border font-medium" style={{ color: folderColor, borderColor: folderColor + '40', backgroundColor: folderColor + '10' }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {digest.generated_at && (
            <p className="text-xs text-gray-300 text-right">
              更新于 {new Date(digest.generated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
