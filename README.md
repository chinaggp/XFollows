# XFollows - Chrome 浏览器扩展

根据 X/Twitter 用户资料页上的兴趣标签自动回关粉丝的 Chrome Manifest V3 浏览器扩展。

---

## 项目说明

### 核心功能
1. **按时间间隔自动回关** - 可设置定时任务（默认 30 分钟）
2. **批量控制** - 每次回关固定数量的用户（默认 10 个）
3. **标签筛选** - 支持按 X 用户资料页左下角的兴趣标签筛选回关对象（如「科技」、「AI」）
4. **中英双语** - 支持中文和英文界面
5. **手动 + 自动触发** - 支持手动立即执行和定时自动执行

### 技术特性
- ✅ Manifest V3 标准架构
- ✅ 纯 DOM 操作（不使用 Twitter API）
- ✅ 本地存储（chrome.storage）
- ✅ React 18 + Tailwind CSS 构建 UI
- ✅ TypeScript 全类型安全
- ✅ Vite 构建工具

### 目标用户
- Twitter/X 粉丝管理者（需要批量管理大量粉丝）
- 需要根据兴趣领域筛选回关对象的用户

---

## 技术说明

### 架构设计

采用 Manifest V3 标准三层架构：

```
┌─────────────────────────────────────────────────────────┐
│                    Popup UI (React)                      │
│  - 设置面板（间隔、数量、标签筛选）                        │
│  - 任务状态显示                                          │
└─────────────────────┬───────────────────────────────────┘
                      │ chrome.runtime.sendMessage
┌─────────────────────▼───────────────────────────────────┐
│              Background Service Worker                   │
│  - chrome.alarms 定时任务管理                            │
│  - 任务状态持久化（running/nextRunTime/processedCount）   │
│  - 向活跃 X 标签页发送 EXECUTE_BATCH 消息                │
└─────────────────────┬───────────────────────────────────┘
                      │ chrome.tabs.sendMessage
┌─────────────────────▼───────────────────────────────────┐
│                   Content Script                         │
│  - 检测 X 粉丝列表页（/followers /following）             │
│  - 解析用户卡片 DOM，提取兴趣标签                         │
│  - 匹配 enabledTags 筛选，点击「关注」按钮                │
│  - 随机延迟（500-2000ms）避免被检测                       │
└─────────────────────────────────────────────────────────┘
```

### 技术选型

| 组件 | 技术 | 理由 |
|------|------|------|
| 构建工具 | Vite 5 + TypeScript 5 | 快速、类型安全 |
| UI 框架 | React 18 + Tailwind CSS 3 | 组件化 + 快速样式 |
| 状态管理 | Chrome Storage API | 轻量、无额外依赖 |
| 国际化 | chrome.i18n | 原生支持 |
| 定时任务 | chrome.alarms API | MV3 推荐方式 |

### 权限声明

```json
{
  "permissions": ["storage", "alarms"],
  "host_permissions": ["https://x.com/*", "https://twitter.com/*"],
  "manifest_version": 3
}
```

### 构建流程

```bash
npm run build
# 1. Vite 构建 background.js + content.js
# 2. Vite popup 配置构建 popup.js（lib 模式）
# 3. writeBundle hook 复制 manifest.json + _locales + 生成 popup.html
# 输出: dist/ 目录（可直接加载到 Chrome）
```

### 关键实现细节

#### 1. 标签提取（`utils/tag-extractor.ts`）
```ts
function extractTagsFromProfile(profileElement: HTMLElement): string[] {
  const tagContainer = profileElement.querySelector('[data-testid="UserDescription"]')?.parentElement;
  // 解析 span 标签文本，过滤长度 1-20 字符
}
```

#### 2. 批量回关逻辑（`content/content.ts`）
- 遍历 `[data-testid="UserCell"]` 用户卡片
- 匹配 `settings.enabledTags`（空数组 = 全部）
- 点击 `[data-testid$="follow"]` 按钮
- 随机延迟避免风控

#### 3. 定时任务（`background/background.ts`）
- `chrome.alarms.create('xfollows-alarm', { periodInMinutes })`
- alarm 触发时查询活跃 X 标签页，发送 `EXECUTE_BATCH`

