const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(err.detail || '请求失败');
  }
  return res.json();
}

export const api = {
  // Auth
  register: (email: string, username: string, password: string) =>
    request<{ access_token: string; username: string; email: string; user_id: number }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; username: string; email: string; user_id: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Folders
  getFolders: () => request<any[]>('/folders/'),
  createFolder: (data: { name: string; color?: string; icon?: string; description?: string }) =>
    request<any>('/folders/', { method: 'POST', body: JSON.stringify(data) }),
  updateFolder: (id: number, data: any) =>
    request<any>(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFolder: (id: number) =>
    request<any>(`/folders/${id}`, { method: 'DELETE' }),
  getFolderDigest: (id: number) => request<any>(`/folders/${id}/digest`),
  regenerateDigest: (id: number) =>
    request<any>(`/folders/${id}/regenerate-digest`, { method: 'POST' }),

  // Items
  getItems: (folderId?: number, search?: string) => {
    const params = new URLSearchParams();
    if (folderId !== undefined) params.set('folder_id', String(folderId));
    if (search) params.set('search', search);
    return request<any[]>(`/items/?${params}`);
  },
  addText: (data: { title: string; content: string; folder_id?: number; source_url?: string }) =>
    request<any>('/items/text', { method: 'POST', body: JSON.stringify(data) }),
  uploadFile: (file: File, folderId?: number) => {
    const form = new FormData();
    form.append('file', file);
    if (folderId !== undefined) form.append('folder_id', String(folderId));
    return request<any>('/items/upload', { method: 'POST', body: form });
  },
  getItem: (id: number) => request<any>(`/items/${id}`),
  deleteItem: (id: number) => request<any>(`/items/${id}`, { method: 'DELETE' }),
  moveItem: (itemId: number, folderId: number | null) =>
    request<any>(`/items/${itemId}/folder?folder_id=${folderId}`, { method: 'PUT' }),

  // Search
  search: (q: string) => {
    const params = new URLSearchParams({ q });
    return request<any[]>(`/search/?${params}`);
  },
  ask: (question: string) =>
    request<{ question: string; answer: string }>('/search/ask', {
      method: 'POST',
      body: JSON.stringify(question),
      headers: { 'Content-Type': 'application/json' },
    }),
};
