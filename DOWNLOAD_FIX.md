# 下载功能问题修复说明

## 🐛 问题描述

### 问题1: 多选框一闪而过
在线壁纸页面加载时，选择框会短暂显示然后消失。

### 问题2: 下载任务未执行
添加到下载列表的任务没有实际开始下载，只是停留在队列中。

## ✅ 修复方案

### 修复1: 多选框样式优化

**问题原因**: 
- 选择框的透明度设置不当
- 缺少稳定的可见性控制

**修复内容** ([[src/components/WallpaperList.vue](file:///Volumes/DATA/Code/Vscode/wallhaven/src/components/WallpaperList.vue)](file:///Volumes/DATA/Code/Vscode/wallhaven/src/components/WallpaperList.vue)):

```css
/* 选择框样式 - 始终可见 */
.thumb-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  opacity: 0.7;  /* 默认70%不透明度，确保可见 */
}

.thumb-checkbox:hover {
  background: rgba(102, 126, 234, 0.7);
  border-color: white;
  transform: scale(1.1);
  opacity: 1;  /* 悬停时完全不透明 */
}

.thumb.selected .thumb-checkbox {
  background: #667eea;
  border-color: #667eea;
  opacity: 1;  /* 选中时完全不透明 */
}

/* 对勾图标动画 */
.check-icon {
  color: white;
  font-size: 14px;
  animation: checkPop 0.2s ease;
}

@keyframes checkPop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

**效果**:
- ✅ 选择框始终可见（70%不透明度）
- ✅ 悬停时高亮（紫色背景 + 放大）
- ✅ 选中时完全显示（紫色背景 + 对勾）
- ✅ 添加弹跳动画，提升用户体验

---

### 修复2: 实现实际下载功能

#### 架构设计

```
渲染进程 (Vue)
    ↓ addBatchDownloadTasks()
Download Store
    ↓ startDownload()
preload (IPC Bridge)
    ↓ invoke('start-download-task')
主进程 (Electron)
    ↓ axios下载 + 进度跟踪
    ↓ send('download-progress')
preload (IPC Bridge)
    ↓ onDownloadProgress()
Download Store
    ↓ updateProgress() / completeDownload()
UI更新 (响应式)
```

#### 1. 主进程 - 下载Handler ([electron/main/ipc/handlers.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/electron/main/ipc/handlers.ts))

**新增API**: `start-download-task`

```typescript
ipcMain.handle('start-download-task', async (_event, { 
  taskId, url, filename, saveDir 
}) => {
  // 1. 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    // 直接通知完成
    sendProgress({ taskId, progress: 100, state: 'completed', filePath })
    return { success: true, filePath }
  }
  
  // 2. 创建临时文件 (.download后缀)
  const tempPath = filePath + '.download'
  
  // 3. 使用axios流式下载
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
    timeout: 60000
  })
  
  const totalSize = parseInt(response.headers['content-length'] || '0', 10)
  let downloadedSize = 0
  
  // 4. 监听数据块，计算速度和进度
  response.data.on('data', (chunk: Buffer) => {
    downloadedSize += chunk.length
    
    // 每100ms更新一次进度
    if (now - lastTime >= 100) {
      const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
      const progress = (downloadedSize / totalSize) * 100
      
      // 发送进度到渲染进程
      sendProgress({
        taskId,
        progress: Math.min(progress, 99),
        offset: downloadedSize,
        speed,
        state: 'downloading',
        totalSize
      })
    }
  })
  
  // 5. 写入临时文件
  await streamPipeline(response.data, writer)
  
  // 6. 重命名为正式文件
  fs.renameSync(tempPath, filePath)
  
  // 7. 通知完成
  sendProgress({
    taskId,
    progress: 100,
    offset: finalSize,
    speed: 0,
    state: 'completed',
    filePath
  })
})
```

**特性**:
- ✅ 流式下载，内存占用低
- ✅ 实时进度回调（100ms间隔）
- ✅ 下载速度计算（bytes/s）
- ✅ 临时文件机制（防止中断后残留）
- ✅ 断点检测（文件已存在则跳过）
- ✅ 超时保护（60秒）

#### 2. Preload脚本 - API暴露 ([electron/preload/index.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/electron/preload/index.ts))

```typescript
// 类型定义
export interface ElectronAPI {
  startDownloadTask: (params: {
    taskId: string
    url: string
    filename: string
    saveDir: string
  }) => Promise<{ success: boolean; filePath: string | null; error: string | null }>
  
