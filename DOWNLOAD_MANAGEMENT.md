# 下载管理功能实现说明

## 📋 功能概述

实现了完整的壁纸下载管理系统，包括：
- ✅ 多选壁纸批量下载
- ✅ 下载任务队列管理
- ✅ 下载进度实时显示
- ✅ 暂停/恢复/取消下载
- ✅ 下载历史记录

## 🏗️ 架构设计

### 1. Download Store (`src/stores/modules/download/index.ts`)

集中管理所有下载任务的状态和逻辑。

#### 核心数据结构

```typescript
interface DownloadItem {
  id: string              // 唯一标识符
  url: string             // 下载地址
  filename: string        // 文件名
  small: string           // 缩略图
  resolution: string      // 分辨率
  size: number            // 文件大小
  offset: number          // 已下载字节数
  progress: number        // 进度百分比 (0-100)
  speed: number           // 下载速度 (bytes/s)
  state: DownloadState    // 状态: downloading/paused/waiting/completed
  path?: string           // 保存路径
  time?: string           // 时间戳
  wallpaperId?: string    // 关联的壁纸ID
}
```

#### 主要方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addDownloadTask` | 添加单个下载任务 | task对象 | 任务ID |
| `addBatchDownloadTasks` | 批量添加下载任务 | task数组 | 任务ID数组 |
| `startDownload` | 开始下载 | taskId | void |
| `pauseDownload` | 暂停下载 | taskId | void |
| `resumeDownload` | 恢复下载 | taskId | void |
| `cancelDownload` | 取消下载 | taskId | boolean |
| `updateProgress` | 更新进度 | taskId, progress, offset, speed | void |
| `completeDownload` | 完成下载 | taskId, filePath | void |
| `removeFinishedRecord` | 删除完成记录 | recordId | boolean |
| `isDownloading` | 检查是否在下载中 | wallpaperId | boolean |

### 2. OnlineWallpaper 多选功能

#### UI组件

**多选工具栏**（选中时显示）：
```vue
<div class="selection-toolbar framed">
  <span class="selection-count">已选择 N 张壁纸</span>
  <button @click="downloadSelected">下载选中</button>
  <button @click="clearSelection">取消选择</button>
</div>
```

**选择框**（每个壁纸卡片左上角）：
```vue
<div class="thumb-checkbox" @click.stop="toggleSelect(wallpaperId)">
  <i class="fas fa-check" v-if="isSelected(wallpaperId)"></i>
</div>
```

#### 交互方式

1. **单选**：点击选择框
2. **多选**：Ctrl/Cmd + 点击壁纸卡片
3. **批量下载**：点击工具栏"下载选中"按钮

#### 工作流程

```
用户选择壁纸
     ↓
点击"下载选中"
     ↓
收集选中的壁纸信息
     ↓
批量添加到下载队列
     ↓
自动开始所有下载
     ↓
跳转到下载中心查看进度
```

### 3. WallpaperList 组件增强

#### 新增Props

```typescript
interface Props {
  selectedIds?: string[]  // 选中的壁纸ID列表
}
```

#### 新增Events

```typescript
emit('select-wallpaper', id: string)  // 切换选择状态
```

#### 样式特性

- **选中高亮**：紫色边框 (`outline: 3px solid #667eea`)
- **选择框动画**：悬停放大效果
- **快捷键支持**：Ctrl/Cmd + 点击多选

### 4. DownloadWallpaper 下载中心

#### 功能模块

**下载中列表**：
- 显示所有活跃下载任务
- 实时进度条
- 暂停/恢复/取消操作
- 下载速度显示

**已完成列表**：
- 显示历史下载记录
- 打开文件位置
- 删除记录
- 最多保留50条记录

## 💻 使用示例

### 1. 单个下载

```typescript
// 点击下载按钮时
const downloadImg = async (imgItem: WallpaperItem) => {
  await addToDownloadQueue(imgItem)
  alert('✅ 已添加到下载队列')
}
```

### 2. 批量下载

```typescript
// 批量下载选中的壁纸
const downloadSelected = async () => {
  const tasks = selectedItems.map(item => ({
    url: item.path,
    filename: generateFilename(item),
    small: item.thumbs.small,
    resolution: item.resolution,
    size: item.file_size,
    wallpaperId: item.id
  }))
  
  const ids = downloadStore.addBatchDownloadTasks(tasks)
  ids.forEach(id => downloadStore.startDownload(id))
}
```

### 3. 检查重复下载

```typescript
// 防止重复添加
if (downloadStore.isDownloading(wallpaperId)) {
  throw new Error('该壁纸已在下载队列中')
}
```

## 🎨 UI/UX 设计

### 多选工具栏

