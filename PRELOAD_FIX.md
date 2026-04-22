# Electron Preload 脚本加载问题修复

## 问题描述

点击"设置下载目录"的"浏览"按钮时报错：
```
选择文件夹失败: Cannot read properties of undefined (reading 'selectFolder')
```

## 根本原因

**Preload 脚本路径配置错误**。electron-vite 将 preload 脚本编译为 `.mjs` 文件，但主进程中引用的路径是 `.js` 文件。

### 文件结构
```
out/
├── main/
│   └── index.js          # 主进程（.js）
└── preload/
    └── index.mjs         # Preload脚本（.mjs）← 注意扩展名！
```

## 解决方案

### 1. 修正 preload 路径

在 `electron/main/index.ts` 中：

```typescript
// ❌ 错误的路径
preload: join(__dirname, '../preload/index.js')

// ✅ 正确的路径
preload: join(__dirname, '..', 'preload', 'index.mjs')
```

### 2. 添加文件存在性检查

```typescript
import { existsSync } from 'node:fs'

const preloadPath = join(__dirname, '..', 'preload', 'index.mjs')

if (!existsSync(preloadPath)) {
  console.error('[Electron] ❌ Preload script not found at:', preloadPath)
}
```

### 3. 使用 fileURLToPath 正确解析路径

```typescript
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
```

## 验证修复

### 方法1：查看控制台日志

启动应用后，应该看到：
```
[Electron] __dirname: /path/to/out/main
[Electron] Preload path: /path/to/out/preload/index.mjs
[Electron] Preload exists: true
```

### 方法2：访问诊断页面

访问 `http://localhost:5173/diagnostic` 或 `/diagnostic` 路由

应该看到：
- ✅ window.electronAPI: 已定义
- ✅ window.electronAPI.selectFolder: 可用
- 所有 API 方法列表

### 方法3：测试功能

1. 进入"设置"页面
2. 点击"浏览"按钮
3. 应该弹出系统文件夹选择对话框

## 调试技巧

### Preload 脚本调试

在 `electron/preload/index.ts` 中添加日志：

```typescript
console.log('[Preload] Script loaded')
console.log('[Preload] Exposing electronAPI to window')
console.log('[Preload] Done')
```

### Renderer 进程调试

在 Vue 组件中添加：

```typescript
console.log('[Component] window.electronAPI:', window.electronAPI)
console.log('[Component] selectFolder method:', window.electronAPI?.selectFolder)
```

### 主进程调试

在 `electron/main/index.ts` 中添加：

```typescript
console.log('[Electron] Preload path:', preloadPath)
console.log('[Electron] Preload exists:', existsSync(preloadPath))
```

## 常见问题

### Q1: 修改后仍然报错？

**A**: 确保完全重启开发服务器：
```bash
# 停止当前服务（Ctrl+C）
npm run dev
```

### Q2: Preload 文件不存在？

**A**: 检查 electron.vite.config.ts 配置：
```typescript
preload: {
  plugins: [externalizeDepsPlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'electron/preload/index.ts')
      }
    }
  }
}
```

### Q3: 在浏览器中测试？

**A**: Electron API **只能**在 Electron 环境中使用，不能在普通浏览器中测试。必须通过 `npm run dev` 启动 Electron 应用。

## 相关文件

- ✅ `electron/main/index.ts` - 主进程入口
- ✅ `electron/preload/index.ts` - Preload 脚本
- ✅ `electron.vite.config.ts` - 构建配置
- ✅ `env.d.ts` - TypeScript 类型声明
- ✅ `src/views/Diagnostic.vue` - 诊断工具页面

## 技术要点

### electron-vite 输出规则

| 进程 | 输出文件 | 扩展名 |
|------|---------|--------|
| Main | out/main/index.js | .js |
| Preload | out/preload/index.mjs | **.mjs** |
| Renderer | Vite Dev Server | 不输出文件 |

### Context Isolation

启用 contextIsolation 时：
- ✅ Preload 脚本可以访问 Node.js API
- ✅ Renderer 进程通过 contextBridge 安全访问暴露的 API
- ❌ Renderer 进程不能直接访问 Node.js API

### 路径解析最佳实践

```typescript
// ✅ 推荐：使用 fileURLToPath
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const preloadPath = join(__dirname, '..', 'preload', 'index.mjs')

// ❌ 避免：直接使用 __dirname（ESM 中未定义）
const preloadPath = join(__dirname, '../preload/index.js')
```

---

**修复完成时间**: 2026-04-22  
**状态**: ✅ 已修复并验证
