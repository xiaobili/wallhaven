# 生产环境构建问题修复

## 修复日期
2026-04-23

## 问题描述

### 问题1: 构建的软件包打开后没有路由到主页面
**现象**: 
- 开发环境 (`npm run dev`) 正常运行，路由正确
- 生产环境 (`npm run build` 后打包) 打开应用显示空白或无法导航

**根本原因**:
- 在 `src/router/index.ts` 中使用了 `createWebHistory(import.meta.env.BASE_URL)`
- `createWebHistory` 依赖 HTML5 History API，需要 HTTP 服务器环境
- Electron 生产环境使用 `file://` 协议加载本地 HTML 文件，不支持 History API
- 导致路由无法正常工作

**解决方案**:
将路由历史模式从 `createWebHistory` 改为 `createWebHashHistory`

```typescript
// 修改前 (src/router/index.ts)
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 修改后
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})
```

**原理说明**:
- `createWebHashHistory` 使用 URL hash（`#`）来模拟路由
- 兼容 `file://` 协议和所有浏览器环境
- 对用户体验影响极小（URL 会显示为 `#/online` 而非 `/online`）

---

### 问题2: 在线壁纸页面点击下载按钮后，下载中心的任务列表并没有真正下载壁纸

**现象**:
- 点击下载按钮后，任务出现在下载中心列表中
- 但任务状态一直停留在 "等待中" 或 "已暂停"
- 没有实际的下载进度更新
- 开发环境中功能正常

**根本原因**:
1. **localStorage key 不一致**:
   - `src/stores/modules/download/index.ts` 的 `startDownload()` 函数中读取设置时使用:
     ```typescript
     const settingsStr = localStorage.getItem('app_settings')
     ```
   - 但实际保存设置时使用的 key 是 `'wallhaven_app_settings'`（定义在 `settings-storage.ts`）
   - 导致无法获取下载路径，任务被自动暂停

2. **缺少详细日志**:
   - 难以追踪下载流程中的具体问题点
   - 无法快速定位是设置读取失败还是 API 调用失败

**解决方案**:

修改 `src/stores/modules/download/index.ts` 中的 `startDownload()` 函数:

```typescript
const startDownload = async (id: string): Promise<void> => {
  const task = downloadingList.value.find(item => item.id === id)
  if (task && task.state === 'waiting') {
    task.state = 'downloading'
    task.time = new Date().toISOString()
    saveToStorage()
    console.log('[DownloadStore] 开始下载:', id)
    
    try {
      // 获取下载目录 - 使用正确的 storage key
      let downloadPath = ''
      
      // 首先尝试从 wallpaper store 的设置中获取
      const settingsStr = localStorage.getItem('wallhaven_app_settings')
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr)
          downloadPath = settings.downloadPath || ''
          console.log('[DownloadStore] 从 wallhaven_app_settings 获取下载路径:', downloadPath)
        } catch (e) {
          console.error('解析设置失败:', e)
        }
      }
      
      // 如果还是没有，尝试旧的 key（向后兼容）
      if (!downloadPath) {
        const oldSettingsStr = localStorage.getItem('app_settings')
        if (oldSettingsStr) {
          try {
            const oldSettings = JSON.parse(oldSettingsStr)
            downloadPath = oldSettings.downloadPath || ''
            console.log('[DownloadStore] 从 app_settings 获取下载路径:', downloadPath)
          } catch (e) {
            console.error('解析旧设置失败:', e)
          }
        }
      }
      
      if (!downloadPath && typeof window !== 'undefined' && window.electronAPI) {
        // 如果没有设置，提示用户选择
        console.log('[DownloadStore] 未设置下载路径，提示用户选择')
        const selectedDir = await window.electronAPI.selectFolder()
        if (selectedDir) {
          downloadPath = selectedDir
          // 保存设置到正确的 key
          const settings = { 
            downloadPath,
            maxConcurrentDownloads: 3,
            apiKey: '',
            wallpaperFit: 'fill' as const
          }
          localStorage.setItem('wallhaven_app_settings', JSON.stringify(settings))
          console.log('[DownloadStore] 已保存下载路径到 wallhaven_app_settings')
        } else {
          // 用户取消选择，暂停任务
          task.state = 'paused'
          console.log('[DownloadStore] 用户取消选择下载目录，任务已暂停')
          return
        }
      }
      
      if (!downloadPath) {
        task.state = 'paused'
        console.error('[DownloadStore] 未设置下载目录')
        return
      }
      
      // 调用 Electron API 开始下载
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('[DownloadStore] 调用 electronAPI.startDownloadTask:', {
          taskId: id,
          url: task.url,
          filename: task.filename,
          saveDir: downloadPath
        })
        
        window.electronAPI.startDownloadTask({
          taskId: id,
          url: task.url,
          filename: task.filename,
          saveDir: downloadPath
        })
      } else {
        console.error('[DownloadStore] window.electronAPI 不存在')
        task.state = 'paused'
      }
    } catch (error) {
      console.error('[DownloadStore] 启动下载失败:', error)
      task.state = 'waiting'
    }
  }
}
```

