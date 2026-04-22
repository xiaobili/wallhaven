# Electron API 功能实现清单

## ✅ 已完成的功能

### 1. IPC 通信架构

#### 主进程 Handlers (`electron/main/ipc/handlers.ts`)
已实现以下IPC通道：

- ✅ **select-folder** - 选择文件夹对话框
- ✅ **read-directory** - 读取目录内容（包含图片尺寸信息）
- ✅ **delete-file** - 删除文件
- ✅ **open-folder** - 打开系统文件夹
- ✅ **download-wallpaper** - 下载壁纸（支持自动重命名、断点续传准备）
- ✅ **set-wallpaper** - 设置桌面壁纸
- ✅ **save-settings** - 保存应用设置到持久化存储
- ✅ **load-settings** - 加载应用设置

#### Preload 脚本 (`electron/preload/index.ts`)
- ✅ 完整的TypeScript类型定义
- ✅ 安全的API暴露（contextBridge）
- ✅ 所有IPC通道的封装

#### 类型声明 (`env.d.ts`)
- ✅ Window接口扩展
- ✅ 完整的ElectronAPI类型定义

### 2. 在线壁纸功能 (`src/views/OnlineWallpaper.vue`)

#### 下载壁纸
```typescript
// 已实现
const downloadImg = async (imgItem: WallpaperItem) => {
  // 1. 检查下载目录（未设置则弹出选择对话框）
  // 2. 生成文件名（wallhaven-{id}.{ext}）
  // 3. 调用 window.electronAPI.downloadWallpaper()
  // 4. 显示下载结果
}
```

#### 设置为桌面壁纸
```typescript
// 已实现
const setBg = async (imgItem: WallpaperItem) => {
  // 1. 先下载图片到本地
  // 2. 调用 window.electronAPI.setWallpaper()
  // 3. 显示设置结果
}
```

### 3. 本地壁纸功能 (`src/views/LocalWallpaper.vue`)

#### 刷新列表
```typescript
// 已实现
const refreshList = async () => {
  // 1. 从store获取下载目录
  // 2. 调用 window.electronAPI.readDirectory()
  // 3. 解析图片文件（jpg, png, gif等）
  // 4. 获取每张图片的尺寸信息
  // 5. 渲染到网格列表
}
```

#### 打开文件夹
```typescript
// 已实现
const openFolder = async () => {
  await window.electronAPI.openFolder(downloadPath)
}
```

#### 设置为桌面壁纸
```typescript
// 已实现
const setAsWallpaper = async (wallpaper) => {
  const result = await window.electronAPI.setWallpaper(wallpaper.path)
  // 显示成功/失败提示
}
```

#### 删除文件
```typescript
// 已实现
const deleteWallpaper = async (wallpaper, index) => {
  // 1. 确认对话框
  // 2. 调用 window.electronAPI.deleteFile()
  // 3. 从列表中移除
  // 4. 显示结果
}
```

### 4. 设置页面 (`src/views/SettingPage.vue`)

#### 选择下载目录
```typescript
// 已实现
const browseDownloadPath = async () => {
  const selectedPath = await window.electronAPI.selectFolder()
  if (selectedPath) {
    settings.downloadPath = selectedPath
    wallpaperStore.updateSettings({ downloadPath: selectedPath })
  }
}
```

#### 保存设置
```typescript
// 已实现
const saveSettings = async () => {
  // 1. 验证设置
  // 2. 更新Pinia Store
  // 3. 调用 window.electronAPI.saveSettings()
  // 4. 显示保存结果
}
```

#### 恢复默认设置
```typescript
// 已实现
const resetSettings = () => {
  // 重置为默认值并更新store
}
```

### 5. 下载中心 (`src/views/DownloadWallpaper.vue`)

#### 基本功能
- ✅ 加载下载记录（从localStorage）
- ✅ 取消下载任务
- ✅ 暂停/恢复下载
- ✅ 删除完成记录
- ✅ 在文件夹中显示（调用Electron API）
- ✅ 保存最近20条记录

### 6. 应用初始化 (`src/main.ts`)

```typescript
// 已实现
async function initializeApp() {
  // 1. 从localStorage加载设置
  wallpaperStore.loadSettings()
  
  // 2. 如果在Electron环境，从持久化存储加载
  if (window.electronAPI) {
    const result = await window.electronAPI.loadSettings()
    if (result.success && result.settings) {
      wallpaperStore.updateSettings(result.settings)
    }
  }
  
  // 3. 挂载应用
  app.mount('#app')
}
```

## 📦 需要安装的依赖

```bash
npm install wallpaper@latest --legacy-peer-deps
```

**wallpaper** 包用于跨平台设置桌面壁纸：
- macOS: 使用 AppleScript
- Windows: 使用系统API
- Linux: 根据不同桌面环境使用相应工具

## 🔧 配置说明

