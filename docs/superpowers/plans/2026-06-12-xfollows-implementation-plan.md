# XFollows Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 browser extension that allows users to automatically follow back X/Twitter users filtered by interest tags extracted from their profile pages.

**Architecture:** MV3 architecture with Service Worker (background) managing alarms and state, Content Script performing DOM operations on X pages, and a React-based popup UI for configuration. All data stored locally via chrome.storage.

**Tech Stack:** TypeScript, Vite, React 18, Tailwind CSS, Chrome Extension APIs (storage, alarms, messaging)

---

## File Structure Overview

**New files to create:**
- `manifest.json` - MV3 manifest
- `background/background.ts` - Service Worker
- `content/content.ts` - Content Script for DOM operations
- `popup/popup.html` - Popup entry HTML
- `popup/popup.tsx` - React popup root
- `popup/components/SettingsPanel.tsx` - 设置面板
- `popup/components/TagFilter.tsx` - 标签多选筛选器
- `popup/components/StatusDisplay.tsx` - 任务状态显示
- `utils/storage.ts` - Storage 封装
- `utils/i18n.ts` - 国际化
- `utils/tag-extractor.ts` - 标签提取逻辑
- `utils/messaging.ts` - 消息通信类型
- `types/index.ts` - 全局类型定义
- `_locales/zh_CN/messages.json` - 中文翻译
- `_locales/en/messages.json` - 英文翻译
- `vite.config.ts` - Vite 配置
- `tsconfig.json` - TypeScript 配置
- `package.json` - 项目依赖

**No existing files to modify** (new project)

---

## Task 1: 项目脚手架与配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.json`

- [ ] **Step 1.1: 初始化 package.json**

```json
{
  "name": "xfollows",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "i18next": "^23.11.5"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1"
  }
}
```

