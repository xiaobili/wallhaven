# 在线壁纸页面空状态UI设计

**日期**: 2026-05-06
**状态**: 待实现
**范围**: OnlineWallpaper.vue 页面的壁纸列表空状态处理

## 背景

在线壁纸页面（OnlineWallpaper.vue）使用 WallpaperList 组件显示壁纸列表，当前缺少搜索无结果时的空状态UI，用户体验不完整。

### 现有模式参考

FavoritesPage.vue 已有空状态实现（第37-51行），采用以下结构：
- 图标（fa-images）
- 主提示文案
- 副提示文案（引导性）
- 样式类：`.empty-collection`

## 设计方案

### 1. 显示条件

空状态在以下条件**同时满足**时显示：
- `pageData.data.length === 0` — 无壁纸数据
- `!loading` — 不在加载中
- `!error` — 无网络错误

**条件优先级**：
1. 网络错误 → 显示错误UI（已有实现）
2. 加载中 → 显示loading状态（已有实现）
3. 无数据 → 显示空状态UI（本次新增）
4. 有数据 → 显示壁纸列表

### 2. UI内容

延续 FavoritesPage 风格，保持应用整体一致性：

```
[图标: fa-search]
没有找到匹配的壁纸
尝试调整搜索条件或关键词
```

**图标选择**：使用 `fa-search` 而非 `fa-images`，更贴合"搜索无结果"的场景语义。

**文案设计**：
- 主文案："没有找到匹配的壁纸" — 明确告知用户搜索结果状态
- 副文案："尝试调整搜索条件或关键词" — 提供行动建议

### 3. 实现位置

在 `WallpaperList.vue` 组件内实现，位于：
- `<main>` 元素内部
- `#thumbs` div 之前
- 与 `.main-bottom` 的 loading/error 处理平行

**理由**：
- 组件自包含，逻辑内聚
- 修改范围最小（单文件改动）
- 未来其他使用 WallpaperList 的页面自动获得空状态支持

### 4. 样式设计

复用 FavoritesPage 的样式结构，在 WallpaperList.vue 的 `<style scoped>` 中添加：

```css
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

**与 FavoritesPage 的差异**：
- 类名改为 `.empty-result`（语义更准确：搜索结果为空）
- 添加 `min-height: 400px` 确保视觉高度与错误UI一致

### 5. 代码结构

```vue
<template>
  <main id="main" @click="emit('close-search-modal')">
    <!-- 空状态UI -->
    <div v-if="isEmpty" class="empty-result">
      <i class="fas fa-search" />
      <p>没有找到匹配的壁纸</p>
      <p class="hint">尝试调整搜索条件或关键词</p>
    </div>

    <!-- 壁纸列表 -->
    <div v-else id="thumbs" class="thumbs-container">
      <!-- 现有壁纸列表代码 -->
    </div>

    <!-- 底部状态栏 -->
    <div class="main-bottom">
      <!-- 现有 loading/error 代码 -->
    </div>
  </main>
</template>

<script setup lang="ts">
// 添加计算属性
const isEmpty = computed(() => {
  return props.pageData.data.length === 0 && !props.loading && !props.error
})
</script>
```

## 技术细节

### 数据流

- `pageData`: TotalPageData 类型，从 OnlineWallpaper.vue 传入
- `loading`: boolean，加载状态
- `error`: boolean，错误状态
- 无需新增 props，使用现有数据

### 响应式设计

- 空状态UI自适应居中布局
- padding 和 min-height 确保合理的视觉空间
- 文字大小与现有UI保持一致

### 边界情况

1. **初次加载**：loading=true，不显示空状态 ✓
2. **网络错误**：error=true，显示错误UI而非空状态 ✓
3. **搜索无结果**：loading=false, error=false, data=[]，显示空状态 ✓
4. **有数据**：data.length>0，显示壁纸列表 ✓

## 验收标准

- [ ] 空状态UI在搜索无结果时正确显示
- [ ] 样式与 FavoritesPage 保持一致
- [ ] 不影响现有的 loading 和 error 状态显示
- [ ] 代码遵循项目现有风格和规范
- [ ] 无 TypeScript 类型错误

## 影响范围

**修改文件**：
- `src/components/WallpaperList.vue` — 添加空状态UI和样式

**不影响**：
- OnlineWallpaper.vue — 无需修改
- 其他页面和组件

## 后续优化（可选）

- 考虑提取 EmptyState 为独立可复用组件（如果未来有更多使用场景）
- 考虑在副文案中显示当前搜索关键词（增强上下文信息）
