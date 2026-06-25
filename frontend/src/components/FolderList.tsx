import { useState } from 'react';
import { getFolders, createFolder, deleteFolder, getFolderItemCount } from '../store/storage';
import type { Folder } from '../store/storage';

const ICONS = ['📁', '📚', '🎨', '💼', '🔬', '🌱', '💡', '⭐', '🎯', '🏠', '✈️', '🎵', '💻', '🏋️', '🍳'];
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

  const handleCreate = () => {
    if (!name.trim()) return;
    createFolder({ name: name.trim(), icon, color });
    setName(''); setIcon('📁'); setColor('#2D5BE3');
    setShowNew(false);
    onRefresh();
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('确认删除这个文件夹？文件夹内容不会删除，会移到"全部"里。')) return;
    deleteFolder(id);
    if (selectedId === id) onSelect(null);
    onRefresh();
  };

  const totalCount = getFolders().reduce((s, f) => s + getFolderItemCount(f.id), 0);

  return (
    <div className="space-y-2">
      <button
        onClick={() => onSelect(null)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
        style={selectedId === null ? { backgroundColor: '#2D5BE3', color: 'white' } : { backgroundColor: 'white', color: '#4A5568' }}
      >
        <span>🌐</span>
        <span>全部内容</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={selectedId === null ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : { backgroundColor: '#F7F8FA', color: '#718096' }}>
          {totalCount}
        </span>
      </button>

      {folders.map(folder => {
        const count = getFolderItemCount(folder.id);
        const active = selectedId === folder.id;
        return (
          <button
            key={folder.id}
            onClick={() => onSelect(folder.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all group"
            style={active ? { backgroundColor: folder.color, color: 'white' } : { backgroundColor: 'white', color: '#4A5568' }}
          >
            <span>{folder.icon}</span>
            <span className="truncate flex-1 text-left font-medium">{folder.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={active ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : { backgroundColor: '#F7F8FA', color: '#718096' }}>
              {count}
            </span>
            <span
              onClick={e => handleDelete(e, folder.id)}
              className="opacity-0 group-hover:opacity-100 text-lg leading-none flex-shrink-0"
              style={{ color: active ? 'rgba(255,255,255,0.7)' : '#CBD5E0' }}
            >×</span>
          </button>
        );
      })}

      {showNew ? (
        <div className="bg-white rounded-xl p-4 space-y-3 shadow border border-blue-100">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="文件夹名称"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} className={`text-xl p-1 rounded-lg ${icon === ic ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>{ic}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!name.trim()} className="flex-1 text-white text-sm py-2 rounded-lg disabled:opacity-50" style={{ backgroundColor: '#2D5BE3' }}>创建</button>
            <button onClick={() => { setShowNew(false); setName(''); }} className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-lg">取消</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm border-2 border-dashed transition-all"
          style={{ color: '#2D5BE3', borderColor: '#bfcfff' }}
        >
          <span>+</span><span>新建文件夹</span>
        </button>
      )}
    </div>
  );
}