- **渐变背景**：紫色渐变 (`#667eea → #764ba2`)
- **阴影效果**：柔和的投影
- **圆角设计**：6px圆角
- **响应式布局**：自适应不同屏幕

### 选择框

- **默认状态**：半透明黑色背景 + 白色边框
- **悬停状态**：紫色半透明 + 放大效果
- **选中状态**：紫色背景 + 白色对勾

### 下载进度条

- **渐变填充**：动态宽度显示进度
- **颜色变化**：根据状态改变颜色
- **平滑过渡**：CSS transition动画

## 🔧 技术实现细节

### 1. 状态持久化

```typescript
// 保存到localStorage
const saveToStorage = (): void => {
  localStorage.setItem('download_finished_list', 
    JSON.stringify(finishedList.value))
}

// 从localStorage加载
const loadFromStorage = (): void => {
  const saved = localStorage.getItem('download_finished_list')
  if (saved) {
    finishedList.value = JSON.parse(saved)
  }
}
```

### 2. 唯一ID生成

```typescript
const generateId = (): string => {
  return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
// 示例: dl_1713801234567_a3f5b8c2d
```

### 3. 文件名生成

```typescript
const generateFilename = (imgItem: WallpaperItem): string => {
  let ext = '.jpg'
  if (imgItem.path) {
    const match = imgItem.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    if (match) ext = match[0]
  }
  return `wallhaven-${imgItem.id}${ext}`
}
// 示例: wallhaven-m3lz2y.jpg
```

### 4. 响应式数据流

```
用户操作
   ↓
Vue组件emit事件
   ↓
父组件处理逻辑
   ↓
调用Download Store方法
   ↓
Store状态更新
   ↓
Vue响应式更新UI
```

## 📊 数据流图

```
┌─────────────┐
│OnlineWallpaper│
│  (选择壁纸)   │
└──────┬──────┘
       │ addBatchDownloadTasks
       ↓
┌──────────────┐
│Download Store│ ←──→ localStorage (持久化)
│  (任务管理)   │
└──────┬───────┘
       │ 响应式更新
       ↓
┌──────────────┐
│DownloadCenter│
│  (显示进度)   │
└──────────────┘
```

## ⚙️ 配置选项

### 下载目录

在设置页面配置：
- 默认下载路径
- 多线程数量（预留）

### 历史记录

- 最大保留数量：50条
- 存储位置：localStorage
- 自动清理：超出限制时自动删除最旧的记录

## 🐛 错误处理

### 1. 重复下载检测

```typescript
if (downloadStore.isDownloading(wallpaperId)) {
  throw new Error('该壁纸已在下载队列中')
}
```

### 2. 下载目录未设置

```typescript
if (!downloadPath) {
  const selectedDir = await window.electronAPI.selectFolder()
  if (!selectedDir) {
    return { success: false, error: '未选择下载目录' }
  }
}
```

### 3. 网络错误

- 下载失败时保留任务记录
- 支持手动重试
- 显示详细错误信息

## 🚀 性能优化

### 1. 批量操作

- 批量添加任务减少DOM操作
- 一次性启动多个下载

### 2. 内存管理

- 限制历史记录数量（50条）
- 完成后从活动列表移除

### 3. 响应式优化

- 使用computed缓存计算结果
- 避免不必要的重新渲染

## 📝 待实现功能

### 短期计划

- [ ] 实际的Electron下载逻辑（目前只是队列管理）
- [ ] 断点续传支持
- [ ] 下载速度限制
- [ ] Toast通知替代alert

### 长期计划

- [ ] 下载优先级队列
- [ ] 定时下载
- [ ] 下载统计图表
- [ ] 导出/导入下载历史

## 🔍 调试技巧

### 查看下载状态

```javascript
// 在控制台
console.log(downloadStore.downloadingList)
console.log(downloadStore.finishedList)
console.log(downloadStore.totalActive)
```

### 测试批量下载

```javascript
// 模拟选择多个壁纸
selectedWallpapers.value = ['id1', 'id2', 'id3']
downloadSelected()
```

### 清空历史记录

```javascript
downloadStore.clearFinishedList()
```

## 📚 相关文件

- ✅ `src/stores/modules/download/index.ts` - 下载管理Store
- ✅ `src/views/OnlineWallpaper.vue` - 在线壁纸页面（含多选）
- ✅ `src/components/WallpaperList.vue` - 壁纸列表组件（含选择框）
- ✅ `src/views/DownloadWallpaper.vue` - 下载中心页面
- ✅ `src/types/index.ts` - 类型定义

---

**实现完成时间**: 2026-04-23  
**状态**: ✅ 核心功能已完成  
**下一步**: 集成Electron实际下载逻辑