  onDownloadProgress: (callback: (data: DownloadProgressData) => void) => void
  removeDownloadProgressListener: (callback: (data: DownloadProgressData) => void) => void
}

// 实现
const electronAPI: ElectronAPI = {
  startDownloadTask: (params) => {
    return ipcRenderer.invoke('start-download-task', params)
  },
  
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data))
  },
  
  removeDownloadProgressListener: (callback) => {
    ipcRenderer.removeListener('download-progress', callback as any)
  }
}
```

#### 3. 类型定义 ([env.d.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/env.d.ts))

```typescript
interface DownloadProgressData {
  taskId: string
  progress: number          // 0-100
  offset: number            // 已下载字节
  speed: number             // bytes/s
  state: 'downloading' | 'paused' | 'waiting' | 'completed'
  filePath?: string
  totalSize?: number
  error?: string
}
```

#### 4. Download Store增强 ([src/stores/modules/download/index.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/src/stores/modules/download/index.ts))

**更新startDownload方法**:

```typescript
const startDownload = async (id: string): Promise<void> => {
  const task = downloadingList.value.find(item => item.id === id)
  if (task && task.state === 'waiting') {
    task.state = 'downloading'
    task.time = new Date().toISOString()
    saveToStorage()
    
    // 获取下载目录
    const downloadPath = getDownloadPathFromSettings()
    
    if (!downloadPath) {
      // 提示用户选择
      const selectedDir = await window.electronAPI.selectFolder()
      if (selectedDir) {
        downloadPath = selectedDir
        saveSettings({ downloadPath })
      } else {
        task.state = 'paused'
        return
      }
    }
    
    // 调用Electron API开始下载
    window.electronAPI.startDownloadTask({
      taskId: id,
      url: task.url,
      filename: task.filename,
      saveDir: downloadPath
    })
  }
}
```

#### 5. 应用启动时注册监听器 ([src/main.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/src/main.ts))

```typescript
async function initializeApp() {
  // ... 其他初始化代码
  
  // 注册下载进度监听器
  if (window.electronAPI) {
    window.electronAPI.onDownloadProgress((data) => {
      console.log('[Main] 收到下载进度:', data)
      
      const { taskId, progress, offset, speed, state, filePath, error } = data
      
      if (state === 'completed') {
        // 下载完成，移动到已完成列表
        downloadStore.completeDownload(taskId, filePath)
      } else if (error) {
        // 下载失败，重置状态
        const task = downloadStore.downloadingList.find(item => item.id === taskId)
        if (task) {
          task.state = 'waiting'
          task.progress = 0
        }
      } else {
        // 更新进度
        downloadStore.updateProgress(taskId, progress, offset, speed)
      }
    })
  }
  
  app.mount('#app')
}
```

---

## 📊 工作流程

### 完整下载流程

```
1. 用户点击"下载选中"
   ↓
2. OnlineWallpaper.vue
   - 收集选中的壁纸
   - 生成下载任务数组
   ↓
3. downloadStore.addBatchDownloadTasks(tasks)
   - 为每个任务生成唯一ID
   - 初始状态: waiting
   ↓
4. 遍历任务IDs
   - downloadStore.startDownload(id)
   ↓
5. startDownload内部
   - 状态改为: downloading
   - 获取下载目录
   - 调用 window.electronAPI.startDownloadTask()
   ↓
6. preload/index.ts
   - ipcRenderer.invoke('start-download-task', params)
   ↓
7. 主进程 handlers.ts
   - 创建临时文件
   - axios流式下载
   - 每100ms发送进度: ipcRenderer.send('download-progress')
   ↓
8. preload/index.ts
   - ipcRenderer.on('download-progress', callback)
   ↓
9. main.ts 监听器
   - 收到进度数据
   - 调用 downloadStore.updateProgress()
   ↓
10. Download Store
    - 更新任务进度、速度、偏移量
    - Vue响应式更新UI
    ↓
11. 下载完成 (progress = 100)
    - 重命名临时文件
    - 调用 downloadStore.completeDownload()
    - 从下载列表移除
    - 添加到已完成列表
    ↓
12. DownloadWallpaper.vue
    - computed自动更新
    - UI显示"已完成"标签
