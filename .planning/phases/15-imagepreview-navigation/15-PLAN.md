---
wave: 1
depends_on: []
files_modified:
  - src/components/ImagePreview.vue
  - src/views/LocalWallpaper.vue
  - src/views/OnlineWallpaper.vue
autonomous: true
requirements:
  - NAV-01
---

# Phase 15: ImagePreview Navigation - Plan

**Goal:** 为 ImagePreview 组件添加上一张/下一张切换功能

## Overview

本阶段为 ImagePreview 组件添加导航功能，允许用户在预览模式下浏览壁纸列表。

**设计决策 (来自 CONTEXT.md):**
- D-01: 通过 props 传递壁纸列表和当前索引
- D-02: 通过 emit 事件通知父组件更新索引
- D-03: 左右两侧悬浮导航按钮
- D-04: 复用现有侧边栏按钮样式
- D-05: 支持左右箭头切换
- D-06: 到达边界时禁用对应按钮

---

## Wave 1: ImagePreview Component Enhancement

### Task 1.1: Add Navigation Props and Emits

<read_first>
- src/components/ImagePreview.vue
</read_first>

<action>
在 ImagePreview.vue 中添加新的 props 和 emits：

**新增 Props:**
```typescript
wallpaperList: {
  type: Array as PropType<WallpaperItem[]>,
  default: () => []
}
currentIndex: {
  type: Number,
  default: -1
}
```

**新增 Emits:**
```typescript
navigate: [direction: 'prev' | 'next']
```

**修改位置:**
- Props interface 添加 `wallpaperList` 和 `currentIndex`
- emit 定义添加 `navigate` 事件
</action>

<acceptance_criteria>
1. Props interface 包含 `wallpaperList: WallpaperItem[]` 和 `currentIndex: number`
2. emit 定义包含 `navigate: [direction: 'prev' | 'next']`
3. TypeScript 编译无错误
4. 现有 props (showing, imgInfo, isLocal) 保持不变
</acceptance_criteria>

---

### Task 1.2: Add Navigation Buttons UI

<read_first>
- src/components/ImagePreview.vue
</read_first>

<action>
在 ImagePreview.vue 的 template 中添加导航按钮：

**在 `.img-view` 的同级位置添加导航按钮容器:**
```vue
<!-- 左侧导航按钮 - 上一张 -->
<div
  v-if="canNavigatePrev"
  class="nav-btn nav-btn-prev"
  title="上一张"
  @click="navigatePrev"
>
  <i class="fas fa-chevron-left" />
</div>

<!-- 右侧导航按钮 - 下一张 -->
<div
  v-if="canNavigateNext"
  class="nav-btn nav-btn-next"
  title="下一张"
  @click="navigateNext"
>
  <i class="fas fa-chevron-right" />
</div>
```

**添加 computed 属性:**
```typescript
const canNavigatePrev = computed(() => {
  return props.currentIndex > 0 && props.wallpaperList.length > 1
})

const canNavigateNext = computed(() => {
  return props.currentIndex >= 0 && props.currentIndex < props.wallpaperList.length - 1
})
```

**添加方法:**
```typescript
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    emit('navigate', 'prev')
  }
}

const navigateNext = () => {
  if (canNavigateNext.value) {
    emit('navigate', 'next')
  }
}
```
</action>

<acceptance_criteria>
1. Template 中存在 `.nav-btn-prev` 和 `.nav-btn-next` 按钮
2. 按钮使用 Font Awesome 图标 `fa-chevron-left` 和 `fa-chevron-right`
3. `canNavigatePrev` 在 currentIndex > 0 时为 true
4. `canNavigateNext` 在 currentIndex < length - 1 时为 true
5. 点击按钮触发 `navigatePrev` 或 `navigateNext` 方法
</acceptance_criteria>

---

### Task 1.3: Add Navigation Button Styles

<read_first>
- src/components/ImagePreview.vue
</read_first>

<action>
在 ImagePreview.vue 的 `<style scoped>` 中添加导航按钮样式：

```css
/* 导航按钮容器 */
.nav-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background-color: rgba(34, 34, 34, 0.8);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  transition: background-color 0.3s, opacity 0.3s;
  font-size: 20px;
  color: #d7ce82;
}

.nav-btn:hover {
  background-color: rgba(34, 34, 34, 1);
}

.nav-btn-prev {
  left: 40px;
}

.nav-btn-next {
  right: 40px;
}

/* 悬浮时显示导航按钮 */
.mask:hover .nav-btn {
  opacity: 1;
}
```
</action>

