import { useState, useEffect, useCallback } from 'react';
import ApiKeySetup from './components/ApiKeySetup';
import FolderList from './components/FolderList';
import DigestPanel from './components/DigestPanel';
import ItemCard from './components/ItemCard';
import UploadModal from './components/UploadModal';
import SearchPage from './components/SearchPage';
import { getApiKey, setApiKey, getFolders, getItems, getFolderItemCount } from './store/storage';
import type { Folder, KnowledgeItem } from './store/storage';

type Tab = 'home' | 'search' | 'settings';

export default function App() {
  const [ready, setReady] = useState(false); // API key configured
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if API key already set
    setReady(!!getApiKey());
  }, []);

  const refreshFolders = useCallback(() => {
    setFolders(getFolders());
  }, []);

  const refreshItems = useCallback(() => {
    setItems(getItems(selectedFolderId ?? undefined));
  }, [selectedFolderId]);

  useEffect(() => { refreshFolders(); }, [refreshFolders]);
  useEffect(() => { refreshItems(); }, [selectedFolderId, refreshItems]);

  const refresh = () => { refreshFolders(); refreshItems(); };

  if (!ready) {
    return <ApiKeySetup onSaved={() => setReady(true)} />;
  }

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const totalItems = folders.reduce((s, f) => s + getFolderItemCount(f.id), 0);

  return (
    <div className="min-h-screen flex flex-col max-w-screen-md mx-auto relative" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 text-xl p-1 rounded-lg hover:bg-gray-100">☰</button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-gray-800">MindVault</span>
          {selectedFolder && (
            <><span className="text-gray-300">/</span><span className="text-sm text-gray-500 font-medium truncate">{selectedFolder.icon} {selectedFolder.name}</span></>
          )}
        </div>
        <button onClick={() => setShowUpload(true)} className="text-white text-sm px-4 py-2 rounded-xl font-medium flex items-center gap-1 active:scale-95 transition-transform" style={{ backgroundColor: '#2D5BE3' }}>
          <span>+</span><span>上传</span>
        </button>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-72 bg-white h-full shadow-xl flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800">📁 我的文件夹</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <FolderList
              folders={folders}
              selectedId={selectedFolderId}
              onSelect={id => { setSelectedFolderId(id); setSidebarOpen(false); setActiveTab('home'); }}
              onRefresh={refreshFolders}
            />
            <div className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
              共 {totalItems} 条知识 · 数据存在本地
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && (
          <div className="p-4 space-y-3">
            {/* AI Digest */}
            {selectedFolder && <DigestPanel folder={selectedFolder} />}

            {/* Empty state */}
            {folders.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-lg font-semibold text-gray-700 mb-2">开始建立你的知识库</h2>
                <p className="text-sm text-gray-400 mb-6">先创建一个文件夹，再上传你的第一条知识</p>
                <button onClick={() => setSidebarOpen(true)} className="text-white px-6 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#2D5BE3' }}>
                  创建第一个文件夹
                </button>
              </div>
            )}

            {/* Items */}
            {items.length === 0 && folders.length > 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm">还没有内容，点击右上角 + 上传</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => <ItemCard key={item.id} item={item} onDelete={refresh} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && <SearchPage />}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <h1 className="text-xl font-bold text-gray-800">设置</h1>

            {/* API Key */}
            <div className="bg-white rounded-2xl p-5 space-y-3">
              <h2 className="font-semibold text-gray-800">🔑 DeepSeek API Key</h2>
              <p className="text-xs text-gray-400">Key 只存在本地浏览器，不会上传到任何服务器</p>
              <input
                defaultValue={getApiKey()}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              />
              <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">如何获取 API Key？</a>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-5 space-y-3">
              <h2 className="font-semibold text-gray-800">📊 统计</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>文件夹数</span><span className="font-medium text-gray-800">{folders.length}</span></div>
                <div className="flex justify-between"><span>知识条目数</span><span className="font-medium text-gray-800">{totalItems}</span></div>
                <div className="flex justify-between"><span>存储位置</span><span className="font-medium text-gray-800">本地浏览器</span></div>
              </div>
            </div>

            {/* Danger */}
            <div className="bg-white rounded-2xl p-5 space-y-3">
              <h2 className="font-semibold text-red-500">⚠️ 危险区域</h2>
              <p className="text-xs text-gray-400">清除所有本地数据，此操作不可恢复</p>
              <button
                onClick={() => {
                  if (confirm('确认清除全部数据？此操作不可恢复！')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full border border-red-200 text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
              >
                清除所有数据
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-screen-md mx-auto bg-white border-t border-gray-100 flex z-30">
        {([
          { id: 'home', icon: '🏠', label: '知识库' },
          { id: 'search', icon: '🔍', label: '搜索' },
          { id: 'settings', icon: '⚙️', label: '设置' },
        ] as { id: Tab; icon: string; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors"
            style={{ color: activeTab === tab.id ? '#2D5BE3' : '#A0AEC0' }}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          folders={folders}
          defaultFolderId={selectedFolderId}
          onClose={() => setShowUpload(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