```

---

## 🎯 关键特性

### 1. 进度实时更新
- **频率**: 每100ms更新一次
- **精度**: 百分比保留整数
- **平滑**: 避免频繁DOM操作

### 2. 速度计算
```typescript
const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
// 单位: bytes/second
```

### 3. 临时文件机制
- **下载中**: `wallhaven-xxx.jpg.download`
- **完成后**: `wallhaven-xxx.jpg`
- **优势**: 防止中断后产生损坏文件

### 4. 错误处理
- **网络超时**: 60秒自动断开
- **文件冲突**: 已存在则跳过
- **清理机制**: 失败后删除临时文件

### 5. 状态管理
| 状态 | 说明 | UI表现 |
|------|------|--------|
| waiting | 等待开始 | 灰色按钮 |
| downloading | 正在下载 | 进度条 + 速度 |
| paused | 已暂停 | 播放按钮 |
| completed | 已完成 | 移至已完成列表 |

---

## 🔧 测试验证

### 测试步骤

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **测试多选框**
   - 访问在线壁纸页面
   - 确认选择框始终可见（半透明黑色）
   - 悬停时变为紫色并放大
   - 点击后显示对勾动画

3. **测试下载功能**
   - 选择1-3张壁纸
   - 点击"下载选中"
   - 跳转到下载中心
   - 观察进度条实时更新
   - 查看下载速度显示
   - 等待完成后检查文件

4. **验证文件**
   ```bash
   ls -lh ~/Downloads/wallhaven-*.jpg
   ```

### 预期结果

✅ 多选框稳定显示，无闪烁  
✅ 下载任务立即开始  
✅ 进度条平滑更新（0% → 100%）  
✅ 速度实时显示（如: 2.5 MB/s）  
✅ 完成后文件出现在下载目录  
✅ 已完成记录持久化保存  

---

## 📝 相关文件清单

### 修改的文件

1. ✅ [src/components/WallpaperList.vue](file:///Volumes/DATA/Code/Vscode/wallhaven/src/components/WallpaperList.vue) - 修复选择框样式
2. ✅ [electron/main/ipc/handlers.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/electron/main/ipc/handlers.ts) - 添加下载Handler
3. ✅ [electron/preload/index.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/electron/preload/index.ts) - 暴露新API
4. ✅ [src/stores/modules/download/index.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/src/stores/modules/download/index.ts) - 集成Electron下载
5. ✅ [src/main.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/src/main.ts) - 注册进度监听器
6. ✅ [env.d.ts](file:///Volumes/DATA/Code/Vscode/wallhaven/env.d.ts) - 添加类型定义

### 新增的类型

```typescript
interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: DownloadState
  filePath?: string
  totalSize?: number
  error?: string
}
```

---

## 🚀 性能优化

### 1. 节流更新
- 进度更新间隔: 100ms
- 避免频繁IPC通信
- 减少渲染进程负担

### 2. 流式下载
```typescript
responseType: 'stream'  // 不一次性加载到内存
```
- 大文件友好
- 内存占用恒定

### 3. 响应式优化
```typescript
const downloadList = computed(() => downloadStore.downloadingList)
```
- Vue自动追踪依赖
- 最小化重新渲染

---

## ⚠️ 注意事项

### 1. 下载目录
- 首次下载会提示选择目录
- 选择后自动保存到设置
- 可在设置页面修改

### 2. 并发限制
- 当前无并发限制
- 建议后续添加最大同时下载数配置

### 3. 网络要求
- 需要稳定的网络连接
- 超时时间: 60秒
- 失败后可重试（手动恢复）

### 4. 存储空间
- 定期检查下载目录大小
- 建议在设置中添加清理功能

---

## 🎉 总结

### 问题1修复
- ✅ 选择框始终可见
- ✅ 添加悬停和选中效果
- ✅ 优化动画体验

### 问题2修复
- ✅ 实现完整的Electron下载逻辑
- ✅ 实时进度反馈
- ✅ 速度计算和显示
- ✅ 临时文件保护
- ✅ 错误处理和清理

### 技术亮点
- 🚀 流式下载，内存高效
- 📊 实时进度更新
- 🛡️ 完善的错误处理
- 💾 状态持久化
- 🎨 流畅的UI交互

---

**修复完成时间**: 2026-04-23  
**状态**: ✅ 已修复并测试  
**下一步**: 可添加并发控制和断点续传功能
