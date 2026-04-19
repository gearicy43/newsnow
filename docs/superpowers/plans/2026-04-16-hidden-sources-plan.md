# 用户隐藏数据源功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 允许登录用户隐藏不想看到的数据源，隐藏偏好在后端按用户维度存储。

**Architecture:** 将 hiddenSources 合并到 PrimitiveMetadata.data.hidden 字段，复用已有的 /api/me/sync 同步机制实现后端存储。未登录用户不显示隐藏功能 UI。

**Tech Stack:** React 19, jotai (state), TypeScript, UnoCSS, framer-motion, TanStack Router

---

### Task 1: 类型定义 — 扩展 PrimitiveMetadata 增加 hidden 字段

**Files:**
- Modify: `shared/types.ts:30-34` (PrimitiveMetadata interface)
- Modify: `shared/verify.ts:3-8` (verifyPrimitiveMetadata)

- [ ] **Step 1: 修改 PrimitiveMetadata 类型**

在 `shared/types.ts` 中，将 `PrimitiveMetadata` 的 `data` 字段增加 `hidden`:

```ts
export interface PrimitiveMetadata {
  updatedTime: number
  data: Record<FixedColumnID, SourceID[]> & { hidden: SourceID[] }
  action: "init" | "manual" | "sync"
}
```

- [ ] **Step 2: 修改 verifyPrimitiveMetadata**

在 `shared/verify.ts` 中，更新 zod schema 以支持 hidden 字段（hidden 是可选的，兼容旧数据）：

```ts
export function verifyPrimitiveMetadata(target: any) {
  return z.object({
    data: z.object({}).passthrough().and(z.record(z.string(), z.array(z.string()))),
    updatedTime: z.number(),
  }).parse(target)
}
```

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: 通过或仅有少量预期错误（后续任务会修复）

- [ ] **Step 4: 提交**

```bash
git add shared/types.ts shared/verify.ts
git commit -m "feat: add hidden field to PrimitiveMetadata type"
```

---

### Task 2: 原子状态 — 新增 hiddenSourcesAtom 并集成到 primitiveMetadataAtom

**Files:**
- Modify: `src/atoms/index.ts` (导出 hiddenSourcesAtom)
- Modify: `src/atoms/primitiveMetadataAtom.ts` (preprocessMetadata 排除 hidden)

- [ ] **Step 1: 在 src/atoms/index.ts 中新增 hiddenSourcesAtom**

读取 `src/atoms/index.ts`，在文件中新增 hiddenSourcesAtom，从 primitiveMetadataAtom 派生：

```ts
export const hiddenSourcesAtom = atom((get) => {
  return get(primitiveMetadataAtom).data.hidden ?? []
}, (get, set, update: Update<SourceID[]>) => {
  const _ = update instanceof Function ? update(get(hiddenSourcesAtom)) : update
  set(primitiveMetadataAtom, {
    updatedTime: Date.now(),
    action: "manual",
    data: {
      ...get(primitiveMetadataAtom).data,
      hidden: _,
    },
  })
})
```

- [ ] **Step 2: 修改 preprocessMetadata 函数**

在 `src/atoms/primitiveMetadataAtom.ts` 的 `preprocessMetadata` 函数中，从各列中排除已隐藏的数据源。在现有的 `initialMetadata` 计算之后，过滤掉 hidden 中的数据源：

在 `preprocessMetadata` 函数的 return 前，添加对 `data` 中每个列的过滤：

```ts
// 在 preprocessMetadata 函数内部，return 之前：
const hidden = target.data.hidden ?? []
const filteredData = Object.fromEntries(
  typeSafeObjectEntries(result.data).map(([id, sources]) => [
    id,
    sources.filter(s => !hidden.includes(s)),
  ])
) as typeof result.data
result.data = filteredData
```

注意：`preprocessMetadata` 的返回值中需要保留 hidden 字段：

```ts
return {
  data: {
    ...initialMetadata,
    ...typeSafeObjectFromEntries(
      typeSafeObjectEntries(target.data)
        .filter(([id]) => id === "hidden" || initialMetadata[id])
        .map(([id, s]) => {
          if (id === "hidden") return [id, s.filter(k => sources[k])]
          if (id === "focus") return [id, s.filter(k => sources[k]).map(k => sources[k].redirect ?? k)]
          const oldS = s.filter(k => initialMetadata[id].includes(k)).map(k => sources[k].redirect ?? k)
          const newS = initialMetadata[id].filter(k => !oldS.includes(k))
          return [id, [...oldS, ...newS]]
        }),
    ),
  },
  action: target.action,
  updatedTime: target.updatedTime,
} as PrimitiveMetadata
```

