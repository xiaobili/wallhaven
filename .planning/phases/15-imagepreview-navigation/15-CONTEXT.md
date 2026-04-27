# Phase 15: ImagePreview Navigation - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

为 ImagePreview 组件添加上一张/下一张切换功能，让用户可以在预览模式下浏览壁纸列表。

**核心交付物：**
1. ImagePreview 组件支持上一张/下一张导航
2. 支持键盘左右箭头快捷操作
3. 导航按钮 UI 与现有设计风格一致
4. 所有现有功能行为不变

**需求覆盖：** NAV-01

**阶段边界：**
- 仅修改 ImagePreview 组件及其调用方
- 不改变现有预览功能的行为
- 不添加新的业务逻辑

**当前状态：**
- ✅ ImagePreview 组件已有基本预览功能
- ✅ 支持设置壁纸、下载操作
- ❌ 不支持图片切换导航

**调用关系：**
- LocalWallpaper.vue 使用 ImagePreview（isLocal=true）
- OnlineWallpaper.vue 使用 ImagePreview（isLocal=false）
- 两处都需要传递壁纸列表和当前索引

</domain>

<decisions>
## Implementation Decisions

### 数据流设计 (D-01 ~ D-02)

- **D-01:** Props 传递方式 — 通过 props 传递壁纸列表和当前索引
  - 新增 props: `wallpaperList: WallpaperItem[]`, `currentIndex: number`
  - 理由: 符合 Vue 单向数据流，最小改动原则

- **D-02:** 索引更新方式 — 通过 emit 事件通知父组件更新索引
  - 新增 emit: `navigate: [direction: 'prev' | 'next']`
  - 父组件监听并更新 currentIndex
  - 理由: 保持组件无状态，由父组件管理状态

### UI 设计 (D-03 ~ D-04)

- **D-03:** 导航按钮位置 — 左右两侧悬浮按钮
  - 左侧: 上一张按钮
  - 右侧: 下一张按钮
  - 理由: 常见图片查看器模式，用户熟悉

- **D-04:** 按钮样式 — 与现有侧边栏按钮风格一致
  - 复用 `.sidebar-fixed_box` 样式
  - 使用 Font Awesome 图标 (`fa-chevron-left`, `fa-chevron-right`)
  - 理由: 保持 UI 一致性

### 键盘交互 (D-05 ~ D-06)

- **D-05:** 键盘快捷键 — 支持左右箭头切换
  - 左箭头: 上一张
  - 右箭头: 下一张
  - 理由: 增强用户体验，实现简单

- **D-06:** 边界处理 — 到达首尾时禁用对应按钮
  - 第一张: 禁用上一张按钮
  - 最后一张: 禁用下一张按钮
  - 键盘操作时无效果（不循环）
  - 理由: 明确告知用户边界，避免困惑

### Claude's Discretion

- 导航按钮的具体样式细节（透明度、悬停效果）
- 键盘事件监听器的添加和清理方式
- 按钮的显示/隐藏动画

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变）
- `.planning/REQUIREMENTS.md` — 需求定义
- `.planning/ROADMAP.md` — Phase 15 定义和成功标准

### 前置阶段上下文
- `.planning/phases/14-electronapi-layer-refactor/14-CONTEXT.md` — 前一阶段上下文

### 关键代码文件

#### 目标组件（需要修改）
- `src/components/ImagePreview.vue` — 添加导航功能
- `src/views/LocalWallpaper.vue` — 传递壁纸列表和索引
- `src/views/OnlineWallpaper.vue` — 传递壁纸列表和索引

#### 相关类型
- `src/types/index.ts` — WallpaperItem 类型定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### ImagePreview 现有结构
```vue
<template>
  <div class="mask" :class="showing === true ? '' : 'out'">
    <a class="close_btn" @click="close" />
    <div class="img-view">
      <img v-if="imgInfo" class="img-class" :src="imgInfo.path" />
    </div>
    <div class="sidebar-fixed-wrapper">
      <!-- 现有操作按钮 -->
      <div class="sidebar-fixed_box" title="设为壁纸" @click="setBg(imgInfo)">
        <i class="fas fa-repeat-alt" />
      </div>
      <div v-show="!isLocal" class="sidebar-fixed_box" title="下载" @click="downloadImg(imgInfo)">
        <i class="fas fa-download" />
      </div>
    </div>
  </div>
</template>
```

#### Props 定义
```typescript
interface Props {
  showing: boolean;
  imgInfo: WallpaperItem | null;
  isLocal: boolean;
}
```

#### 现有样式
```css
.sidebar-fixed_box {
  width: 50px;
  height: 50px;
  background-color: #222;
  border-radius: 4px;
  cursor: pointer;
}
```

### Integration Points

- **LocalWallpaper.vue:** 需要传递 `wallpapers` 数组和当前 `selectedIndex`
- **OnlineWallpaper.vue:** 需要传递 `wallpaperList` 数组和当前 `selectedIndex`
- 两处都需要监听 `navigate` 事件并更新索引

</code_context>

<specifics>
## Specific Ideas

- 导航按钮放置在图片两侧，与现有侧边栏按钮风格一致
- 使用 Font Awesome 图标 (`fa-chevron-left`, `fa-chevron-right`)
- 键盘左右箭头支持，到达边界时按钮禁用
- 保持最小改动原则，不重构现有代码结构

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段功能明确，无延后需求。

### Future Enhancements (Out of Scope)

- 循环浏览模式（最后一张后跳到第一张）
- 图片缩放功能
- 图片拖拽排序
- 全屏模式

</deferred>

---

*Phase: 15-imagepreview-navigation*
*Context gathered: 2026-04-27*
