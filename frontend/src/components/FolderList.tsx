import { useState } from 'react';
import { api } from '../api/client';

interface Folder {
  id: number;
  name: string;
  icon: string;
  color: string;
  item_count: number;
  description?: string;
}

const ICONS = ['📁', '📚', '🎨', '💼', '🔬', '🌱', '💡', '⭐', '🎯', '🏠', '✈️', '🎵'];
const COLORS = ['#2D5BE3', '#7C3AED', '#F05A28', '#2ECC71', '#E91E63', '#FF9800', '#00BCD4', '#795548'];

interface Props {
  folders: Folder[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onRefresh: () => void;
}

export default function FolderList({ folders, selectedId, onSelect, onRefresh }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#2D5BE3');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.createFolder({ name: name.trim(), icon, color });
      setName(''); setShowNew(false);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('确认删除这个文件夹及其全部内容？')) return;
    await api.deleteFolder(id);
    if (selectedId === id) onSelect(null);
    onRefresh();
  };

  return (
    <div className="space-y-2">
      {/* All items button */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          selectedId === null
            ? 'bg-primary-500 text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-primary-50'
        }`}
      >
        <span>🌐</span>
        <span>全部内容</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${selectedId === null ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
          {folders.reduce((s, f) => s + f.item_count, 0)}
        </span>
      </button>

      {/* Folder list */}
      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onSelect(folder.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all group ${
            selectedId === folder.id
              ? 'text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          style={selectedId === folder.id ? { backgroundColor: folder.color } : {}}
        >
          <span>{folder.icon}</span>
          <span className="truncate flex-1 text-left font-medium">{folder.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${selectedId === folder.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
            {folder.item_count}
          </span>
          <span
            onClick={(e) => handleDelete(e, folder.id)}
            className={`opacity-0 group-hover:opacity-100 text-lg leading-none flex-shrink-0 ${selectedId === folder.id ? 'text-white/70 hover:text-white' : 'text-gray-300 hover:text-red-400'}`}
          >
            ×
          </span>
        </button>
      ))}

      {/* New folder */}
      {showNew ? (
        <div className="bg-white rounded-xl p-4 space-y-3 shadow border border-primary-100">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="文件夹名称"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)} className={`text-xl p-1 rounded-lg ${icon === ic ? 'bg-primary-100' : 'hover:bg-gray-100'}`}>{ic}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={loading || !name.trim()} className="flex-1 bg-primary-500 text-white text-sm py-2 rounded-lg disabled:opacity-50">
              {loading ? '创建中...' : '创建'}
            </button>
            <button onClick={() => { setShowNew(false); setName(''); }} className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-lg">
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-primary-500 border-2 border-dashed border-primary-200 hover:border-primary-400 hover:bg-primary-50 transition-all"
        >
          <span>+</span>
          <span>新建文件夹</span>
        </button>
      )}
    </div>
  );
}