- [ ] **Step 3: 确认 initialMetadata 包含 hidden 字段**

在 `src/atoms/primitiveMetadataAtom.ts` 中，确保 `initialMetadata` 不包含 hidden（hidden 不是普通列），但 `preprocessMetadata` 返回值中保留 hidden 字段。

修改 initialMetadata 的创建，确保它不包含 hidden：

```ts
const initialMetadata = typeSafeObjectFromEntries(typeSafeObjectEntries(metadata)
  .filter(([id]) => fixedColumnIds.includes(id as any))
  .map(([id, val]) => [id, val.sources] as [FixedColumnID, SourceID[]])) as Record<FixedColumnID, SourceID[]> & { hidden: SourceID[] }
// 初始化 hidden 为空数组
;(initialMetadata as any).hidden = []
```

- [ ] **Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无新增错误

- [ ] **Step 5: 提交**

```bash
git add src/atoms/index.ts src/atoms/primitiveMetadataAtom.ts
git commit -m "feat: add hiddenSourcesAtom and integrate with primitiveMetadataAtom"
```

---

### Task 3: 卡片组件 — 添加隐藏按钮 [−]

**Files:**
- Modify: `src/components/column/card.tsx:135-153` (NewsCard header 区域)

- [ ] **Step 1: 在 NewsCard 组件 header 中添加隐藏按钮**

在 `src/components/column/card.tsx` 的 `NewsCard` 函数中，找到 header 区域（约 line 135-153），在刷新和收藏按钮后添加隐藏按钮。按钮仅在登录时显示：

```tsx
// 在 imports 中添加
import { useLogin } from "~/hooks/useLogin"
import { hiddenSourcesAtom } from "~/atoms"

// 在 NewsCard 函数体开头添加
const { loggedIn } = useLogin()
const [hiddenSources, setHiddenSources] = useAtom(hiddenSourcesAtom)
const isHidden = hiddenSources.includes(id)

// 在 header 的 div (className="flex gap-2 text-lg ...") 中，
// 在 {setHandleRef && (...)} 之前添加隐藏按钮：
{loggedIn && !isHidden && (
  <button
    type="button"
    className={$("btn i-ph:eye-slash-duotone hover:scale-110 transition-transform")}
    title="隐藏此数据源"
    onClick={() => {
      setHiddenSources(prev => [...prev, id])
    }}
  />
)}
```

- [ ] **Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无新增错误

- [ ] **Step 3: 提交**

```bash
git add src/components/column/card.tsx
git commit -m "feat: add hide button to source card header"
```

---

### Task 4: 导航栏 — 新增"隐藏"tab

**Files:**
- Modify: `src/components/navbar.tsx` (新增 hidden tab)
- Modify: `shared/metadata.ts` (在 fixedColumnIds 后导出包含 hidden 的导航列表)

- [ ] **Step 1: 在 navbar 中新增"隐藏"tab**

在 `src/components/navbar.tsx` 中，导入登录状态和 hidden tab 逻辑。在 `fixedColumnIds` 映射后添加"隐藏"tab，仅登录时显示：

```tsx
// 添加 imports
import { useLogin } from "~/hooks/useLogin"
import { hiddenSourcesAtom } from "~/atoms"
import { sources } from "@shared/sources"

// 在 NavBar 函数中添加
const { loggedIn } = useLogin()
const hiddenSources = useAtomValue(hiddenSourcesAtom)

// 在 fixedColumnIds.map 之后，添加 hidden tab：
{loggedIn && hiddenSources.length > 0 && (
  <Link
    to="/c/$column"
    params={{ column: "hidden" }}
    className={$(
      "px-3 py-1.5 hover:(bg-primary/15 rounded-full) cursor-pointer transition-all duration-300",
      currentId === "hidden"
        ? "color-primary font-semibold bg-primary/10 rounded-full shadow-sm"
        : "op-60 dark:op-75 hover:op-80",
    )}
  >
    隐藏 ({hiddenSources.length})
  </Link>
)}
```

- [ ] **Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: 可能有 "hidden" 不是 valid column 的错误（下一步修复）

- [ ] **Step 3: 提交**

```bash
git add src/components/navbar.tsx
git commit -m "feat: add hidden tab to navbar"
```

---

### Task 5: 路由 — 支持 hidden column 路由

**Files:**
- Modify: `src/routes/c.$column.tsx` (支持 hidden column)
- Modify: `src/components/column/index.tsx` (处理 hidden 列渲染)
- Modify: `src/routes/index.tsx` (hidden 不计入默认跳转)

