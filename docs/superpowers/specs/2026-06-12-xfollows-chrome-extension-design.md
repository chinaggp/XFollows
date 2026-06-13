# XFollows Chrome Extension - 设计文档

**日期**: 2026-06-12
**项目**: XFollows - 谷歌浏览器插件
**版本**: 1.0

---

## 1. 项目概述

### 1.1 背景
用户需要一个 Chrome 浏览器插件，用于在 X/Twitter 平台上根据特定规则自动回关（follow back）粉丝。

### 1.2 核心功能
1. **按时间间隔自动回关** - 可设置定时任务
2. **批量控制** - 每次回关固定数量的用户
3. **分类回关** - 支持按 X 用户资料页上的兴趣标签筛选回关对象（如「科技」）
4. **中英双语** - 支持中文和英文界面
5. **标签提取** - 插件解析 X 页面上的兴趣标签用于筛选

### 1.3 非功能需求
- 仅支持本地存储（Chrome local storage）
- 仅支持 Chrome 浏览器（Manifest V3）
- 不使用 Twitter 官方 API（纯 DOM 操作）
- 手动 + 自动两种触发模式

---

## 2. 技术架构

### 2.1 整体架构
采用 Manifest V3 标准架构：

```
XFollows/
├── manifest.json                 # MV3 配置
├── background/
│   └── background.ts             # Service Worker - 定时任务 & 状态管理
├── content/
│   └── content.ts                # Content Script - DOM 操作
├── popup/
│   ├── popup.html
│   ├── popup.tsx                 # React 配置面板
│   └── components/               # UI 组件
├── options/
│   ├── options.html
│   └── options.tsx               # 完整设置页（可选）
├── utils/
│   ├── storage.ts                # 存储封装
│   ├── i18n.ts                   # 国际化
│   └── classifier.ts             # 自动分类逻辑
└── types/
    └── index.ts                  # TypeScript 类型定义
```

### 2.2 技术选型
| 组件 | 技术 | 理由 |
|------|------|------|
| 构建工具 | Vite + TypeScript | 现代、快速、类型安全 |
| UI 框架 | React 18 + Tailwind CSS | 组件化 + 快速样式 |
| 状态管理 | Chrome Storage API + React Context | 轻量、无额外依赖 |
| 国际化 | i18next + chrome.i18n | 成熟方案 |
| 定时任务 | chrome.alarms API | MV3 推荐方式 |

### 2.3 权限声明
```json
{
  "permissions": ["storage", "alarms"],
  "host_permissions": ["https://x.com/*", "https://twitter.com/*"],
  "manifest_version": 3
}
```

---

## 3. 核心模块设计

### 3.1 Background Service Worker (`background.ts`)
**职责**：
- 创建/管理 `chrome.alarms` 定时任务
- 维护全局任务状态（运行中/暂停、下次执行时间、统计）
- 接收来自 popup/content 的消息并路由
- 跨标签页状态同步

**关键接口**：
```ts
interface BackgroundMessage {
  type: 'START_TASK' | 'STOP_TASK' | 'GET_STATUS' | 'EXECUTE_BATCH';
  payload?: any;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 处理消息
});
```

**定时逻辑**：
- 使用 `chrome.alarms.create('xfollows-alarm', { periodInMinutes })`
- alarm 触发时向活跃的 X 标签页发送 `EXECUTE_BATCH` 消息
- 记录执行结果到 storage

### 3.2 Content Script (`content.ts`)
**职责**：
- 检测当前页面是否为 X 粉丝列表页
- 解析粉丝列表 DOM，提取用户信息 + 兴趣标签
- 执行回关操作（点击「关注」按钮）
- 应用标签筛选和数量限制
- 向 background 报告执行结果

**页面检测**：
```ts
const isFollowersPage = () => {
  return location.pathname.includes('/followers') ||
         location.pathname.includes('/following');
};
```

**DOM 操作策略**：
- 监听页面滚动加载更多粉丝
- 识别每个粉丝卡片的结构：头像、用户名、bio、关注按钮、兴趣标签（左下角）
- 提取兴趣标签文本（如「科技」）
- 模拟真实用户点击（添加随机延迟 500-2000ms）
- 避免被 X 检测为机器人

### 3.3 Popup 配置面板
**UI 布局**（紧凑，适合 popup 窗口 400x600）：

```
┌─────────────────────────────────┐
│  XFollows          [语言切换]    │
├─────────────────────────────────┤
│  ⚙️ 设置                         │
│  回关间隔: [ 30 ] 分钟          │
│  每次数量: [ 10 ] 个            │
│                                 │
│  🏷️ 标签筛选                     │
│  ☑ 科技   ☑ AI   ☑ 编程   ☑ 其他  │
│                                 │
│  🔄 自动运行: [开关]             │
│                                 │
│  [手动触发回关]  [暂停/恢复]     │
├─────────────────────────────────┤
│  📊 状态: 运行中 | 下次: 14:30  │
│  已处理: 156 人                 │
└─────────────────────────────────┘
```

**状态管理**：
- 使用 React Context + chrome.storage 同步
- 设置变更立即保存并通知 background

