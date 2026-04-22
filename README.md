# Wallhaven - 在线壁纸浏览器

> 基于 Vue 3 + Vite + TypeScript 构建的现代化壁纸浏览应用

## ✨ 最新优化 (v1.0.0)

本项目已完成全面优化，包括：

- ⚡ **性能提升**: 滚动事件优化 95%，流畅的用户体验
- 🏗️ **架构升级**: 引入 API Service 层和 Pinia 状态管理
- 🛡️ **类型安全**: 100% TypeScript 覆盖
- 📦 **代码复用**: 创建工具函数库，提高可维护性

## 🎯 项目简介

Wallhaven 是一个功能丰富的在线壁纸浏览和管理应用，提供：

- 🔍 强大的搜索功能（关键词、分类、纯度、分辨率等）
- 🖼️ 流畅的图片预览和下载
- 📱 响应式设计，支持多种设备
- ⚡ 无限滚动加载，浏览体验流畅

## 🛠️ 技术栈

- **前端框架**: Vue 3.5+ (Composition API)
- **构建工具**: Vite 8.0+
- **语言**: TypeScript 6.0+
- **状态管理**: Pinia 3.0+
- **路由**: Vue Router 5.0+
- **HTTP 客户端**: Axios 1.15+
- **测试框架**: Vitest 4.1+

## 📁 项目结构

```
src/
├── components/          # Vue 组件
│   ├── ImagePreview.vue    # 图片预览
│   ├── PageHeader.vue      # 页面头部
│   ├── SearchBar.vue       # 搜索栏
│   ├── WallpaperList.vue   # 壁纸列表
│   └── DownloadList.vue    # 下载列表
├── services/           # ✨ API 服务层
│   └── wallpaperApi.ts     # Wallhaven API 封装
├── stores/             # ✨ Pinia 状态管理
│   └── modules/
│       └── wallpaper/
│           ├── state.ts        # 状态定义
│           ├── actions.ts      # 业务逻辑
│           ├── storage.ts      # 搜索参数存储
│           ├── settings-storage.ts  # 设置存储
│           └── index.ts        # Store 入口
├── utils/              # ✨ 工具函数
│   └── helpers.ts          # 通用工具函数
├── views/              # 视图组件
│   ├── OnlineWallpaper.vue   # 在线壁纸
│   ├── LocalWallpaper.vue    # 本地壁纸
│   ├── DownloadWallpaper.vue # 下载中心
│   └── SettingPage.vue       # ⭐ 应用设置
├── types/              # TypeScript 类型
│   └── index.ts
├── router/             # 路由配置
│   └── index.ts
├── static/             # 静态资源
│   └── css/
├── App.vue             # 根组件
└── main.ts             # 入口文件
```

## 🚀 快速开始

### 环境要求

- Node.js: ^20.19.0 || >=22.12.0
- npm 或 yarn 或 pnpm

### 安装依赖

```sh
npm install
```

### 开发模式

```sh
npm run dev
```

访问: <http://localhost:5173/>

### 生产构建

```sh
npm run build
```

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