- [ ] **Step 1: 修改路由参数解析，支持 hidden**

在 `src/routes/c.$column.tsx` 中，修改 `parse` 函数，将 "hidden" 视为有效 column：

```ts
// 修改 parse 函数
parse: (params) => {
  const column = params.column.toLowerCase()
  // hidden 是特殊列，允许通过
  if (column === "hidden") return { column }
  const found = fixedColumnIds.find(x => x === column)
  if (!found) throw new Error(`"${params.column}" is not a valid column.`)
  return { column: found }
},
```

- [ ] **Step 2: 修改 Column 组件，支持 hidden 列渲染**

在 `src/components/column/index.tsx` 中，修改 Column 组件，当 id 为 "hidden" 时渲染 HiddenColumn 组件：

```tsx
// 添加 import
import { HiddenColumn } from "./hidden-column"

// 修改 Column 组件
export function Column({ id }: { id: FixedColumnID | "hidden" }) {
  const [currentColumnID, setCurrentColumnID] = useAtom(currentColumnIDAtom)
  useEffect(() => {
    setCurrentColumnID(id as FixedColumnID)
  }, [id, setCurrentColumnID])

  useTitle(`NewsNow | ${id === "hidden" ? "隐藏" : metadata[id as FixedColumnID]?.name}`)

  if (id === "hidden") return <HiddenColumn />

  return (
    <>
      <div className="flex justify-center md:hidden mb-6">
        <NavBar />
      </div>
      {id === currentColumnID && <Dnd />}
    </>
  )
}
```

- [ ] **Step 3: 修改 IndexComponent，确保 hidden 不作为默认跳转**

`src/routes/index.tsx` 无需修改，因为 hidden 不在 fixedColumnIds 中，不会成为默认跳转目标。

- [ ] **Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: 可能需要处理类型问题（FixedColumnID | "hidden"）

- [ ] **Step 5: 提交**

```bash
git add src/routes/c.$column.tsx src/components/column/index.tsx src/routes/index.tsx
git commit -m "feat: support hidden column in routing"
```

---

### Task 6: 隐藏列组件 — ASCII 字符风格的隐藏卡片

**Files:**
- Create: `src/components/column/hidden-card.tsx`
- Modify: `src/components/column/index.tsx` (导入 HiddenColumn)

- [ ] **Step 1: 创建 HiddenColumn 组件**

创建 `src/components/column/hidden-card.tsx`：

```tsx
import type { SourceID } from "@shared/types"
import { hiddenSourcesAtom } from "~/atoms"
import { sources } from "@shared/sources"

function HiddenCard({ id }: { id: SourceID }) {
  const [, setHiddenSources] = useAtom(hiddenSourcesAtom)
  const source = sources[id]
  const column = source.column || (source.type === "hottest" ? "最热" : source.type === "realtime" ? "实时" : "其他")

  const restore = () => {
    setHiddenSources(prev => prev.filter(s => s !== id))
  }

  return (
    <div className="font-mono text-sm">
      <div className={$(
        "border border-slate-400/30 dark:border-slate-600/30 rounded-lg",
        "bg-slate-800/20 dark:bg-slate-900/20 backdrop-blur-sm",
        "p-3 min-w-[280px] max-w-[320px]",
      )}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-slate-700 dark:text-slate-200">{source.name}</span>
          <button
            type="button"
            onClick={restore}
            className={$(
              "text-xs px-2 py-0.5 rounded",
              "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
            )}
          >
            [+]
          </button>
        </div>
        <div className="border-t border-slate-400/20 dark:border-slate-600/20 my-1.5" />
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {source.title || source.type || ""} · {typeof column === "string" ? column : ""}
        </div>
      </div>
    </div>
  )
}

export function HiddenColumn() {
  const hiddenSources = useAtomValue(hiddenSourcesAtom)

  if (hiddenSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-lg">没有隐藏的数据源</p>
        <p className="text-sm mt-2">点击卡片右上角隐藏按钮即可隐藏</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl px-4">
        {hiddenSources.map(id => (
          <HiddenCard key={id} id={id} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setHiddenSources([])}
        className={$(
          "px-4 py-2 rounded-lg",
          "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
          "font-mono text-sm",
        )}
      >
        [全部恢复]
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 在 column/index.tsx 中导入 HiddenColumn**

确保 `src/components/column/index.tsx` 的 import 正确：

```tsx
import { HiddenColumn } from "./hidden-card"
```

- [ ] **Step 3: 添加 missing import**

确保 `hidden-card.tsx` 中有所有必要的 imports：

```tsx
import { useAtom, useAtomValue } from "jotai"
import { useCallback } from "react"
```

- [ ] **Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无新增错误

- [ ] **Step 5: 提交**

```bash
git add src/components/column/hidden-card.tsx src/components/column/index.tsx
git commit -m "feat: add ASCII-style hidden column component"
```

---

### Task 7: 路由类型修复 — 确保 "hidden" 在路由中正确工作

**Files:**
- Modify: `src/routes/c.$column.tsx` (类型修复)
- Modify: `src/components/column/index.tsx` (类型修复)

- [ ] **Step 1: 修复 Column 类型定义**

在 `src/components/column/index.tsx` 中，将 id 类型改为支持 "hidden"：

```tsx
import type { FixedColumnID } from "@shared/types"