#### 4. Popup UI 状态同步
- React Context + `chrome.storage.onChanged` 监听
- 设置变更立即 `saveSettings` + 通知 background

---

## 目录结构

```
XFollows/
├── manifest.json              # MV3 配置（权限、入口、图标）
├── package.json               # 项目依赖 + 构建脚本
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # 主构建配置（background + content）
├── vite.popup.config.ts       # Popup 独立构建配置（lib 模式）
│
├── background/
│   └── background.ts          # Service Worker
│       - 管理 chrome.alarms 定时任务
│       - 处理 START_TASK/STOP_TASK/GET_STATUS 消息
│       - 向 content 发送 EXECUTE_BATCH
│
├── content/
│   └── content.ts             # Content Script
│       - 监听 EXECUTE_BATCH 消息
│       - 调用 tag-extractor 解析用户列表
│       - 执行回关操作 + 随机延迟
│
├── popup/
│   ├── popup.html             # Popup 入口 HTML
│   ├── popup.tsx              # React 根组件
│   ├── popup.css              # Tailwind 样式
│   └── components/
│       ├── SettingsPanel.tsx  # 主设置面板
│       ├── TagFilter.tsx      # 标签多选筛选器（科技/AI/编程等）
│       └── StatusDisplay.tsx  # 任务状态（运行中/已处理人数）
│
├── utils/
│   ├── storage.ts             # chrome.storage 封装
│   │   - getSettings/saveSettings
│   │   - getTaskState/saveTaskState
│   │   - getUserTags/saveUserTags
│   ├── messaging.ts           # 消息通信工具
│   ├── tag-extractor.ts       # X 页面标签提取逻辑
│   └── i18n.ts                # chrome.i18n 封装
│
├── types/
│   └── index.ts               # 全局 TypeScript 接口
│       - Settings, UserTags, TaskState, BackgroundMessage
│
├── _locales/
│   ├── zh_CN/messages.json    # 中文翻译
│   └── en/messages.json       # 英文翻译
│
├── public/
│   └── icons/                 # 扩展图标（16/48/128）
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── docs/
│   └── superpowers/
│       ├── specs/             # 设计文档
│       │   └── 2026-06-12-xfollows-chrome-extension-design.md
│       └── plans/             # 实现计划
│           └── 2026-06-12-xfollows-implementation-plan.md
│
└── dist/                      # 构建输出（可直接加载到 Chrome）
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── popup/
    │   ├── popup.html
    │   └── popup.js
    ├── _locales/
    ├── icons/
    └── assets/
```

### 文件职责边界

| 目录 | 职责 | 依赖 |
|------|------|------|
| `background/` | 定时任务 + 状态管理 | `utils/storage`, `types` |
| `content/` | DOM 操作 + 回关执行 | `utils/tag-extractor`, `utils/storage` |
| `popup/` | 用户配置界面 | `utils/storage`, `types`, React |
| `utils/` | 工具函数（可复用） | `types`, Chrome APIs |
| `types/` | 类型定义（单向依赖） | 无 |

---

## 快速开始

### 开发环境要求
- Node.js 18+
- Chrome 88+（支持 Manifest V3）
- Windows PowerShell 5.1+

### 安装依赖
```bash
npm install
```

### 开发构建（监听模式）
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

### 加载到 Chrome
1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `dist/` 目录

### 测试流程
1. 导航到 `https://x.com/username/followers`
2. 点击扩展图标，配置「回关间隔」「每次数量」「标签筛选」
3. 点击「开始自动」或手动触发
4. 观察 Content Script 在控制台的执行日志

---

## 未来扩展（非 MVP）

- [ ] 支持 Firefox/Edge（需适配）
- [ ] 云端同步设置（需用户登录）
- [ ] 更复杂的分类规则（机器学习）
- [ ] 统计图表和导出功能
- [ ] 批量导入/导出分类配置

---

## License

MIT

---

**版本**: 0.1.0
**最后更新**: 2026-06-12
**维护者**: XFollows Team
