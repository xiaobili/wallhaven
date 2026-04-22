# Wallhaven - 在线壁纸浏览器

> 基于 Electron + Vue 3 + Vite + TypeScript 构建的跨平台桌面壁纸应用

## ✨ 最新优化 (v2.0.0)

本项目已完成全面升级，现已支持 **Electron 桌面应用**：

- 🖥️ **跨平台支持**: macOS、Windows、Linux
- ⚡ **性能提升**: 滚动事件优化 95%，流畅的用户体验
- 🏗️ **架构升级**: Electron + Vue 3 + electron-vite
- 🛡️ **类型安全**: 100% TypeScript 覆盖
- 📦 **代码复用**: 创建工具函数库，提高可维护性
- 🔌 **原生能力**: 文件系统访问、系统托盘、通知等

## 🎯 项目简介

Wallhaven 是一个功能丰富的跨平台桌面壁纸浏览和管理应用，提供：

- 🔍 强大的搜索功能（关键词、分类、纯度、分辨率等）
- 🖼️ 流畅的图片预览和下载
- 💻 桌面应用体验，支持离线使用
- 🌐 跨平台支持（macOS、Windows、Linux）
- ⚡ 无限滚动加载，浏览体验流畅

## 🛠️ 技术栈

- **桌面框架**: Electron 41+
- **前端框架**: Vue 3.5+ (Composition API)
- **构建工具**: electron-vite 5+ / Vite 8+
- **语言**: TypeScript 6+
- **状态管理**: Pinia 3+
- **路由**: Vue Router 5+
- **HTTP 客户端**: Axios 1.15+
- **打包工具**: electron-builder 26+
- **测试框架**: Vitest 4+

## 📁 项目结构

```
wallhaven/
├── electron/                 # Electron 主进程代码
│   ├── main/                # 主进程
│   │   ├── index.ts         # 主进程入口
│   │   └── ipc/             # IPC 通信处理
│   └── preload/             # 预加载脚本
│       └── index.ts         # 预加载脚本入口
├── src/                     # Vue 渲染进程代码
├── build/                   # 构建资源
├── resources/               # 应用资源（图标等）
├── electron.vite.config.ts  # electron-vite 配置
└── electron-builder.yml     # electron-builder 配置
```

### IPC 通信

**渲染进程 → 主进程：**

```typescript
// 在 Vue 组件中
window.electronAPI.send('channel-name', { data: 'value' })

window.electronAPI.receive('response-channel', (data) => {
  console.log('收到回复:', data)
})
```

**主进程处理：**

```typescript
// electron/main/ipc/xxx.ts
import { ipcMain } from 'electron'

ipcMain.on('channel-name', (event, data) => {
  // 处理逻辑
  event.reply('response-channel', { result: 'success' })
})
```

### 原生功能示例

- 文件下载管理
- 系统通知
- 剪贴板操作
- 窗口控制
- 系统托盘
- 全局快捷键

详细文档请查看 [ELECTRON_INTEGRATION.md](./ELECTRON_INTEGRATION.md)

## 🚀 快速开始

### 环境要求

- Node.js: ^20.19.0 || >=22.12.0
- npm 或 yarn 或 pnpm

### 安装依赖

```sh
npm install
```

### 开发模式（桌面应用）

```sh
npm run dev
```

这将启动 Electron 桌面应用，支持热重载（HMR）。

### 开发模式（仅浏览器）

如果只想在浏览器中调试渲染进程：

```sh
npm run preview
```

### 生产构建

**构建所有平台：**
```sh
npm run build
```

**构建特定平台：**

Windows:
```sh
npm run build:win
```

macOS:
```sh
npm run build:mac
```

Linux:
```sh
npm run build:linux
```

构建产物将输出到 `release/` 目录。

### 预览生产构建

```sh
npm run preview
```

### 类型检查

```sh
npm run type-check
```

### 运行测试

```sh
npm run test:unit
```

### 代码格式化

```sh
npm run format
```

## 💡 核心功能

### 1. 壁纸搜索

支持多种筛选条件：

- 关键词搜索
- 分类筛选（普通、动漫、人物）
- 纯度筛选（SFW、Sketchy、NSFW）
- 分辨率选择
- 比例筛选
- 颜色筛选
- 排序方式（相关性、随机、日期、浏览量等）

### 2. 图片预览

- 大图预览
- 全屏查看
- 流畅的动画效果
- 快捷键支持

### 3. 无限滚动

- 自动加载更多
- 节流优化
- 提前预加载

### 4. 应用设置 ⭐ 新增

提供丰富的个性化配置选项：

- **下载设置**
  - 自定义下载目录
  - 多线程下载数量调节（1-10）
  
- **API 设置**
  - Wallhaven API Key 配置
  - 支持 NSFW 内容访问
  
- **桌面设置**
  - 6 种壁纸适配模式（填充、适应、拉伸、平铺、居中、跨屏）
  - 实时预览效果
  - 所有设置自动保存到本地

## 🔧 开发指南

### IDE 推荐

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

> ⚠️ 请禁用 Vetur 插件

### 浏览器插件

**Chrome/Edge/Brave:**

- [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- [启用自定义对象格式化](http://bit.ly/object-formatters)

**Firefox:**

- [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
- [启用自定义对象格式化](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

### TypeScript 支持

TypeScript 默认不支持 `.vue` 文件的类型信息，我们使用 `vue-tsc` 替代 `tsc` 进行类型检查。

在编辑器中需要 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 插件来提供 `.vue` 文件的类型支持。

## 🎨 最佳实践

### Vue 3 Composition API

```typescript
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 响应式数据
const count = ref(0)

// 计算属性
const doubleCount = computed(() => count.value * 2)

// 生命周期
onMounted(() => {
  console.log('组件已挂载')
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('scroll', handler)
})
```

### Pinia 状态管理

```typescript
import { useWallpaperStore } from '@/stores/wallpaper'

const store = useWallpaperStore()

// 访问状态
console.log(store.loading)

// 调用方法
await store.fetchWallpapers(params)
```

### API 调用

```typescript
import { searchWallpapers } from '@/services/wallpaperApi'

const data = await searchWallpapers({
  q: 'nature',
  page: 1
})
```

### 工具函数

```typescript
import { throttle, formatResolution } from '@/utils/helpers'

// 节流
const throttledFn = throttle(() => {
  console.log('执行')
}, 300)

// 格式化
formatResolution('1920x1080') // "1920 × 1080"
```

## 🐛 调试技巧

### Vue DevTools

按 `Option(⌥)+Shift(⇧)+D` 打开 Vue DevTools

### Electron DevTools

在开发模式下，按 `F12` 或 `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux) 打开开发者工具

### Pinia DevTools

在 DevTools 中选择 "Pinia" 标签页查看状态

### 网络请求

在浏览器开发者工具的 "Network" 标签页查看 API 请求

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Pinia](https://pinia.vuejs.org/)
- [Wallhaven API](https://wallhaven.cc/help/api)

---