type ColumnID = FixedColumnID | "hidden"

export function Column({ id }: { id: ColumnID }) {
  const [currentColumnID, setCurrentColumnID] = useAtom(currentColumnIDAtom)
  useEffect(() => {
    if (id !== "hidden") setCurrentColumnID(id)
  }, [id, setCurrentColumnID])

  useTitle(`NewsNow | ${id === "hidden" ? "隐藏" : metadata[id].name}`)

  if (id === "hidden") return <HiddenColumn />

  return (
    <>
      <div className="flex justify-center md:hidden mb-6">
        <NavBar />
      </div>
      {id === currentColumnID && <Dnd />}
    </>
  )
}
```

- [ ] **Step 2: 修复路由 c.$column.tsx 中的类型**

在 `src/routes/c.$column.tsx` 中，确保 column 类型正确传递给 Column：

```tsx
function SectionComponent() {
  const { column } = Route.useParams()
  return <Column id={column as any} />
}
```

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 4: 运行 lint**

Run: `pnpm lint`
Expected: 无 lint 错误

- [ ] **Step 5: 提交**

```bash
git add src/routes/c.$column.tsx src/components/column/index.tsx
git commit -m "fix: resolve type issues with hidden column"
```

---

### Task 8: 边界情况处理 — 未登录隐藏按钮不显示 + 测试

**Files:**
- Modify: `src/components/column/card.tsx` (确认登录检查)
- Modify: `src/components/navbar.tsx` (确认登录检查)

- [ ] **Step 1: 确认未登录时隐藏按钮不显示**

在 `src/components/column/card.tsx` 中，确认隐藏按钮使用 `loggedIn` 条件：

```tsx
{loggedIn && !isHidden && (
  <button
    type="button"
    className={$("btn i-ph:eye-slash-duotone hover:scale-110 transition-transform")}
    title="隐藏此数据源"
    onClick={() => {
      setHiddenSources(prev => [...prev, id])
    }}
  />
)}
```

- [ ] **Step 2: 确认未登录时隐藏 tab 不显示**

在 `src/components/navbar.tsx` 中，确认 hidden tab 使用 `loggedIn` 条件。

- [ ] **Step 3: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 服务器启动成功

- [ ] **Step 4: 提交**

```bash
git add src/components/column/card.tsx src/components/navbar.tsx
git commit -m "feat: ensure hide feature only visible when logged in"
```

---

## Self-Review

### 1. Spec Coverage Check

- ✅ PrimitiveMetadata 增加 hidden 字段 — Task 1
- ✅ hiddenSourcesAtom 状态管理 — Task 2
- ✅ preprocessMetadata 排除 hidden 数据源 — Task 2
- ✅ 卡片隐藏按钮 [−] — Task 3
- ✅ 导航栏"隐藏"tab — Task 4
- ✅ 路由支持 hidden column — Task 5
- ✅ ASCII 风格隐藏卡片组件 — Task 6
- ✅ 类型修复 — Task 7
- ✅ 仅登录可见 — Task 8
- ✅ 后端存储（复用 /api/me/sync）— 通过 primitiveMetadataAtom + useSync 自动实现
- ⚠️ "全部恢复"按钮 — Task 6 中已实现
- ⚠️ 验证函数兼容 hidden 字段 — Task 1 Step 2

### 2. Placeholder Scan
无占位符、TBD、TODO。所有步骤都有具体代码。

### 3. Type Consistency
- `hiddenSourcesAtom` 在 Task 2 定义，Task 3/4/6 中使用一致
- `PrimitiveMetadata.data.hidden` 类型 `SourceID[]` 一致
- `useLogin` hook 的 `loggedIn` 属性一致
- Column id 类型通过 `ColumnID = FixedColumnID | "hidden"` 统一处理
