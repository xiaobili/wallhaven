# Electron 集成指南

本项目已成功集成 Electron，支持 macOS、Windows 和 Linux 平台。

## 📦 技术栈

- **Electron**: 最新版本
- **electron-vite**: 最新的 Electron + Vite 构建工具
- **electron-builder**: 跨平台打包工具
- **electron-store**: 持久化存储用户配置

## 🚀 开发

### 启动开发环境

```bash
npm run dev
```

这将启动 Electron 应用，支持热重载（HMR）。

## 🏗️ 构建

### 构建所有平台

```bash
npm run build
```

### 构建特定平台

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

## 📁 项目结构

```
wallhaven/
├── electron/                 # Electron 相关代码
│   ├── main/                # 主进程代码
│   │   ├── index.ts         # 主进程入口
│   │   └── ipc/             # IPC 通信处理
│   │       └── example.ts   # IPC 示例
│   └── preload/             # 预加载脚本
│       └── index.ts         # 预加载脚本入口
├── src/                     # Vue 渲染进程代码
├── build/                   # 构建资源
│   └── entitlements.mac.plist  # macOS 权限配置
├── resources/               # 应用资源（如图标）
├── electron.vite.config.ts  # electron-vite 配置
└── electron-builder.yml     # electron-builder 配置
```

## 🔌 IPC 通信

### 渲染进程 → 主进程

在 Vue 组件中使用：

```typescript
// 发送消息
window.electronAPI.send('toMain', { data: 'your data' })

// 接收回复
window.electronAPI.receive('fromMain', (data) => {
  console.log('Received from main:', data)
})
```

### 主进程处理

在 `electron/main/ipc/` 中创建新的 IPC 处理器：

```typescript
import { ipcMain } from 'electron'

ipcMain.on('channel-name', (event, data) => {
  // 处理逻辑
  event.reply('response-channel', { result: 'success' })
})

// 或使用 handle/invoke（推荐用于异步操作）
ipcMain.handle('async-operation', async (_, data) => {
  // 异步处理
  return { result: 'success' }
})
```

## ⚙️ 配置说明

### electron.vite.config.ts

- **main**: 主进程配置
- **preload**: 预加载脚本配置
- **renderer**: 渲染进程（Vue 应用）配置

### electron-builder.yml

配置各平台的打包选项：
- **win**: Windows 打包配置（NSIS 安装包）
- **mac**: macOS 打包配置（DMG）
- **linux**: Linux 打包配置（AppImage, snap, deb）

## 🔒 安全最佳实践

1. **Context Isolation**: 已启用上下文隔离
2. **Node Integration**: 已禁用 Node 集成
3. **Preload Script**: 通过预加载脚本暴露有限的 API
4. **External Links**: 外部链接在默认浏览器中打开

## 📝 注意事项

1. **图标文件**: 将应用图标放置在 `resources/` 目录下
   - Windows: `icon.ico`
   - macOS: `icon.icns`
   - Linux: `icon.png`

2. **依赖安装**: 首次运行前确保安装了所有依赖
   ```bash
   npm install
   ```

3. **TypeScript 类型**: 已在 `env.d.ts` 中声明了 `electronAPI` 的类型

## 🐛 常见问题

### 构建失败

确保已安装所有必要的依赖：
```bash
npm install
```

### 开发时白屏

检查控制台是否有错误，确保 Vue 应用正确挂载。

### IPC 通信不工作

1. 确认通道名称在预加载脚本的白名单中
2. 检查主进程是否正确注册了 IPC 处理器

## 📚 参考资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-vite 文档](https://electron-vite.org/)
- [electron-builder 文档](https://www.electron.build/)

## 🎯 下一步

1. 添加更多 IPC 通信通道（如文件操作、系统信息等）
2. 实现自动更新功能
3. 添加系统托盘支持
4. 实现全局快捷键
5. 添加通知功能
