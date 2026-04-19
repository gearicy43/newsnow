# Intersection Observer 与动画库

## 目录

- [背景问题](#背景问题)
- [Framer Motion 动画库](#framer-motion-动画库)
- [Intersection Observer API](#intersection-observer-api)
- [为什么动画库要封装 Intersection Observer](#为什么动画库要封装-intersection-observer)
- [典型应用场景](#典型应用场景)
- [其他动画库替代方案](#其他动画库替代方案)
- [总结](#总结)

---

## 背景问题

### 问题描述

在移动端访问新闻卡片应用时，当滚动到某个卡片后切换到其他应用，再切回来时发现**又从第一张卡片开始了**。

### 根本原因

```tsx
// src/components/column/card.tsx:26-28
const inView = useInView(ref, {
  once: true,  // 只检测一次进入视口
})

return (
  <div ref={ref}>
    {inView && <NewsCard id={id} />}  {/* 只有可见时才渲染内容 */}
  </div>
)
```

**问题分析：**

1. `useInView` 基于 `Intersection Observer API`，检测元素是否进入视口
2. `once: true` 表示元素第一次进入视口后，状态永久锁定为 `true`
3. 当用户切换应用再返回时，**浏览器重置了横向滚动容器的滚动位置**
4. 虽然视觉上应该看到第 3 张卡片，但滚动位置回到了第 1 张
5. 由于 `once: true`，之前渲染过的卡片不会重新检测，导致显示错乱

### 解决方案

使用 `sessionStorage` 保存和恢复滚动位置：

```tsx
// 滚动时保存位置
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const scrollLeft = e.currentTarget.scrollLeft
  sessionStorage.setItem('column-focus-scroll', scrollLeft.toString())
}

// 页面恢复时读取位置
useEffect(() => {
  const saved = sessionStorage.getItem('column-focus-scroll')
  if (saved && containerRef.current) {
    containerRef.current.scrollLeft = Number(saved)
  }
}, [])
```

---

## Framer Motion 动画库

### 什么是 Framer Motion？

**Framer Motion** 是一个流行的 **React 动画库**，用于给 React 组件添加流畅的动画效果。

### 主要特性

- ✅ 声明式 API，简单易用
- ✅ 支持手势动画（拖拽、滑动等）
- ✅ 内置物理弹簧动画
- ✅ 支持布局动画
- ✅ 提供视口检测 Hook（`useInView`）
- ✅ 支持 SVG 动画
- ✅ 自动处理动画生命周期

### 基本用法示例

```tsx
import { motion } from 'framer-motion'

function Card() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}   // 初始状态
      animate={{ opacity: 1, y: 0 }}    // 目标状态
      transition={{ duration: 0.5 }}    // 过渡配置
    >
      卡片内容
    </motion.div>
  )
}
```

### 在项目中的应用

```tsx
// src/components/column/dnd.tsx:36-86
<motion.ol
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { delayChildren: 0.1, staggerChildren: 0.1 }
    }
  }}
>
  {items.map((id) => (
    <motion.li
      key={id}
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
    >
      <SortableCardWrapper id={id} />
    </motion.li>
  ))}
</motion.ol>
```

**效果**：卡片依次从下方淡入，带有交错延迟，视觉效果流畅。

---

## Intersection Observer API

### 什么是 Intersection Observer？

**Intersection Observer API** 是浏览器原生提供的 JavaScript API，用于**异步检测目标元素与祖先元素或顶级文档视口的交叉状态**。

简单说：它能告诉你**某个元素是否在屏幕上可见**。

### 核心概念

- **视口（Viewport）**：当前屏幕可见区域
- **交叉（Intersection）**：目标元素与视口的重叠区域
- **观察者（Observer）**：监听交叉变化的对象

### 原生 API 用法

```javascript
// 1. 创建观察者实例
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    console.log('可见比例:', entry.intersectionRatio)
    
    if (entry.isIntersecting) {
      console.log('元素进入视口！')
    } else {
      console.log('元素离开视口！')
    }
  })
}, {
  threshold: 0.5,        // 50% 可见时触发
  rootMargin: '0px'      // 根元素边距
})

// 2. 开始观察目标元素
const target = document.querySelector('#my-element')
observer.observe(target)

// 3. 停止观察（需要时）
observer.unobserve(target)

// 4. 完全断开观察
observer.disconnect()
```

### 配置选项

```javascript
const options = {
  root: null,           // null 表示视口，也可指定某个容器元素
  rootMargin: '0px',    // 根元素的外边距（类似 CSS margin）
  threshold: [0, 0.5, 1] // 触发回调的交叉比例数组
}
```

### 浏览器兼容性

✅ Chrome 51+  
✅ Firefox 55+  
✅ Safari 12.1+  
✅ Edge 79+  
✅ 所有现代手机浏览器（iOS Safari、Chrome Mobile 等）

---

## 为什么动画库要封装 Intersection Observer？

### 核心原因：懒加载动画

#### 场景：长页面有很多卡片

```
┌─────────────────────┐
│  卡片 1  ✓ 立即动画  │ ← 在视口内
├─────────────────────┤
│  卡片 2  ✓ 立即动画  │ ← 在视口内
├─────────────────────┤
│  卡片 3  → 等待动画  │ ← 刚进入视口，此时触发
├─────────────────────┤
│  卡片 4  ✗ 不动画    │ ← 还没看到，不浪费资源
├─────────────────────┤
│  卡片 5  ✗ 不动画    │ ← 还没看到
└─────────────────────┘
```

#### ❌ 没有 Intersection Observer 的问题

```tsx
// 所有卡片一加载就同时执行动画
items.map(item => <Card key={item.id} />)
```

**问题：**
1. **性能浪费**：渲染了用户看不到的动画
2. **体验差**：用户滚动到下面时，动画已经播完了
3. **资源消耗**：GPU/CPU 做了无用功

#### ✅ 有了 Intersection Observer

```tsx
function Card({ id }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  
  return (
    <div ref={ref}>
      {inView && <Content />}  {/* 只有进入视口才渲染/动画 */}
    </div>
  )
}
```

**好处：**
1. **按需动画**：滚动到哪个，哪个才动
2. **节省资源**：不渲染看不到的内容
3. **体验更好**：每次滚动都能看到新鲜的动画

### 代码对比

#### 使用原生 Intersection Observer（繁琐）

```tsx
function Card({ id }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(entry.target)  // once: true
        }
      },
      { threshold: 0.1 }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()  // cleanup
  }, [])
  
  return (
    <div ref={ref}>
      {inView && <Content />}
    </div>
  )
}
```

#### 使用 Framer Motion 的 useInView（简洁）

```tsx
function Card({ id }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  
  return (
    <div ref={ref}>
      {inView && <Content />}
    </div>
  )
}
```

**代码量减少 70%，更直观！**

---

## 典型应用场景

### 场景 1：滚动触发动画

```tsx
function Card({ id }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      卡片内容
    </motion.div>
  )
}
```

**效果**：卡片滚动到视野时才从下方淡入

---

### 场景 2：数字增长动画

```tsx
function Counter() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    if (inView) {
      let current = 0
      const timer = setInterval(() => {
        current += 10
        setCount(current)
        if (current >= 1000) clearInterval(timer)
      }, 16)
    }
  }, [inView])
  
  return <div ref={ref}>访问量：{count}</div>
}
```

**效果**：滚动到计数器等元素时，数字开始从 0 增长

---

### 场景 3：图片懒加载 + 淡入

```tsx
function LazyImage({ src }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [loaded, setLoaded] = useState(false)
  
  return (
    <motion.img
      ref={ref}
      src={inView ? src : undefined}
      onLoad={() => setLoaded(true)}
      initial={{ opacity: 0 }}
      animate={loaded ? { opacity: 1 } : {}}
    />
  )
}
```

**效果**：图片滚动到视野才开始加载，加载完成后淡入

---

### 场景 4：视差滚动效果

```tsx
function ParallaxSection() {
  const ref = useRef(null)
  const inView = useInView(ref)
  
  return (
    <motion.div
      ref={ref}
      animate={{
        y: inView ? 0 : 100,
        opacity: inView ? 1 : 0,
      }}
      transition={{ duration: 0.5 }}
    >
      视差内容
    </motion.div>
  )
}
```

**效果**：元素随滚动产生位移差，营造立体感

---

### 场景 5：列表项交错动画

```tsx
function List({ items }) {
  return (
    <motion.ul>
      {items.map((item, i) => (
        <ListItem 
          key={item.id} 
          item={item}
          delay={i * 0.1}  // 每个元素延迟递增
        />
      ))}
    </motion.ul>
  )
}

function ListItem({ item, delay }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  
  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay, duration: 0.3 }}
    >
      {item.content}
    </motion.li>
  )
}
```

**效果**：列表项依次滑入，形成波浪效果

---

## 其他动画库替代方案

### 主流 React 动画库对比

| 库名 | 特点 | 大小 | 适用场景 |
|-----|------|------|---------|
| **Framer Motion** | 声明式、简单、功能全面 | ~30KB | UI 动画、页面切换、手势动画 |
| **React Spring** | 基于物理弹簧，自然流畅 | ~15KB | 交互动画、拖拽效果 |
| **GSAP** | 功能最强大，时间轴控制 | ~40KB+ | 复杂动画、广告、创意网站 |
| **Anime.js** | 轻量级，API 简洁 | ~12KB | 简单动画效果 |
| **Motion One** | Framer 团队出品，最小 | ~6KB | 性能敏感场景 |
| **CSS Transition** | 原生 CSS，零依赖 | 0KB | 简单淡入淡出、位移 |

### 代码示例对比

#### Framer Motion

```tsx
import { motion } from 'framer-motion'

<motion.div 
  initial={{ opacity: 0 }} 
  animate={{ opacity: 1 }} 
/>
```

#### React Spring

```tsx
import { useSpring, animated } from '@react-spring/web'

const props = useSpring({ 
  opacity: 1, 
  from: { opacity: 0 } 
})

<animated.div style={props} />
```

#### GSAP

```tsx
import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'

function Component() {
  const ref = useRef(null)
  
  useEffect(() => {
    gsap.from(ref.current, { 
      opacity: 0, 
      duration: 1 
    })
  }, [])
  
  return <div ref={ref} />
}
```

#### 纯 CSS

```css
/* CSS 文件 */
.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

```tsx
<div className="fade-in" />
```

---

## 总结

### Intersection Observer 和动画的关系

```
┌─────────────────────────────────────┐
│  Intersection Observer              │
│  (检测时机：元素什么时候可见)       │
└──────────────┬──────────────────────┘
               │ 触发
               ↓
┌─────────────────────────────────────┐
│  Framer Motion / 其他动画库         │
│  (执行动画：怎么动、动多久)         │
└─────────────────────────────────────┘
```

### 类比理解

- **Intersection Observer** = 发令员（喊"预备，跑！"）
- **动画库** = 运动员（实际跑步的人）

### 为什么动画库要封装它？

| 原因 | 说明 |
|-----|------|
| **性能优化** | 只动画看得见的元素，节省 GPU/CPU 资源 |
| **体验提升** | 滚动时才有新鲜感，不会错过动画 |
| **开发便利** | 一个库搞定所有需求，无需额外安装 |
| **代码简洁** | 封装复杂的原生 API，减少样板代码 |

### 关键要点

1. **Intersection Observer** 是浏览器原生 API，用于检测元素是否可见
2. **Framer Motion** 是 React 动画库，提供声明式动画 API
3. **useInView** 是 Framer Motion 封装的 Hook，简化 Intersection Observer 的使用
4. **once: true** 表示只检测第一次进入视口，之后状态永久锁定
5. **移动端滚动位置丢失** 是浏览器行为，需要用 `sessionStorage` 等手段保存恢复

### 最佳实践

```tsx
// ✅ 推荐：结合 useInView 实现懒加载动画
function Card({ id }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {inView && <ExpensiveContent />}
    </motion.div>
  )
}

// ✅ 推荐：移动端保存滚动位置
function ScrollableContainer() {
  const ref = useRef<HTMLDivElement>(null)
  
  // 保存位置
  const handleScroll = () => {
    if (ref.current) {
      sessionStorage.setItem('scroll-pos', ref.current.scrollLeft.toString())
    }
  }
  
  // 恢复位置
  useEffect(() => {
    const saved = sessionStorage.getItem('scroll-pos')
    if (saved && ref.current) {
      ref.current.scrollLeft = Number(saved)
    }
  }, [])
  
  return (
    <div ref={ref} onScroll={handleScroll}>
      {/* 内容 */}
    </div>
  )
}
```

---

## 参考资源

- [MDN: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Framer Motion 官方文档](https://www.framer.com/motion/)
- [Can I use: Intersection Observer](https://caniuse.com/intersectionobserver)
- [Web.dev: Intersection Observer](https://web.dev/intersectionobserver-v2/)
