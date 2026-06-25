import { useState } from 'react';
import { getItems, deleteItem } from '../store/storage';
import type { KnowledgeItem } from '../store/storage';
import { askQuestion } from '../services/aiService';
import { getApiKey } from '../store/storage';
import ItemCard from './ItemCard';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [answer, setAnswer] = useState('');
  const [mode, setMode] = useState<'search' | 'ask'>('search');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      if (mode === 'search') {
        setResults(getItems(undefined, query));
        setAnswer('');
      } else {
        if (!getApiKey()) { setAnswer('请先在设置中配置 DeepSeek API Key'); return; }
        const allItems = getItems().map(i => ({ title: i.title, rawContent: i.rawContent || '' }));
        const ans = await askQuestion(query, allItems);
        setAnswer(ans);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">搜索知识库</h1>

      <div className="flex bg-gray-100 rounded-xl p-1">
        {(['search', 'ask'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className="flex-1 py-2 rounded-lg text-sm font-medium transition-all" style={mode === m ? { backgroundColor: 'white', color: '#2D5BE3' } : { color: '#718096' }}>
            {m === 'search' ? '🔍 关键词搜索' : '🤖 AI 问答'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={mode === 'search' ? '搜索关键词...' : '问我的知识库任何问题...'}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
        />
        <button type="submit" disabled={loading} className="text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-60" style={{ backgroundColor: '#2D5BE3' }}>
          {loading ? '...' : '搜'}
        </button>
      </form>

      {answer && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-400 mb-2">🤖 AI 基于你的知识库回答</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">找到 {results.length} 条相关内容</p>
          {results.map(item => (
            <ItemCard key={item.id} item={item} onDelete={() => { deleteItem(item.id); setResults(results.filter(r => r.id !== item.id)); }} />
          ))}
        </div>
      )}

      {searched && results.length === 0 && !answer && !loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">没有找到相关内容</p>
        </div>
      )}
    </div>
  );
}
