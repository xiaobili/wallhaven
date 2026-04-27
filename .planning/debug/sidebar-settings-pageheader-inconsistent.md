---
status: resolved
trigger: 设置页面显示侧边栏和其他页面显示侧边栏不同，其他页面侧边栏覆盖了PageHeader
created: 2026-04-28
updated: 2026-04-28
---

# Debug Session: sidebar-settings-pageheader-inconsistent

## Symptoms

**Expected Behavior:**
侧边栏应该覆盖 PageHeader（在所有页面保持一致）

**Actual Behavior:**
设置页面的侧边栏不覆盖 PageHeader，而其他页面的侧边栏覆盖了 PageHeader

**Error Messages:**
无错误信息

**Timeline:**
从一开始就存在

**Reproduction:**
简单复现，切换到设置页面观察侧边栏显示即可

## Root Cause

### 问题一：SettingPage 缺少顶部 padding

最初发现 SettingPage 的 `.settings-page` 只有 `padding: 0 2em;`，缺少顶部 padding。

### 问题二：侧边栏没有从顶部开始

**根本原因**：侧边栏 `.left-menu` 使用 `position: fixed` 但**没有设置 `top` 值**。

- **PageHeader (`#header`)**: `position: fixed; top: 0;` — 从视口最顶部开始
- **侧边栏 (`.left-menu`)**: `position: fixed;` (没有 `top: 0`) — 从正常文档流位置开始

这导致侧边栏和 PageHeader 的垂直位置不一致。

## Solution

### 修复一：为 SettingPage 添加顶部 padding

**src/views/SettingPage.vue**

```diff
 .settings-page {
   max-width: 900px;
   margin: 2em auto;
-  padding: 0 2em;
+  padding: 50px 2em 0;
 }

 /* 响应式设计 */
 @media (max-width: 768px) {
   .settings-page {
-    padding: 0 1em;
+    padding: 50px 1em 0;
   }
 }
```

### 修复二：为侧边栏添加 `top: 0`

**src/Main.vue**

```diff
 .left-menu {
   z-index: 998;
   position: fixed;
+  top: 0;
   color: #fff;
   float: left;
   width: 180px;
   height: 100%;
   box-shadow: 0 0 0 1px #222, 5px 0px 5px rgb(0 0 0 / 50%);
 }
```

## Verification

- [x] SettingPage 现在有 `padding-top: 50px`
- [x] 响应式设计也已更新
- [x] 与其他页面（DownloadWallpaper）的布局保持一致
- [x] 侧边栏添加 `top: 0`，与 PageHeader 对齐

## Evidence

- `src/components/PageHeader.vue`: `#header` 有 `z-index: 200` 和 `position: fixed; top: 0`
- `src/Main.vue`: `.left-menu` 现在有 `position: fixed; top: 0`
- `src/views/DownloadWallpaper.vue`: `.download-center` 有 `padding: 50px 20px 0`
- `src/views/SettingPage.vue`: 修复后 `.settings-page` 有 `padding: 50px 2em 0`

## Eliminated

- z-index 冲突：z-index 关系在所有页面一致，不是根本原因
