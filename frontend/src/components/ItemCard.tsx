import { useState } from 'react';
import { deleteItem } from '../store/storage';
import type { KnowledgeItem } from '../store/storage';

const TYPE_ICON: Record<string, string> = { text: '📝', file: '📄', image: '🖼️', url: '🔗' };

interface Props {
  item: KnowledgeItem;
  onDelete: () => void;
}

export default function ItemCard({ item, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确认删除这条内容？')) return;
    deleteItem(item.id);
    onDelete();
  };

  const date = new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

  return (
    <div onClick={() => setExpanded(!expanded)} className="bg-white rounded-xl p-4 cursor-pointer transition-all border border-transparent hover:border-blue-100">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{TYPE_ICON[item.contentType] || '📄'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-gray-800 text-sm truncate">{item.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-300">{date}</span>
              <button onClick={handleDelete} className="text-gray-200 hover:text-red-400 text-lg leading-none transition-colors">×</button>
            </div>
          </div>
          {item.aiSummary && <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{item.aiSummary}</p>}
          {item.aiTags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.aiTags.slice(0, 4).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EBF0FF', color: '#2D5BE3' }}>{tag}</span>
              ))}
            </div>
          )}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              {item.rawContent && <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.rawContent.slice(0, 600)}{item.rawContent.length > 600 ? '...' : ''}</p>}
              {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline break-all mt-1 block" onClick={e => e.stopPropagation()}>{item.sourceUrl}</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
