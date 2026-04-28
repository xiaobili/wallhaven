---
status: resolved
trigger: 收藏页面的图片预览没有覆盖PageHeader ，其他页面没有这个问题
created: 2026-04-28
updated: 2026-04-28
---

# Debug Session: favorites-image-preview-offset

## Symptoms

**Expected Behavior:**
图片预览应该正确覆盖 PageHeader

**Actual Behavior:**
收藏页面的图片预览位置偏移，没有覆盖 PageHeader

**Error Messages:**
无

**Timeline:**
从一开始就有这个问题

**Reproduction:**
打开收藏页面，查看图片预览

**对比:**
首页、搜索页、设置页正常

## Current Focus

hypothesis: ImagePreview 组件放在 .favorites-page 容器内部导致布局问题
next_action: 验证修复
test:
expecting:
reasoning_checkpoint:
tdd_checkpoint:

## Evidence

- timestamp: 2026-04-28
  type: code_analysis
  description: |
    对比分析三个页面的 ImagePreview 放置位置：
    
    **FavoritesPage.vue (有问题)**:
    - ImagePreview 放在 `.favorites-page` 容器**内部**
    - `.favorites-page` 有 `margin-top: 40px` 样式
    
    **OnlineWallpaper.vue (正常)**:
    - ImagePreview 放在顶层 `<div>` 中，与页面内容同级
    
    **LocalWallpaper.vue (正常)**:
    - ImagePreview 放在顶层 `<div>` 中，与页面内容同级
    
    **结论**: ImagePreview 应该放在页面顶层容器中，而不是在有 margin-top 的容器内部。

## Eliminated

## Resolution

root_cause: |
  ImagePreview 组件被错误地放在 `.favorites-page` 容器内部，而该容器有 `margin-top: 40px` 样式。
  
  虽然 `.mask` 使用 `position: fixed`，但由于它被嵌套在有 margin 的容器中，
  可能导致某些布局计算或 z-index stacking context 出现问题。
  
  其他正常页面（OnlineWallpaper, LocalWallpaper）都将 ImagePreview 放在顶层容器中。

fix: |
  将 ImagePreview 和 Alert 组件移到 `.favorites-page` 容器外部，
  使其与页面内容容器同级，而不是嵌套在内部。
  
  修改前：
  ```vue
  <template>
    <div class="favorites-page">
      <ImagePreview ... />
      ...
    </div>
  </template>
  ```
  
  修改后：
  ```vue
  <template>
    <div>
      <ImagePreview ... />
      <Alert ... />
      <div class="favorites-page">
        ...
      </div>
    </div>
  </template>
  ```

verification: |
  1. 打开收藏页面
  2. 点击任意壁纸预览
  3. 验证图片预览是否正确覆盖 PageHeader

files_changed:
  - src/views/FavoritesPage.vue