- [ ] **Step 1.2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["chrome"]
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 1.3: 创建 vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/popup.html'),
        background: resolve(__dirname, 'background/background.ts'),
        content: resolve(__dirname, 'content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

- [ ] **Step 1.4: 创建 manifest.json**

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "version": "0.1.0",
  "description": "__MSG_extDesc__",
  "default_locale": "zh_CN",
  "permissions": ["storage", "alarms"],
  "host_permissions": ["https://x.com/*", "https://twitter.com/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://x.com/*", "https://twitter.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 1.5: 提交**

```bash
git add package.json tsconfig.json vite.config.ts manifest.json
git commit -m "chore: initialize project scaffold and manifest"
```

---

## Task 2: 类型定义与工具函数

**Files:**
- Create: `types/index.ts`
- Create: `utils/storage.ts`
- Create: `utils/messaging.ts`

- [ ] **Step 2.1: 创建 types/index.ts**

```ts
export interface Settings {
  intervalMinutes: number;
  batchSize: number;
  enabledTags: string[];
  language: 'zh' | 'en';
  autoRun: boolean;
}

export interface UserTags {
  userId: string;
  username: string;
  tags: string[];
  manualTags?: string[];
  lastUpdated: number;
}

export interface TaskState {
  running: boolean;
  nextRunTime: number | null;
  processedCount: number;
  lastRunResult?: {
    success: number;
    failed: number;
    timestamp: number;
  };
}

export interface BackgroundMessage {
  type: 'START_TASK' | 'STOP_TASK' | 'GET_STATUS' | 'EXECUTE_BATCH' | 'UPDATE_SETTINGS';
  payload?: any;
}
```

- [ ] **Step 2.2: 创建 utils/storage.ts**

```ts
import { Settings, UserTags, TaskState } from '../types';

const DEFAULT_SETTINGS: Settings = {
  intervalMinutes: 30,
  batchSize: 10,
  enabledTags: [],
  language: 'zh',
  autoRun: true,
};

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get('settings');
  return result.settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

export async function getUserTags(userId: string): Promise<UserTags | null> {
  const result = await chrome.storage.local.get('userTags');
  const allTags = result.userTags || {};
  return allTags[userId] || null;
}

export async function saveUserTags(userTags: UserTags): Promise<void> {
  const result = await chrome.storage.local.get('userTags');
  const allTags = result.userTags || {};
  allTags[userTags.userId] = userTags;
  await chrome.storage.local.set({ userTags: allTags });
}

export async function getTaskState(): Promise<TaskState> {
  const result = await chrome.storage.local.get('taskState');
  return result.taskState || { running: false, nextRunTime: null, processedCount: 0 };
}

export async function saveTaskState(state: TaskState): Promise<void> {
  await chrome.storage.local.set({ taskState: state });
}
```

- [ ] **Step 2.3: 创建 utils/messaging.ts**

```ts
import { BackgroundMessage } from '../types';

export function sendToBackground(message: BackgroundMessage): Promise<any> {
  return chrome.runtime.sendMessage(message);
}

export function sendToContent(tabId: number, message: any): Promise<any> {
  return chrome.tabs.sendMessage(tabId, message);
}
```

- [ ] **Step 2.4: 提交**

```bash
git add types/ utils/
git commit -m "feat: add types and storage utilities"
```

---

## Task 3: Background Service Worker

**Files:**
- Create: `background/background.ts`

- [ ] **Step 3.1: 实现 background.ts 基础结构**

```ts
import { getSettings, getTaskState, saveTaskState } from '../utils/storage';
import { BackgroundMessage } from '../types';

let currentAlarm: string | null = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('XFollows installed');
});

chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: BackgroundMessage): Promise<any> {
  switch (message.type) {
    case 'START_TASK':
      return startTask();
    case 'STOP_TASK':
      return stopTask();
    case 'GET_STATUS':
      return getTaskState();
    case 'UPDATE_SETTINGS':
      return updateSettings(message.payload);
    default:
      return { error: 'Unknown message type' };
  }
}

async function startTask() {
  const settings = await getSettings();
  if (currentAlarm) {
    chrome.alarms.clear(currentAlarm);
  }
  currentAlarm = 'xfollows-alarm';
  chrome.alarms.create(currentAlarm, {
    periodInMinutes: settings.intervalMinutes,
  });
  const state = await getTaskState();
  state.running = true;
  state.nextRunTime = Date.now() + settings.intervalMinutes * 60 * 1000;
  await saveTaskState(state);
  return { success: true };
}

async function stopTask() {
  if (currentAlarm) {
    chrome.alarms.clear(currentAlarm);
    currentAlarm = null;
  }
  const state = await getTaskState();
  state.running = false;
  await saveTaskState(state);
  return { success: true };
}

async function updateSettings(settings: any) {
  // TODO: implement in Task 5
  return { success: true };
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'xfollows-alarm') {
    const tabs = await chrome.tabs.query({ active: true, url: ['https://x.com/*', 'https://twitter.com/*'] });
    if (tabs.length > 0 && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'EXECUTE_BATCH' });
    }
  }
});
```

- [ ] **Step 3.2: 提交**

```bash
git add background/background.ts
git commit -m "feat: implement background service worker with alarm management"
```

---

## Task 4: Content Script - 标签提取与回关

**Files:**
- Create: `content/content.ts`
- Create: `utils/tag-extractor.ts`

- [ ] **Step 4.1: 创建 utils/tag-extractor.ts**

```ts
export function extractTagsFromProfile(profileElement: HTMLElement): string[] {
  // X 页面兴趣标签通常在左下角，class 可能为 'css-xxx'，需根据实际 DOM 调整
  const tagContainer = profileElement.querySelector('[data-testid="UserDescription"]')?.parentElement;
  if (!tagContainer) return [];

  const tags: string[] = [];
  const spans = tagContainer.querySelectorAll('span');
  spans.forEach((span) => {
    const text = span.textContent?.trim();
    if (text && text.length > 0 && text.length < 20) {
      tags.push(text);
    }
  });
  return Array.from(new Set(tags)); // 去重
}

export function findUserCardElements(): HTMLElement[] {
  // 粉丝列表页的用户卡片选择器（需根据 X DOM 实际调整）
  return Array.from(document.querySelectorAll('[data-testid="UserCell"]')) as HTMLElement[];
}
```

- [ ] **Step 4.2: 实现 content.ts 核心逻辑**

```ts
import { extractTagsFromProfile, findUserCardElements } from '../utils/tag-extractor';
import { getSettings, saveUserTags, getTaskState, saveTaskState } from '../utils/storage';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_BATCH') {
    executeBatch().then(sendResponse);
    return true;
  }
});

async function executeBatch() {
  const settings = await getSettings();
  const cards = findUserCardElements();
  let processed = 0;
  let success = 0;
  let failed = 0;

  for (const card of cards) {
    if (processed >= settings.batchSize) break;

    const tags = extractTagsFromProfile(card);
    const usernameEl = card.querySelector('[data-testid="UserCell"] a[href^="/"]');
    const username = usernameEl?.textContent?.trim() || '';

    // 简单匹配：如果 enabledTags 为空或用户标签与 enabledTags 有交集
    const hasMatch = settings.enabledTags.length === 0 ||
      tags.some(tag => settings.enabledTags.includes(tag));

    if (!hasMatch) continue;

    // 查找「关注」按钮并点击
    const followBtn = card.querySelector('[data-testid$="follow"]') as HTMLButtonElement;
    if (followBtn && followBtn.textContent?.includes('关注')) {
      followBtn.click();
      success++;
      // 随机延迟
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1500));
    } else {
      failed++;
    }
    processed++;
  }

  const state = await getTaskState();
  state.processedCount += success;
  state.lastRunResult = { success, failed, timestamp: Date.now() };
  await saveTaskState(state);

  return { success, failed };
}
```

- [ ] **Step 4.3: 提交**

```bash
git add content/content.ts utils/tag-extractor.ts
git commit -m "feat: implement content script with tag extraction and batch follow"
```

---

## Task 5: Popup UI - React 界面

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.tsx`
- Create: `popup/components/SettingsPanel.tsx`
- Create: `popup/components/TagFilter.tsx`
- Create: `popup/components/StatusDisplay.tsx`

- [ ] **Step 5.1: 创建 popup/popup.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XFollows</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 5.2: 创建 popup/popup.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import SettingsPanel from './components/SettingsPanel';
import './popup.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<SettingsPanel />);
```

- [ ] **Step 5.3: 创建 popup/components/SettingsPanel.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { Settings } from '../../types';
import { getSettings, saveSettings } from '../../utils/storage';
import TagFilter from './TagFilter';
import StatusDisplay from './StatusDisplay';

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSetting = async (key: keyof Settings, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div className="w-80 p-4 bg-gray-50">
      <h1 className="text-xl font-bold mb-4">XFollows</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium">回关间隔 (分钟)</label>
        <input
          type="number"
          value={settings.intervalMinutes}
          onChange={(e) => updateSetting('intervalMinutes', parseInt(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">每次数量</label>
        <input
          type="number"
          value={settings.batchSize}
          onChange={(e) => updateSetting('batchSize', parseInt(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>

      <TagFilter
        enabledTags={settings.enabledTags}
        onChange={(tags) => updateSetting('enabledTags', tags)}
      />

      <StatusDisplay />

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'START_TASK' })}
          className="flex-1 bg-blue-500 text-white p-2 rounded"
        >
          开始自动
        </button>
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'STOP_TASK' })}
          className="flex-1 bg-gray-500 text-white p-2 rounded"
        >
          停止
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.4: 创建 popup/components/TagFilter.tsx**

```tsx
import React from 'react';

interface Props {
  enabledTags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagFilter({ enabledTags, onChange }: Props) {
  const commonTags = ['科技', 'AI', '编程', '设计', '产品', '创业'];

  const toggleTag = (tag: string) => {
    if (enabledTags.includes(tag)) {
      onChange(enabledTags.filter(t => t !== tag));
    } else {
      onChange([...enabledTags, tag]);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">标签筛选</label>
      <div className="flex flex-wrap gap-2">
        {commonTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded text-sm ${
              enabledTags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.5: 创建 popup/components/StatusDisplay.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { TaskState } from '../../types';
import { getTaskState } from '../../utils/storage';

export default function StatusDisplay() {
  const [state, setState] = useState<TaskState | null>(null);

  useEffect(() => {
    getTaskState().then(setState);
    const interval = setInterval(() => getTaskState().then(setState), 5000);
    return () => clearInterval(interval);
  }, []);

  if (!state) return null;

  return (
    <div className="text-sm text-gray-600">
      <div>状态: {state.running ? '运行中' : '已停止'}</div>
      <div>已处理: {state.processedCount} 人</div>
      {state.lastRunResult && (
        <div>上次: 成功 {state.lastRunResult.success}，失败 {state.lastRunResult.failed}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 5.6: 创建 popup/popup.css** (Tailwind 引入)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5.7: 提交**

```bash
git add popup/
git commit -m "feat: implement popup UI with React and Tailwind"
```

---

## Task 6: 国际化支持

**Files:**
- Create: `_locales/zh_CN/messages.json`
- Create: `_locales/en/messages.json`
- Modify: `utils/i18n.ts` (new)

- [ ] **Step 6.1: 创建中文翻译**

```json
{
  "extName": { "message": "XFollows" },
  "extDesc": { "message": "根据兴趣标签自动回关 X/Twitter 粉丝" },
  "settings_interval": { "message": "回关间隔 (分钟)" },
  "settings_batchSize": { "message": "每次数量" },
  "settings_tags": { "message": "标签筛选" },
  "btn_start": { "message": "开始自动" },
  "btn_stop": { "message": "停止" }
}
```

- [ ] **Step 6.2: 创建英文翻译**

```json
{
  "extName": { "message": "XFollows" },
  "extDesc": { "message": "Auto follow back X/Twitter users by interest tags" },
  "settings_interval": { "message": "Interval (minutes)" },
  "settings_batchSize": { "message": "Batch Size" },
  "settings_tags": { "message": "Tag Filter" },
  "btn_start": { "message": "Start Auto" },
  "btn_stop": { "message": "Stop" }
}
```

- [ ] **Step 6.3: 创建 utils/i18n.ts**

```ts
export function t(key: string): string {
  return chrome.i18n.getMessage(key) || key;
}
```

- [ ] **Step 6.4: 提交**

```bash
git add _locales/ utils/i18n.ts
git commit -m "feat: add i18n support for zh/en"
```

---

## Task 7: 构建与验证

**Files:**
- Modify: `package.json` (scripts)

- [ ] **Step 7.1: 运行构建**

```bash
npm run build
```

Expected: `dist/` 目录生成 `manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.js` 等文件

- [ ] **Step 7.2: 加载扩展到 Chrome**

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `dist/` 目录

- [ ] **Step 7.3: 功能验证清单**
- [ ] Popup 打开正常，设置可保存
- [ ] 标签筛选按钮可点击切换
- [ ] 在 X 粉丝页点击「开始自动」后，alarm 创建成功
- [ ] Content Script 能提取标签并执行回关（手动测试）

- [ ] **Step 7.4: 提交**

```bash
git add dist/
git commit -m "chore: build and verify extension"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-12-xfollows-implementation-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?