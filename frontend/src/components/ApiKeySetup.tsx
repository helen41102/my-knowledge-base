import { useState } from 'react';
import { getApiKey, setApiKey } from '../store/storage';

interface Props {
  onSaved: () => void;
}

export default function ApiKeySetup({ onSaved }: Props) {
  const [key, setKey] = useState(getApiKey());
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    if (!key.trim().startsWith('sk-')) {
      setMsg('❌ Key 格式不对，应以 sk- 开头');
      return;
    }
    setTesting(true);
    setMsg('');
    try {
      // Quick test call
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setApiKey(key);
      setMsg('✅ 验证成功！');
      setTimeout(onSaved, 800);
    } catch (e: any) {
      setMsg(`❌ 验证失败：${e.message}，请检查 Key 是否正确`);
    } finally {
      setTesting(false);
    }
  };

  const handleSkip = () => {
    setApiKey(key);
    onSaved();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🧠</div>
          <h1 className="text-2xl font-bold" style={{ color: '#2D5BE3' }}>MindVault</h1>
          <p className="text-gray-500 text-sm mt-1">你的个人长期记忆知识库</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800 mb-1">配置 DeepSeek API Key</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              前往 <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">platform.deepseek.com</a> 获取 Key。
              Key 只存在你手机/电脑本地，不会上传到任何服务器。
            </p>
          </div>

          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#2D5BE3' } as any}
          />

          {msg && (
            <p className={`text-sm px-3 py-2 rounded-lg ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {msg}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={testing || !key.trim()}
            className="w-full py-3 rounded-xl font-medium text-sm text-white disabled:opacity-60"
            style={{ backgroundColor: '#2D5BE3' }}
          >
            {testing ? '验证中...' : '验证并开始使用'}
          </button>

          <button onClick={handleSkip} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">
            跳过（暂不使用 AI 功能）
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          数据全部存在本地浏览器，清除缓存会丢失
        </p>
      </div>
    </div>
  );
}
