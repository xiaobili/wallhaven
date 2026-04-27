---
status: resolved
trigger: "LocalWallpaper页面中ImagePreview 中设置系统壁纸失败，原因可能为 无法识别 wallhaven:// 协议"
created: 2026-04-27
updated: 2026-04-27
---

# Debug Session: wallpaper-protocol-error

## Symptoms

**Expected Behavior:**
壁纸应成功设置为系统桌面背景

**Actual Behavior:**
界面弹窗显示错误消息

**Error Messages:**
界面弹窗显示错误（具体内容待捕获）

**Timeline:**
不确定 - 不清楚之前的状态

**Reproduction Steps:**
1. 打开 LocalWallpaper 页面
2. 点击图片预览
3. 尝试设置为壁纸

**User Hypothesis:**
无法识别 wallhaven:// 协议

## Current Focus

hypothesis: null
test: null
expecting: null
next_action: null
reasoning_checkpoint: null
tdd_checkpoint: null

## Evidence

### Evidence 1: 数据流追踪

**观察时间:** 2026-04-27

**数据流:**
1. `LocalWallpaper.vue` 的 `previewWallpaper()` 方法创建 `previewItem`
2. `previewItem.path` 被设置为 `getImageUrl(wallpaper.path)` → 返回 `wallhaven://` 协议 URL
3. `ImagePreview` 组件发出 `set-bg` 事件，传递 `WallpaperItem`（包含 `wallhaven://` 协议的 path）
4. `setAsWallpaper()` 接收参数，使用 `wallpaper.path` 作为图片路径
5. 路径传递到 `wallpaper.handler.ts` 的 `fs.existsSync(imagePath)`
6. `fs.existsSync()` 收到 `wallhaven://...` 字符串，文件不存在检查失败

**代码位置:**
- `src/views/LocalWallpaper.vue:189-199` - `setAsWallpaper()` 方法
- `src/views/LocalWallpaper.vue:162` - `path: imageUrl` 设置
- `src/views/LocalWallpaper.vue:225-237` - `getImageUrl()` 转换函数
- `electron/main/ipc/handlers/wallpaper.handler.ts:16` - `fs.existsSync(imagePath)` 检查

### Evidence 2: wallhaven:// 协议用途

**协议注册:** `electron/main/index.ts:35-77`

`wallhaven://` 协议是 Electron 自定义协议，用于在渲染进程中加载本地文件图片显示。它**仅用于图片显示**，不应传递给系统壁纸 API。

## Eliminated

<!-- Hypotheses that were tested and disproven -->

## Resolution

**root_cause:**
`setAsWallpaper()` 方法直接使用了传入对象的 `path` 字段作为壁纸路径。当从 `ImagePreview` 组件传递 `WallpaperItem` 时，其 `path` 字段已被转换为 `wallhaven://` 协议 URL（用于图片显示），但设置壁纸需要的是原始文件系统路径。

**fix:**
在 `setAsWallpaper()` 中添加 `decodeWallhavenUrl()` 辅助函数，解码 `wallhaven://` 协议 URL 回原始文件路径，确保传递给壁纸设置 API 的是有效的文件系统路径。

**修复代码:**
```typescript
/**
 * 从 wallhaven:// 协议 URL 解码原始文件路径
 */
const decodeWallhavenUrl = (url: string): string => {
  if (url.startsWith('wallhaven://')) {
    return decodeURIComponent(url.replace(/^wallhaven:\/\//, ''))
  }
  return url
}

const setAsWallpaper = async (wallpaper: LocalWallpaper | WallpaperItem): Promise<void> => {
  const pathValue = 'path' in wallpaper ? (wallpaper as LocalWallpaper).path : (wallpaper as WallpaperItem).url
  const imagePath = decodeWallhavenUrl(pathValue)
  // ...
}
```

**verification:**
1. 打开 LocalWallpaper 页面
2. 点击图片打开 ImagePreview
3. 点击"设为壁纸"按钮
4. 应成功设置壁纸，不再显示错误

**files_changed:**
- `src/views/LocalWallpaper.vue`