### electron.vite.config.ts
已配置API代理，解决CORS问题：
```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://wallhaven.cc/api/v1',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

### package.json
已添加wallpaper依赖：
```json
{
  "dependencies": {
    "wallpaper": "^7.2.0"
  }
}
```

## 🚀 使用方法

### 1. 安装依赖
```bash
npm install
npm install wallpaper@latest --legacy-peer-deps
```

### 2. 启动开发环境
```bash
npm run dev
```

### 3. 测试功能

#### 测试下载功能
1. 访问在线壁纸页面
2. 点击任意壁纸的下载按钮
3. 首次使用会弹出文件夹选择对话框
4. 选择下载目录后开始下载
5. 下载完成后显示文件路径

#### 测试设置壁纸
1. 访问在线壁纸页面
2. 点击任意壁纸的"设为壁纸"按钮
3. 系统会自动下载并设置为桌面壁纸
4. 显示成功/失败提示

#### 测试本地列表
1. 访问本地壁纸页面
2. 自动加载下载目录中的所有图片
3. 可以预览、设置壁纸、删除文件
4. 点击"打开文件夹"按钮查看原文件

#### 测试设置页面
1. 访问设置页面
2. 点击"浏览"按钮选择下载目录
3. 调整多线程下载数量
4. 输入API Key（可选）
5. 选择壁纸适配模式
6. 点击"保存设置"

## 🐛 故障排查

### 问题1: wallpaper模块找不到
**解决**: 
```bash
npm install wallpaper@latest --legacy-peer-deps
```

### 问题2: 设置壁纸失败
**可能原因**:
- macOS: 需要授予屏幕录制权限
- Windows: 可能需要管理员权限
- Linux: 需要安装相应的桌面环境工具

**调试**:
查看控制台错误信息，通常会显示具体原因。

### 问题3: 下载失败
**检查**:
1. 网络连接是否正常
2. 下载目录是否有写入权限
3. 磁盘空间是否充足

### 问题4: 读取目录为空
**检查**:
1. 下载目录是否设置正确
2. 目录中是否有图片文件（jpg, png, gif等）
3. 文件权限是否正确

## 📝 API 详细说明

### window.electronAPI.selectFolder()
选择文件夹对话框
```typescript
const path = await window.electronAPI.selectFolder()
// 返回: string | null
```

### window.electronAPI.readDirectory(dirPath: string)
读取目录中的图片文件
```typescript
const result = await window.electronAPI.readDirectory('/path/to/dir')
// 返回: { error: string | null, files: Array<{
//   name: string,
//   path: string,
//   size: number,
//   modifiedAt: number,
//   width: number,
//   height: number
// }> }
```

### window.electronAPI.downloadWallpaper(params)
下载壁纸
```typescript
const result = await window.electronAPI.downloadWallpaper({
  url: 'https://...',
  filename: 'wallpaper.jpg',
  saveDir: '/path/to/save'
})
// 返回: { success: boolean, filePath: string | null, error: string | null }
```

### window.electronAPI.setWallpaper(imagePath: string)
设置桌面壁纸
```typescript
const result = await window.electronAPI.setWallpaper('/path/to/image.jpg')
// 返回: { success: boolean, error: string | null }
```

### window.electronAPI.deleteFile(filePath: string)
删除文件
```typescript
const result = await window.electronAPI.deleteFile('/path/to/file.jpg')
// 返回: { success: boolean, error: string | null }
```

### window.electronAPI.openFolder(folderPath: string)
打开文件夹
```typescript
const result = await window.electronAPI.openFolder('/path/to/folder')
// 返回: { success: boolean, error?: string }
```

### window.electronAPI.saveSettings(settings: any)
保存设置
```typescript
const result = await window.electronAPI.saveSettings({
  downloadPath: '/path',
  apiKey: 'xxx',
  ...
})
// 返回: { success: boolean, error?: string }
```

### window.electronAPI.loadSettings()
加载设置
```typescript
const result = await window.electronAPI.loadSettings()
// 返回: { success: boolean, settings: any | null, error?: string }
```

## 🎯 功能特性

### 安全性
- ✅ Context Isolation（上下文隔离）
- ✅ Node Integration禁用
- ✅ Preload Script白名单机制
- ✅ 所有API通过contextBridge安全暴露

### 用户体验
- ✅ 友好的错误提示
- ✅ 操作确认对话框
- ✅ 实时反馈（成功/失败）
- ✅ 自动保存设置

### 跨平台支持
- ✅ macOS
- ✅ Windows
- ✅ Linux

### 性能优化
- ✅ 图片尺寸异步读取
- ✅ 流式下载（大文件友好）
- ✅ 自动重命名避免覆盖

## 🔄 后续优化建议

1. **下载管理增强**
   - 实现真正的多线程下载
   - 支持断点续传
   - 下载队列管理

2. **壁纸切换**
   - 定时自动切换壁纸
   - 壁纸收藏夹
   - 壁纸历史记录

3. **系统托盘**
   - 最小化到托盘
   - 快速设置随机壁纸
   - 通知提醒

4. **全局快捷键**
   - 下一张壁纸
   - 收藏当前壁纸
   - 打开设置

5. **自动更新**
   - 检查新版本
   - 自动下载安装

---

**实现完成时间**: 2026-04-22  
**Electron版本**: 41.2.2  
**状态**: ✅ 所有核心功能已实现
