/**
 * Local Storage based data store — replaces backend DB
 * All data lives in the browser. No server needed.
 */

export type Folder = {
  id: number;
  name: string;
  icon: string;
  color: string;
  description?: string;
  createdAt: string;
};

export type KnowledgeItem = {
  id: number;
  title: string;
  contentType: 'text' | 'url' | 'file' | 'image';
  rawContent: string;
  fileName?: string;
  sourceUrl?: string;
  aiSummary?: string;
  aiTags: string[];
  folderId?: number;
  createdAt: string;
};

export type AISummary = {
  folderId: number;
  overview: string;
  keyPoints: string[];
  keywords: string[];
  itemCount: number;
  generatedAt: string;
};

const KEYS = {
  folders: 'mv_folders',
  items: 'mv_items',
  summaries: 'mv_summaries',
  apiKey: 'mv_deepseek_key',
  nextId: 'mv_next_id',
};

function nextId(): number {
  const n = parseInt(localStorage.getItem(KEYS.nextId) || '1');
  localStorage.setItem(KEYS.nextId, String(n + 1));
  return n;
}

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---- API Key ----
export const getApiKey = (): string => localStorage.getItem(KEYS.apiKey) || '';
export const setApiKey = (key: string) => localStorage.setItem(KEYS.apiKey, key);

// ---- Folders ----
export const getFolders = (): Folder[] => load<Folder>(KEYS.folders);

export const createFolder = (data: Omit<Folder, 'id' | 'createdAt'>): Folder => {
  const folders = getFolders();
  const folder: Folder = { ...data, id: nextId(), createdAt: new Date().toISOString() };
  save(KEYS.folders, [...folders, folder]);
  return folder;
};

export const updateFolder = (id: number, data: Partial<Folder>) => {
  const folders = getFolders().map(f => f.id === id ? { ...f, ...data } : f);
  save(KEYS.folders, folders);
};

export const deleteFolder = (id: number) => {
  save(KEYS.folders, getFolders().filter(f => f.id !== id));
  // Move items out of deleted folder
  const items = getItems().map(i => i.folderId === id ? { ...i, folderId: undefined } : i);
  save(KEYS.items, items);
  // Remove summary
  save(KEYS.summaries, getSummaries().filter(s => s.folderId !== id));
};

// ---- Items ----
export const getItems = (folderId?: number, search?: string): KnowledgeItem[] => {
  let items = load<KnowledgeItem>(KEYS.items);
  if (folderId !== undefined) items = items.filter(i => i.folderId === folderId);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.rawContent?.toLowerCase().includes(q) ||
      i.aiSummary?.toLowerCase().includes(q) ||
      i.aiTags.some(t => t.toLowerCase().includes(q))
    );
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const addItem = (data: Omit<KnowledgeItem, 'id' | 'createdAt'>): KnowledgeItem => {
  const items = load<KnowledgeItem>(KEYS.items);
  const item: KnowledgeItem = { ...data, id: nextId(), createdAt: new Date().toISOString() };
  save(KEYS.items, [...items, item]);
  return item;
};

export const updateItem = (id: number, data: Partial<KnowledgeItem>) => {
  const items = load<KnowledgeItem>(KEYS.items).map(i => i.id === id ? { ...i, ...data } : i);
  save(KEYS.items, items);
};

export const deleteItem = (id: number) => {
  save(KEYS.items, load<KnowledgeItem>(KEYS.items).filter(i => i.id !== id));
};

// ---- AI Summaries ----
export const getSummaries = (): AISummary[] => load<AISummary>(KEYS.summaries);

export const getSummary = (folderId: number): AISummary | null =>
  getSummaries().find(s => s.folderId === folderId) || null;

export const saveSummary = (summary: AISummary) => {
  const summaries = getSummaries().filter(s => s.folderId !== summary.folderId);
  save(KEYS.summaries, [...summaries, summary]);
};

export const getFolderItemCount = (folderId: number): number =>
  load<KnowledgeItem>(KEYS.items).filter(i => i.folderId === folderId).length;
