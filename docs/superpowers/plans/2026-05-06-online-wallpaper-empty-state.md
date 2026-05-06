# 在线壁纸页面空状态UI实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为在线壁纸页面的壁纸列表添加搜索无结果时的空状态UI

**Architecture:** 在 WallpaperList.vue 组件内添加空状态判断和UI，当无数据且非加载/错误状态时显示友好的空状态提示

**Tech Stack:** Vue 3 Composition API, TypeScript, CSS

---

## 文件结构

**修改文件：**
- `src/components/WallpaperList.vue` — 添加空状态UI、计算属性和样式

**无需修改：**
- `src/views/OnlineWallpaper.vue` — 父组件无需改动
- 其他组件和文件

---

## Task 1: 添加空状态计算属性

**Files:**
- Modify: `src/components/WallpaperList.vue:168-305` (script section)

- [ ] **Step 1: 在 script 中导入 computed 并添加 isEmpty 计算属性**

在 WallpaperList.vue 的 `<script setup lang="ts">` 部分：

1. 修改第173行的导入语句，添加 `computed`:
```typescript
import { computed, onMounted, onUnmounted } from 'vue'
```

2. 在第200行（`isSelected` 函数之前）添加空状态计算属性：
```typescript
/**
 * 判断是否显示空状态UI
 * 条件：无数据 && 非加载中 && 无错误
 */
const isEmpty = computed(() => {
  return props.pageData.data.length === 0 && !props.loading && !props.error
})
```

- [ ] **Step 2: 运行 TypeScript 类型检查**

Run: `npm run type-check`
Expected: 无类型错误

---

## Task 2: 添加空状态UI模板

**Files:**
- Modify: `src/components/WallpaperList.vue:1-166` (template section)

- [ ] **Step 1: 在模板中添加空状态UI，并修改壁纸列表的条件渲染**

将第6-150行的 `<div id="thumbs" class="thumbs-container">` 部分修改为条件渲染：

```vue
    <!-- 空状态UI -->
    <div
      v-if="isEmpty"
      class="empty-result"
    >
      <i class="fas fa-search" />
      <p>没有找到匹配的壁纸</p>
      <p class="hint">尝试调整搜索条件或关键词</p>
    </div>

    <!-- 壁纸列表 -->
    <div
      v-else
      id="thumbs"
      class="thumbs-container"
    >
      <section
        v-for="(sectionItem, i) in pageData.sections"
        :key="i"
        class="thumb-listing-page"
      >
        <!-- 保持原有的 section 内容不变 -->
        <header class="thumb-listing-page-header">
          <!-- ... 省略，保持原有内容 ... -->
        </header>
        <ul>
          <!-- ... 省略，保持原有内容 ... -->
        </ul>
      </section>
    </div>
```

**重要说明：**
- 在 `<div id="thumbs">` 之前添加空状态UI的 `<div class="empty-result">`
- 给原有的 `<div id="thumbs">` 添加 `v-else` 指令
- 空状态UI和壁纸列表互斥显示

- [ ] **Step 2: 验证模板语法正确**

Run: `npm run type-check`
Expected: 无模板语法错误

---

## Task 3: 添加空状态样式

**Files:**
- Modify: `src/components/WallpaperList.vue:307-525` (style section)

- [ ] **Step 1: 在 `<style scoped>` 中添加空状态样式**

在第525行（`</style>` 之前）添加以下样式：

```css
/* 空状态样式 */
.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4em;
  color: #888;
  text-align: center;
  min-height: 400px;
}

.empty-result i {
  font-size: 3em;
  margin-bottom: 1em;
  opacity: 0.3;
}

.empty-result p {
  margin: 0.25em 0;
}

.empty-result .hint {
  font-size: 0.85em;
  opacity: 0.7;
}
```

- [ ] **Step 2: 验证样式语法正确**

Run: `npm run build`
Expected: 构建成功，无CSS语法错误

---

## Task 4: 手动测试验证

**Files:**
- Test: 在浏览器中测试空状态显示

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 开发服务器启动成功

- [ ] **Step 2: 测试空状态显示**

在浏览器中：
1. 打开在线壁纸页面
2. 在搜索框输入一个不可能匹配的关键词（如 "zzzzzzzzzzzzz"）
3. 执行搜索
4. 验证：当搜索结果为空时，显示空状态UI（图标 + "没有找到匹配的壁纸" + 提示文案）

Expected: 空状态UI正确显示，样式与设计一致

- [ ] **Step 3: 测试边界情况**

验证以下场景：
1. **初次加载**：页面刚打开时，loading状态正常，不显示空状态
2. **搜索有结果**：搜索返回数据时，正常显示壁纸列表
3. **搜索无结果**：搜索无数据时，显示空状态UI
4. **网络错误**：断网或API错误时，显示错误UI而非空状态

Expected: 所有边界情况处理正确

---

## Task 5: 提交代码

**Files:**
- Commit: `src/components/WallpaperList.vue`

- [ ] **Step 1: 提交修改**

```bash
git add src/components/WallpaperList.vue
git commit -m "feat: 为在线壁纸列表添加空状态UI

- 添加 isEmpty 计算属性判断空状态条件
- 添加空状态UI模板（图标 + 提示文案）
- 添加空状态样式，延续 FavoritesPage 设计风格
- 空状态在无数据且非加载/错误状态时显示"
```

Expected: 提交成功

---

## 验收标准检查

- [ ] 空状态UI在搜索无结果时正确显示
- [ ] 样式与 FavoritesPage 保持一致
- [ ] 不影响现有的 loading 和 error 状态显示
- [ ] 代码遵循项目现有风格和规范
- [ ] 无 TypeScript 类型错误
- [ ] 所有边界情况处理正确

---

## 影响范围

**修改文件：**
- `src/components/WallpaperList.vue`

**不影响：**
- OnlineWallpaper.vue
- 其他页面和组件
- 现有的 loading/error 处理逻辑
