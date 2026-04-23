# 生产构建修复 - 快速测试指南

## 🚀 立即测试

### 步骤1: 验证路由修复

```bash
# 1. 构建应用
npm run build

# 2. 预览生产版本
npm run preview
```

**预期结果**:
- ✅ 应用窗口打开后自动显示"在线壁纸"页面
- ✅ URL 显示为 `#/online` (注意有 # 号)
- ✅ 点击导航栏可以切换页面
- ✅ 刷新页面后保持当前路由

**如果失败**:
- 检查 Console 是否有路由相关错误
- 确认 `src/router/index.ts` 已使用 `createWebHashHistory`

---

### 步骤2: 验证下载功能修复

#### 2.1 清除旧数据（可选）
在 DevTools Console 中执行:
```javascript
// 清除可能存在的错误设置
localStorage.removeItem('app_settings')
localStorage.removeItem('wallhaven_app_settings')
```

#### 2.2 测试下载流程

1. **打开 DevTools** (F12)，切换到 Console 标签

2. **浏览在线壁纸**，找到任意壁纸

3. **点击下载按钮**

4. **观察日志输出**，应该看到:
```
[DownloadStore] 添加下载任务: dl_xxx
[DownloadStore] 开始下载: dl_xxx
[DownloadStore] 未设置下载路径，提示用户选择
```

5. **选择下载目录** (首次会弹出文件夹选择对话框)

6. **继续观察日志**:
```
[DownloadStore] 从 wallhaven_app_settings 获取下载路径: /your/path
[DownloadStore] 调用 electronAPI.startDownloadTask: {...}
[Preload] startDownloadTask called: dl_xxx
[Main Process] 开始下载任务: {...}
[Main Process] 文件大小: xxx bytes
[Main Process] 发送进度: 10.50%
[Main] 收到下载进度: {...}
```

7. **切换到下载中心页面** (`#/download`)
   - 应该看到任务状态从 "等待中" → "下载中" → "已完成"
   - 进度条实时更新
   - 显示下载速度

8. **验证文件**
   - 打开选择的下载目录
   - 确认文件存在且完整

**如果失败**:
- ❌ 任务一直停留在 "等待中": 检查是否成功获取下载路径
- ❌ 没有 `[Main Process]` 日志: Electron IPC 通信失败，检查 preload 脚本
- ❌ 报错 "window.electronAPI 不存在": 仅在开发环境 Vite server 中会出现，生产构建正常

---

## 🔍 调试技巧

### 关键日志标签

| 标签 | 位置 | 说明 |
|------|------|------|
| `[DownloadStore]` | `src/stores/modules/download/index.ts` | 下载任务管理 |
| `[Preload]` | `electron/preload/index.ts` | IPC 桥接层 |
| `[Main Process]` | `electron/main/ipc/handlers.ts` | 主进程下载逻辑 |
| `[Main]` | `src/main.ts` | 渲染进程接收进度 |

### 常见问题排查

#### 问题A: 路由仍然不工作
```bash
# 检查 router/index.ts
grep "createWebHashHistory" src/router/index.ts

# 应该输出:
# import { createRouter, createWebHashHistory } from 'vue-router'
# history: createWebHashHistory(import.meta.env.BASE_URL),
```

#### 问题B: 下载路径读取失败
在 DevTools Console 中执行:
```javascript
// 检查当前设置
console.log('app_settings:', localStorage.getItem('app_settings'))
console.log('wallhaven_app_settings:', localStorage.getItem('wallhaven_app_settings'))

// 手动设置测试路径
const testSettings = {
  downloadPath: '/tmp/wallpapers',  // macOS/Linux
  // downloadPath: 'C:\\Wallpapers', // Windows
  maxConcurrentDownloads: 3,
  apiKey: '',
  wallpaperFit: 'fill'
}
localStorage.setItem('wallhaven_app_settings', JSON.stringify(testSettings))
```

#### 问题C: Electron API 不可用
```javascript
// 检查 electronAPI 是否存在
console.log('electronAPI:', window.electronAPI)
console.log('startDownloadTask:', window.electronAPI?.startDownloadTask)

// 如果返回 undefined，说明 preload 脚本未正确加载
// 检查 electron/main/index.ts 中的 preload 路径
```

---

## 📦 打包测试

### macOS
```bash
npm run build:mac
# 输出目录: dist/
# 运行: open dist/wallhaven-1.0.0.dmg
```

### Windows
```bash
npm run build:win
# 输出目录: dist/
# 运行: dist/wallhaven Setup 1.0.0.exe
```

### Linux
```bash
npm run build:linux
# 输出目录: dist/
```

---

## ✅ 验收标准

### 路由功能
- [ ] 应用启动自动跳转到 `/online`
- [ ] 所有导航链接正常工作
- [ ] 浏览器前进/后退按钮正常
- [ ] 直接访问 hash URL (如 `#/download`) 能正确路由

### 下载功能
- [ ] 单个壁纸下载正常工作
- [ ] 批量下载正常工作
- [ ] 下载进度实时更新 (< 1秒延迟)
- [ ] 下载完成后文件可访问
- [ ] 下载记录持久化保存
- [ ] 暂停/恢复功能正常
- [ ] 取消下载功能正常

### 日志完整性
- [ ] 每个关键步骤都有日志输出
- [ ] 错误信息清晰易懂
- [ ] 可以通过日志追踪完整下载流程

---

## 🐛 已知限制

1. **开发环境 vs 生产环境**
   - 开发环境 (`npm run dev`): 使用 Vite dev server，`window.electronAPI` 可能不可用
   - 生产环境 (`npm run preview` 或打包后): 完整 Electron 环境，所有 API 可用

2. **Hash 路由的 SEO**
   - Hash 路由对 SEO 不友好，但 Electron 桌面应用不需要考虑 SEO
   - URL 会显示 `#/online` 而非 `/online`，这是正常现象

3. **首次下载需要选择目录**
   - 如果未设置 `downloadPath`，首次下载会弹出文件夹选择对话框
   - 建议在设置页面提前配置下载目录

---

## 📝 下一步优化建议

1. **统一 Storage Key 管理**
   ```typescript
   // src/constants/storage.ts
   export const STORAGE_KEYS = {
     APP_SETTINGS: 'wallhaven_app_settings',
     DOWNLOAD_FINISHED: 'download_finished_list',
   } as const
   ```

2. **添加下载队列管理**
   - 限制并发下载数量
   - 支持优先级排序
   - 断点续传

3. **改进用户体验**
   - 使用 Toast 替代 alert
   - 添加下载完成通知
   - 支持拖拽文件到下载中心

4. **自动化测试**
   - E2E 测试路由跳转
   - 集成测试下载流程
   - Mock Electron API 进行单元测试

---

## 📞 需要帮助？

如果遇到问题:
1. 查看 Console 日志，搜索错误关键词
2. 检查本文档的"常见问题排查"部分
3. 参考 `PRODUCTION_BUILD_FIX.md` 详细文档
4. 查看项目记忆中的相关经验教训

**祝测试顺利！** 🎉
