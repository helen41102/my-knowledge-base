import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from './store/auth';
import AuthPage from './components/AuthPage';
import FolderList from './components/FolderList';
import DigestPanel from './components/DigestPanel';
import ItemCard from './components/ItemCard';
import UploadModal from './components/UploadModal';
import SearchPage from './components/SearchPage';
import { api } from './api/client';

type Tab = 'home' | 'search' | 'profile';

export default function App() {
  const { isLoggedIn, user, logout } = useAuthStore();
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const data = await api.getFolders();
      setFolders(data);
    } catch { /* auth error handled by interceptor */ }
  }, []);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const data = await api.getItems(selectedFolderId ?? undefined);
      setItems(data);
    } finally {
      setLoadingItems(false);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    if (isLoggedIn()) {
      loadFolders();
    }
  }, [isLoggedIn, loadFolders]);

  useEffect(() => {
    if (isLoggedIn()) {
      loadItems();
    }
  }, [selectedFolderId, loadItems, isLoggedIn]);

  if (!isLoggedIn()) return <AuthPage />;

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-screen-md mx-auto relative">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 safe-top">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 text-xl p-1 rounded-lg hover:bg-gray-100">
          ☰
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-gray-800">MindVault</span>
          {selectedFolder && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-500 font-medium truncate">{selectedFolder.icon} {selectedFolder.name}</span>
            </>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-primary-500 text-white text-sm px-4 py-2 rounded-xl font-medium flex items-center gap-1 active:scale-95 transition-transform"
        >
          <span>+</span><span className="hidden sm:inline">上传</span>
        </button>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-72 bg-white h-full shadow-xl flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800">我的文件夹</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <FolderList
              folders={folders}
              selectedId={selectedFolderId}
              onSelect={(id) => { setSelectedFolderId(id); setSidebarOpen(false); setActiveTab('home'); }}
              onRefresh={loadFolders}
            />
            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{user?.username}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button onClick={logout} className="text-xs text-gray-400 hover:text-red-400">退出</button>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth">
        {activeTab === 'home' && (
          <div className="p-4 space-y-3">
            {/* AI Digest */}
            {selectedFolderId && selectedFolder && (
              <DigestPanel
                folderId={selectedFolderId}
                folderName={selectedFolder.name}
                folderColor={selectedFolder.color}
              />
            )}

            {/* Empty state */}
            {!selectedFolderId && folders.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-lg font-semibold text-gray-700 mb-2">开始建立你的知识库</h2>
                <p className="text-sm text-gray-400 mb-6">先创建一个文件夹，再上传你的第一条知识</p>
                <button onClick={() => setSidebarOpen(true)} className="bg-primary-500 text-white px-6 py-3 rounded-xl text-sm font-medium">
                  创建第一个文件夹
                </button>
              </div>
            )}

            {/* Items list */}
            {loadingItems ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-2/3" />
                        <div className="h-3 bg-gray-100 rounded w-full" />
                        <div className="h-3 bg-gray-100 rounded w-4/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {items.length === 0 && (folders.length > 0 || selectedFolderId !== null) && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm">这里还没有内容，点击右上角 + 上传</p>
                  </div>
                )}
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onDelete={() => { loadItems(); loadFolders(); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && <SearchPage />}

        {activeTab === 'profile' && (
          <div className="p-4">
            <h1 className="text-xl font-bold text-gray-800 mb-4">我的账户</h1>
            <div className="bg-white rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user?.username}</p>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                </div>
              </div>
              <div className="border-t border-gray-50 pt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>文件夹数</span>
                  <span className="font-medium text-gray-800">{folders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>知识条目数</span>
                  <span className="font-medium text-gray-800">{folders.reduce((s, f) => s + f.item_count, 0)}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full border border-red-200 text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-screen-md mx-auto bg-white border-t border-gray-100 flex safe-bottom z-30">
        {([
          { id: 'home', icon: '🏠', label: '知识库' },
          { id: 'search', icon: '🔍', label: '搜索' },
          { id: 'profile', icon: '👤', label: '我的' },
        ] as { id: Tab; icon: string; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-primary-500' : 'text-gray-400'
            }`}
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
          onSuccess={() => { loadItems(); loadFolders(); }}
        />
      )}
    </div>
  );
}