<acceptance_criteria>
1. `.nav-btn` 基础样式存在
2. `.nav-btn-prev` 定位在左侧 (left: 40px)
3. `.nav-btn-next` 定位在右侧 (right: 40px)
4. 样式复用现有配色 (#d7ce82 图标颜色，#222 背景)
5. 悬浮时有背景色变化效果
</acceptance_criteria>

---

### Task 1.4: Add Keyboard Event Support

<read_first>
- src/components/ImagePreview.vue
</read_first>

<action>
在 ImagePreview.vue 中添加键盘事件支持：

**添加键盘事件处理函数:**
```typescript
const handleKeydown = (event: KeyboardEvent) => {
  // 只在预览显示时响应
  if (!props.showing) return

  if (event.key === 'ArrowLeft') {
    navigatePrev()
  } else if (event.key === 'ArrowRight') {
    navigateNext()
  }
}
```

**修改 onMounted:**
```typescript
onMounted(() => {
  clientHeight.value = document.documentElement.clientHeight
  window.addEventListener('resize', onresize)
  window.addEventListener('keydown', handleKeydown)
})
```

**修改 onUnmounted:**
```typescript
onUnmounted(() => {
  window.removeEventListener('resize', onresize)
  window.removeEventListener('keydown', handleKeydown)
})
```
</action>

<acceptance_criteria>
1. `handleKeydown` 函数存在
2. 左箭头键触发 `navigatePrev()`
3. 右箭头键触发 `navigateNext()`
4. 只在 `showing` 为 true 时响应键盘
5. onMounted 添加 keydown 监听器
6. onUnmounted 移除 keydown 监听器
</acceptance_criteria>

---

## Wave 2: LocalWallpaper Integration

### Task 2.1: Pass Wallpaper List to ImagePreview

<read_first>
- src/views/LocalWallpaper.vue
- src/components/ImagePreview.vue
</read_first>

<action>
修改 LocalWallpaper.vue 中的 ImagePreview 使用：

**添加计算属性:**
```typescript
// 将 localWallpapers 转换为 WallpaperItem[] 格式
const wallpaperList = computed<WallpaperItem[]>(() => {
  return localWallpapers.value.map((wp, index) => ({
    id: wp.name,
    url: getImageUrl(wp.path),
    short_url: getImageUrl(wp.path),
    views: 0,
    favorites: 0,
    source: '',
    purity: 'sfw',
    category: 'general',
    dimension_x: wp.width || 0,
    dimension_y: wp.height || 0,
    resolution: `${wp.width || 0}x${wp.height || 0}`,
    ratio: '',
    file_size: wp.size,
    file_type: getImageType(wp.name),
    created_at: wp.modifiedTime,
    colors: [],
    path: getImageUrl(wp.path),
    thumbs: {
      large: getImageUrl(wp.path),
      original: getImageUrl(wp.path),
      small: getImageUrl(wp.path),
    },
  }))
})

// 当前预览索引
const previewIndex = computed(() => {
  if (!previewItem.value) return -1
  return localWallpapers.value.findIndex(wp => wp.name === previewItem.value?.id)
})
```

**修改 ImagePreview 组件调用:**
```vue
<ImagePreview
  v-show="imgShow"
  :showing="imgShow"
  :img-info="previewItem"
  :is-local="true"
  :wallpaper-list="wallpaperList"
  :current-index="previewIndex"
  @close="closePreview"
  @set-bg="setAsWallpaper"
  @navigate="handleNavigate"
/>
```
</action>

<acceptance_criteria>
1. `wallpaperList` computed 属性存在并返回 WallpaperItem[]
2. `previewIndex` computed 属性返回当前预览索引
3. ImagePreview 组件接收到 `wallpaper-list` 和 `current-index` props
4. ImagePreview 监听 `navigate` 事件
</acceptance_criteria>

---

### Task 2.2: Handle Navigation Event in LocalWallpaper

<read_first>
- src/views/LocalWallpaper.vue
</read_first>

<action>
在 LocalWallpaper.vue 中添加导航处理函数：

```typescript
const handleNavigate = (direction: 'prev' | 'next') => {
  const newIndex = direction === 'prev'
    ? previewIndex.value - 1
    : previewIndex.value + 1

  if (newIndex >= 0 && newIndex < localWallpapers.value.length) {
    previewWallpaper(localWallpapers.value[newIndex])
  }
}
```

**确保 `previewWallpaper` 方法使用索引更新:**
现有方法已正确设置 `previewItem`，无需修改。
</action>

<acceptance_criteria>
1. `handleNavigate` 函数存在
2. direction 为 'prev' 时，索引减 1
3. direction 为 'next' 时，索引加 1
4. 边界检查：newIndex 在有效范围内
5. 调用 `previewWallpaper` 更新预览项
</acceptance_criteria>

---

## Wave 3: OnlineWallpaper Integration

### Task 3.1: Pass Wallpaper List to ImagePreview

<read_first>
- src/views/OnlineWallpaper.vue
- src/components/ImagePreview.vue
</read_first>

<action>
修改 OnlineWallpaper.vue 中的 ImagePreview 使用：

**添加计算属性:**
```typescript
// 从 wallpapers 中提取扁平化的壁纸列表
const wallpaperList = computed<WallpaperItem[]>(() => {
  const allWallpapers: WallpaperItem[] = []
  wallpapers.value.sections.forEach(section => {
    allWallpapers.push(...section.data)
  })
  return allWallpapers
})

// 当前预览索引
const previewIndex = computed(() => {
  if (!imgInfo.value) return -1
  return wallpaperList.value.findIndex(wp => wp.id === imgInfo.value?.id)
})
```

**修改 ImagePreview 组件调用:**
```vue
<ImagePreview
  v-show="imgShow"
  :showing="imgShow"
  :img-info="imgInfo"
  :wallpaper-list="wallpaperList"
  :current-index="previewIndex"
  @download-img="downloadImg"
  @set-bg="setBg"
  @close="closePreview"
  @navigate="handleNavigate"
/>
```
</action>

<acceptance_criteria>
1. `wallpaperList` computed 属性存在并返回扁平化的 WallpaperItem[]
2. `previewIndex` computed 属性返回当前预览索引
3. ImagePreview 组件接收到 `wallpaper-list` 和 `current-index` props
4. ImagePreview 监听 `navigate` 事件
</acceptance_criteria>

---

### Task 3.2: Handle Navigation Event in OnlineWallpaper

<read_first>
- src/views/OnlineWallpaper.vue
</read_first>

<action>
在 OnlineWallpaper.vue 中添加导航处理函数：

```typescript
const handleNavigate = (direction: 'prev' | 'next') => {
  const newIndex = direction === 'prev'
    ? previewIndex.value - 1
    : previewIndex.value + 1

  if (newIndex >= 0 && newIndex < wallpaperList.value.length) {
    preview(wallpaperList.value[newIndex])
  }
}
```
</action>

<acceptance_criteria>
1. `handleNavigate` 函数存在
2. direction 为 'prev' 时，索引减 1
3. direction 为 'next' 时，索引加 1
4. 边界检查：newIndex 在有效范围内
5. 调用 `preview` 更新预览项
</acceptance_criteria>

---

## Verification Criteria

### TypeScript Compilation
```bash
npm run typecheck
```
**Expected:** No errors

### Visual Verification
1. 打开在线壁纸页面，点击任意壁纸预览
2. 验证左右两侧显示导航按钮
3. 点击左按钮切换到上一张
4. 点击右按钮切换到下一张
5. 按左箭头键切换到上一张
6. 按右箭头键切换到下一张
7. 在第一张时，左按钮不显示
8. 在最后一张时，右按钮不显示

### Local Wallpaper Verification
1. 打开本地壁纸页面，点击任意壁纸预览
2. 验证导航按钮显示和功能正常
3. 键盘导航正常工作

### No Regression
1. 设置壁纸功能正常
2. 下载壁纸功能正常（在线壁纸）
3. 关闭预览功能正常
4. 预览动画效果正常

---

## Must Haves (Goal-Backward Verification)

1. **ImagePreview 组件** — 支持导航 props 和 emits
2. **导航按钮** — 左右两侧悬浮显示，与现有样式一致
3. **键盘支持** — 左右箭头键切换
4. **边界处理** — 首尾禁用对应按钮
5. **LocalWallpaper** — 正确传递列表和索引，响应导航事件
6. **OnlineWallpaper** — 正确传递列表和索引，响应导航事件
7. **无回归** — 所有现有功能行为不变

---

*Phase: 15-imagepreview-navigation*
*Created: 2026-04-27*