### 3.4 标签提取与筛选 (`tag-extractor.ts`)
**标签提取逻辑**：
- 在粉丝列表页，解析每个用户卡片左下角的兴趣标签区域
- 提取所有 `<span>` 或特定 class 的标签文本
- 示例：从 `科技`、`AI`、`编程` 等元素中提取标签数组

**实现**：
```ts
function extractTags(profileElement: HTMLElement): string[] {
  const tagContainer = profileElement.querySelector('.interest-tags');
  if (!tagContainer) return [];
  return Array.from(tagContainer.querySelectorAll('span'))
    .map(el => el.textContent?.trim())
    .filter(Boolean) as string[];
}
```

**筛选逻辑**：
- 用户在 popup 中选择需要回关的标签（如「科技」）
- Content Script 只对包含选中标签的用户执行回关

**标签缓存**：
- 提取到的标签存储在 storage 中（按 userId）
- 用户可在 popup 中手动增删标签（持久化）

---

## 4. 数据模型

### 4.1 Settings
```ts
interface Settings {
  intervalMinutes: number;      // 默认 30
  batchSize: number;            // 默认 10
  enabledTags: string[];        // 用户选中的兴趣标签，如 ['科技', 'AI']
  language: 'zh' | 'en';        // 默认 'zh'
  autoRun: boolean;             // 默认 true
}
```

### 4.2 UserTags
```ts
interface UserTags {
  userId: string;               // X 用户 ID
  username: string;
  tags: string[];               // 从 X 页面提取的兴趣标签
  manualTags?: string[];        // 用户手动添加的标签
  lastUpdated: number;          // 时间戳
}
```

### 4.3 TaskState
```ts
interface TaskState {
  running: boolean;
  nextRunTime: number | null;   // 下次执行时间戳
  processedCount: number;       // 累计处理人数
  lastRunResult?: {
    success: number;
    failed: number;
    timestamp: number;
  };
}
```

### 4.4 Storage Schema
```ts
chrome.storage.local.set({
  settings: Settings,
  userTags: Record<string, UserTags>,
  taskState: TaskState,
});
```

---

## 5. 用户流程

### 5.1 首次使用
1. 安装插件 → 打开 X 任意页面
2. 点击插件图标 → popup 提示「请前往粉丝列表页」
3. 用户导航到 `https://x.com/username/followers`
4. 在 popup 配置参数 → 开启自动运行

### 5.2 自动回关流程
1. alarm 触发（background）
2. background 向 content 发送 `EXECUTE_BATCH`
3. content 解析当前可见粉丝列表
4. 过滤：分类匹配 + 未关注
5. 按 `batchSize` 限制数量
6. 逐个点击「关注」按钮（带随机延迟）
7. 结果回传 → 更新 taskState

### 5.3 手动触发
- popup 点击「手动触发回关」按钮
- 立即执行一次 batch 操作（忽略定时）

---

## 6. 错误处理与健壮性

### 6.1 常见错误场景
| 场景 | 处理方式 |
|------|----------|
| 用户不在粉丝页 | content 返回错误，background 跳过本次 |
| 按钮点击失败 | 重试 1 次，记录失败数 |
| 页面未加载完成 | 等待 `document.readyState === 'complete'` |
| Service Worker 被回收 | alarm 自动恢复，状态从 storage 恢复 |

### 6.2 安全限制
- 每次操作添加 500-2000ms 随机延迟
- 检测到 X 风控提示（例如「操作太频繁」）→ 立即暂停任务
- 不存储任何用户凭证或敏感信息

---

## 7. 国际化

### 7.1 语言文件结构
```
_locales/
├── zh_CN/
│   └── messages.json
└── en/
    └── messages.json
```

### 7.2 代码中使用
```ts
import i18n from './utils/i18n';

const t = i18n.t; // t('settings.interval')
```

---

## 8. 测试策略

### 8.1 单元测试
- `tag-extractor.test.ts` - 标签提取逻辑
- `storage.test.ts` - 存储封装

### 8.2 集成测试（手动）
- 在真实 X 页面测试 DOM 操作
- 验证定时任务触发

### 8.3 浏览器兼容性
- 仅测试 Chrome 最新版（MV3 要求 Chrome 88+）

---

## 9. 未来扩展（不在 MVP 范围）

- 支持 Firefox/Edge（需适配）
- 云端同步设置（需用户登录）
- 更复杂的分类规则（机器学习）
- 统计图表和导出功能
- 批量导入/导出分类配置

---

## 10. 实施优先级

### Phase 1 (MVP)
- [ ] 项目脚手架（Vite + React + TS）
- [ ] Manifest V3 配置
- [ ] Background + Content 基础通信
- [ ] Popup 设置面板（保存/读取）
- [ ] 基础 DOM 操作（点击回关）
- [ ] 简单定时任务

### Phase 2
- [ ] 标签提取引擎
- [ ] 标签筛选 UI
- [ ] 中英双语
- [ ] 错误处理和重试

### Phase 3
- [ ] Options 完整设置页
- [ ] 状态可视化
- [ ] 性能优化和稳定性

---

**文档状态**: 已完成设计，等待用户确认后进入实现计划阶段。
