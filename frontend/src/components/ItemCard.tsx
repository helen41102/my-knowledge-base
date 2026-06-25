import { useState } from 'react';
import { api } from '../api/client';

interface Item {
  id: number;
  title: string;
  content_type: string;
  raw_content?: string;
  file_name?: string;
  ai_summary?: string;
  ai_tags: string[];
  folder_id?: number;
  created_at: string;
}

interface Props {
  item: Item;
  onDelete: () => void;
}

const TYPE_ICON: Record<string, string> = {
  text: '📝',
  file: '📄',
  image: '🖼️',
  url: '🔗',
};

export default function ItemCard({ item, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确认删除这条内容？')) return;
    setDeleting(true);
    try {
      await api.deleteItem(item.id);
      onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const date = new Date(item.created_at).toLocaleDateString('zh-CN', {
    month: 'numeric', day: 'numeric',
  });

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`bg-white rounded-xl p-4 cursor-pointer transition-all border border-transparent hover:border-primary-100 card-hover ${deleting ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{TYPE_ICON[item.content_type] || '📄'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-gray-800 text-sm truncate">{item.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-300">{date}</span>
              <button
                onClick={handleDelete}
                className="text-gray-200 hover:text-red-400 text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {item.ai_summary && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{item.ai_summary}</p>
          )}

          {item.ai_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.ai_tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs bg-primary-50 text-primary-500 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              {item.raw_content && (
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.raw_content.slice(0, 600)}{item.raw_content.length > 600 ? '...' : ''}</p>
              )}
              {item.file_name && !item.raw_content && (
                <p className="text-xs text-gray-400">📎 {item.file_name}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