**关键改进**:
1. ✅ 使用正确的 localStorage key: `'wallhaven_app_settings'`
2. ✅ 向后兼容旧的 `'app_settings'` key
3. ✅ 添加详细的日志输出，便于调试
4. ✅ 明确错误处理和状态转换

---

## 测试步骤

### 1. 本地开发环境测试
```bash
# 启动开发服务器
npm run dev

# 测试项:
# - 路由是否正常跳转
# - 点击下载按钮后是否开始下载
# - 查看 Console 日志确认流程
```

### 2. 生产构建测试
```bash
# 构建应用
npm run build

# 预览生产版本
npm run preview

# 或者打包后测试
npm run build:mac  # macOS
npm run build:win   # Windows
npm run build:linux # Linux
```

### 3. 验证清单

#### 路由测试
- [ ] 应用启动后自动跳转到 `/online` (在线壁纸页面)
- [ ] 点击导航栏可以切换到其他页面
- [ ] 刷新页面后保持在当前路由
- [ ] URL 显示为 `#/online`、`#/download` 等 hash 格式

#### 下载功能测试
- [ ] 首次点击下载时提示选择下载目录
- [ ] 选择目录后任务开始下载
- [ ] 下载进度实时更新
- [ ] 下载完成后文件出现在目标目录
- [ ] 下载记录保存在下载中心

#### 日志检查
打开 DevTools (F12)，查看 Console 标签，应该看到:
```
[DownloadStore] 开始下载: dl_xxx
[DownloadStore] 从 wallhaven_app_settings 获取下载路径: /path/to/dir
[DownloadStore] 调用 electronAPI.startDownloadTask: {...}
[Preload] startDownloadTask called: dl_xxx
[Main Process] 开始下载任务: {...}
[Main Process] 发送进度: xx.xx%
[Main] 收到下载进度: {...}
```

---

## 预防措施

### 1. 统一 Storage Key 管理
创建常量文件 `src/constants/storage.ts`:
```typescript
export const STORAGE_KEYS = {
  APP_SETTINGS: 'wallhaven_app_settings',
  DOWNLOAD_FINISHED: 'download_finished_list',
  WALLPAPER_PARAMS: 'wallpaper_search_params',
} as const
```

### 2. 类型安全的 Storage 访问
```typescript
// utils/storage.ts
import { STORAGE_KEYS } from '@/constants/storage'

export function getAppSettings(): AppSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)
    return stored ? JSON.parse(stored) : null
  } catch (err) {
    console.error('Failed to load settings:', err)
    return null
  }
}
```

### 3. 开发环境与生产环境一致性测试
- 定期执行 `npm run build && npm run preview` 测试生产构建
- 不要仅依赖开发环境测试
- 建立自动化测试流程

### 4. 完善的错误处理
- 每个关键步骤都要有日志输出
- 使用统一的日志标签（如 `[DownloadStore]`、`[Main Process]`）
- 捕获异常并提供友好的用户提示

---

## 相关文件修改清单

1. ✅ `src/router/index.ts` - 修改路由历史模式
2. ✅ `src/stores/modules/download/index.ts` - 修复下载路径读取逻辑

---

## 技术要点总结

### Vue Router 历史模式选择
| 模式 | 适用场景 | URL 格式 | file:// 支持 |
|------|---------|---------|-------------|
| `createWebHistory` | Web 应用，有服务器 | `/online` | ❌ |
| `createWebHashHistory` | Electron、静态部署 | `#/online` | ✅ |
| `createMemoryHistory` | 服务端渲染、测试 | 无 URL | ✅ |

### Electron IPC 通信调试技巧
1. **三端日志**: Preload、Main、Renderer 都要添加日志
2. **参数验证**: 打印传递的参数对象
3. **状态跟踪**: 记录任务状态变化
4. **错误捕获**: 每个 async 函数都要 try-catch

---

## 参考资料
- [Vue Router - Hash History](https://router.vuejs.org/guide/essentials/history-mode.html#hash-mode)
- [Electron IPC Communication](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [项目记忆: Electron自定义标题栏实现规范](memory://c0228b46-e6d3-480f-a5bb-8f13095e8d6b)
- [项目记忆: Electron IPC Handler注册规范](memory://fb8afa7e-63ea-4326-8d9d-a91238082776)
