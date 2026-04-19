# 用户隐藏数据源功能 - 设计文档

## 概述

允许登录用户隐藏不想看到的数据源。被隐藏的数据源在所有列中都不出现。隐藏偏好按用户维度存储到后端，清除浏览器缓存也不会丢失。**未登录用户不可使用此功能**。

## 架构设计

### 数据存储（后端同步）

将 `hiddenSources` 合并到现有的 `PrimitiveMetadata` 数据结构中，复用已有的 `/api/me/sync` 同步机制：

**修改 `PrimitiveMetadata` 类型**（`shared/types.ts`）：
```ts
export interface PrimitiveMetadata {
  updatedTime: number
  data: Record<FixedColumnID, SourceID[]> & { hidden: SourceID[] }
  action: "init" | "manual" | "sync"
}
```

- `data.hidden` — 被隐藏的数据源 ID 列表
- 当用户修改隐藏列表时，`action` 设为 `"manual"`，触发自动上传到后端
- 登录时从后端下载，未登录时该功能不可用

**这样做的优势**：
- 复用已有的同步机制（`useSync` hook + `/api/me/sync` API）
- 无需新建后端 API
- 用户登录后数据自动保存到数据库 `user.data` 字段

### 登录限制

- **未登录时**：隐藏按钮不显示，"隐藏"tab 不显示
- **登录后**：隐藏按钮和"隐藏"tab 全部可见
- 通过已有的 `useLogin` hook 判断登录状态

### 核心逻辑

1. **新增 `hiddenSourcesAtom`** — 从 `primitiveMetadataAtom` 派生，读取/写入 `data.hidden`
2. **过滤层** — 渲染各列数据源时，过滤掉 `hiddenSources` 中的 ID
3. **preprocessMetadata** — 初始化时从各列排除已隐藏的数据源，兼容旧数据（无 hidden 字段时默认为空数组）

### UI 设计

#### 1. 隐藏按钮（卡片右上角）

登录后才显示，在卡片 header 区域添加 `[−]` 字符按钮：

```
┌─────────────────────────────┐
│ 🏠 知乎          ↻  ☆  [−]  │
│ 实时热搜                    │
├─────────────────────────────┤
│ 1. 新闻标题...              │
└─────────────────────────────┘
```

#### 2. "隐藏"tab

登录后导航栏新增"隐藏"tab，与"关注"/"最热"/"实时"并列。

#### 3. 隐藏 tab 内容

ASCII 字符卡片风格（monospace + Unicode 框线）：

```
┌──────────────────────┐  ┌──────────────────────┐
│  知乎  [+]           │  │  微博  [+]           │
│  ──────────────────  │  │  ──────────────────  │
│  实时热搜 · 国内     │  │  实时热搜 · 国内     │
└──────────────────────┘  └──────────────────────┘

            [全部恢复]
```

## 数据流

```
（仅登录用户）
点击 [−] → hiddenSourcesAtom 更新 → primitiveMetadataAtom 更新
  → action = "manual" → useSync debounce 10s → POST /api/me/sync → 后端保存

登录时 → GET /api/me/sync → 下载 data.hidden → 恢复隐藏列表

未登录用户 → 不显示隐藏按钮，不显示隐藏 tab
```

## 文件变更清单

### 类型定义
- `shared/types.ts` — `PrimitiveMetadata.data` 增加 `hidden: SourceID[]`

### 新建文件
- `src/components/column/hidden-card.tsx` — ASCII 字符风格隐藏卡片

### 修改文件
- `src/atoms/primitiveMetadataAtom.ts` — preprocessMetadata 中排除 hidden 数据源，初始化时兼容旧数据
- `src/atoms/index.ts` — 导出 hiddenSourcesAtom
- `src/components/column/card.tsx` — header 添加 `[−]` 隐藏按钮（仅登录可见）
- `src/components/navbar.tsx` — 新增"隐藏"tab（仅登录可见）
- `src/routes/c.$column.tsx` — 路由支持 hidden column
- `src/routes/index.tsx` — 默认路由处理
