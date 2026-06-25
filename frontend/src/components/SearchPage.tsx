import { useState } from 'react';
import { api } from '../api/client';
import ItemCard from './ItemCard';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [answer, setAnswer] = useState('');
  const [mode, setMode] = useState<'search' | 'ask'>('search');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (mode === 'search') {
        const res = await api.search(query);
        setResults(res);
        setAnswer('');
      } else {
        const res = await api.ask(query);
        setAnswer(res.answer);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">搜索知识库</h1>

      {/* Mode switch */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(['search', 'ask'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-white shadow text-primary-500' : 'text-gray-400'}`}
          >
            {m === 'search' ? '🔍 关键词搜索' : '🤖 AI 问答'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'search' ? '搜索关键词...' : '问我的知识库任何问题...'}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-60"
        >
          {loading ? '...' : '搜'}
        </button>
      </form>

      {/* AI Answer */}
      {answer && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-primary-400 mb-2">🤖 AI 基于你的知识库回答</p>
          <p className="text-sm text-gray-700 leading-relaxed">{answer}</p>
        </div>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">找到 {results.length} 条相关内容</p>
          {results.map((item) => (
            <ItemCard key={item.id} item={item} onDelete={() => setResults(results.filter(r => r.id !== item.id))} />
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && !answer && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">没有找到相关内容</p>
        </div>
      )}
    </div>
  );
}
