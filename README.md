# 🧠 MindVault — 个人长期记忆知识库

> 上传任意内容，AI 自动归档分类，实时生成智能摘要清单。你的第二大脑。

## ✨ 功能特色

- 📝 **多格式上传**：文字、PDF、Word、图片、链接
- 📁 **自定义文件夹**：按学科/主题自由分类，支持颜色和图标
- 🤖 **AI 自动归档**：DeepSeek 自动识别内容，推荐归入对应文件夹
- ✨ **AI 智能清单**：每个文件夹自动生成摘要、核心知识点、关键词
- 🔍 **全局搜索 + AI 问答**：关键词搜索 or 直接问知识库
- 📱 **移动端优先**：微信浏览器完美支持，可添加到桌面

## 🚀 快速开始

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USERNAME/my-knowledge-base.git
cd my-knowledge-base

# 2. 配置后端
cd backend
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY
pip install -r requirements.txt

# 3. 启动后端
uvicorn app.main:app --reload

# 4. 启动前端（新开终端）
cd ../frontend
npm install
npm run dev
# 打开 http://localhost:5173
```

### 一键部署到 Railway（推荐）

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Fork 本项目到你的 GitHub
2. 登录 [railway.app](https://railway.app)
3. New Project → Deploy from GitHub repo → 选择本项目
4. 在 Variables 中添加：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
   - `SECRET_KEY` = 一个随机长字符串（用于 JWT 加密）
5. 等待部署完成，复制生成的域名
6. 在微信中打开域名即可使用！

## 🌐 微信使用说明

部署完成后：
1. 把 Railway 给你的 URL 分享到微信
2. 微信内置浏览器直接打开，注册账号
3. 点击右上角菜单 → "在浏览器中打开" → 可添加到手机桌面

## 📁 项目结构

```
my-knowledge-base/
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── main.py       # 入口
│   │   ├── config.py     # 配置
│   │   ├── database.py   # 数据库
│   │   ├── models/       # 数据模型
│   │   ├── routers/      # API 路由
│   │   ├── services/     # AI & 文件服务
│   │   └── utils/        # 认证工具
│   ├── requirements.txt
│   └── .env.example
├── frontend/             # React + TypeScript 前端
│   ├── src/
│   │   ├── App.tsx       # 主应用
│   │   ├── api/          # API 客户端
│   │   ├── store/        # 状态管理
│   │   └── components/   # UI 组件
│   └── package.json
├── Dockerfile            # 前后端一体化部署
├── railway.json          # Railway 部署配置
└── README.md
```

## 🔧 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | ✅ |
| `SECRET_KEY` | JWT 签名密钥（随机字符串） | ✅ |
| `DATABASE_URL` | 数据库连接（默认 SQLite） | 可选 |
| `DEEPSEEK_MODEL` | 使用的模型（默认 deepseek-chat） | 可选 |

## 📝 License

MIT
