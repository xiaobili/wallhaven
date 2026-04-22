# SettingPage 设置页面使用指南

## 📋 功能概览

SettingPage 提供了完整的应用配置功能，包括下载设置、API 设置和桌面设置三大模块。

## 🎯 主要功能

### 1. 下载设置

#### 下载目录
- **功能**: 设置壁纸文件的默认保存位置
- **当前状态**: UI 已完成，待集成 Electron 文件夹选择对话框
- **使用方式**: 点击"浏览"按钮选择文件夹（待实现）

#### 多线程下载数量
- **功能**: 控制同时下载的壁纸数量
- **范围**: 1-10 个并发下载
- **默认值**: 3
- **调节方式**: 拖动滑块实时调整

### 2. Wallhaven API 设置

#### API Key 配置
- **功能**: 输入 Wallhaven API Key 以访问 NSFW 内容
- **获取方式**: 访问 [Wallhaven 账户设置](https://wallhaven.cc/settings/account)
- **安全性**: 输入框采用密码类型，不会明文显示
- **作用**: 启用后可在搜索栏中选择 NSFW 分类

### 3. 系统桌面设置

#### 壁纸适配模式
提供 6 种适配模式：

1. **填充 (Fill)**: 填充整个屏幕，可能会裁剪图片
2. **适应 (Fit)**: 保持比例适应屏幕，可能会有黑边
3. **拉伸 (Stretch)**: 拉伸以填满屏幕，可能会变形
4. **平铺 (Tile)**: 平铺重复显示
5. **居中 (Center)**: 居中显示，保持原始大小
6. **跨屏 (Span)**: 跨多个显示器显示（多屏适用）

#### 实时预览
- 每种模式都有可视化预览效果
- 显示详细的模式说明文字
- 帮助理解不同模式的差异

## 💾 数据持久化

### 存储机制
- **Pinia Store**: 运行时状态管理
- **localStorage**: 永久保存设置数据
- **自动同步**: 修改设置后自动保存到 localStorage
- **自动加载**: 应用启动时自动恢复上次保存的设置

### 存储键名
```javascript
'wallhaven_app_settings' // localStorage 中的键名
```

### 数据结构
```typescript
interface AppSettings {
  downloadPath: string              // 下载目录
  maxConcurrentDownloads: number    // 最大并发下载数 (1-10)
  apiKey: string                    // Wallhaven API Key
  wallpaperFit: WallpaperFit        // 壁纸适配模式
}

type WallpaperFit = 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span'
```

## 🔧 使用方法

### 访问设置页面
1. 启动应用
2. 点击左侧菜单的"设置"选项
3. 或直接访问 `/setting` 路由

### 修改设置
1. 在相应模块中修改配置
2. 点击"保存设置"按钮
3. 系统会自动验证并保存

### 恢复默认
1. 点击"恢复默认"按钮
2. 确认操作
3. 所有设置将恢复为初始值

## 🎨 UI 设计特点

### 视觉风格
- **主题色**: 深色背景 (#1a1a1a, #292929)
- **强调色**: 青色 (#0cd, #8cc)
- **圆角**: 3-4px 统一圆角
- **阴影**: 微妙的阴影效果增加层次感

### 交互体验
- **平滑过渡**: 所有交互都有 0.25s 过渡动画
- **悬停效果**: 按钮和链接有明确的悬停反馈
- **焦点状态**: 输入框聚焦时有发光效果
- **响应式**: 支持移动端自适应布局

### 图标使用
- 使用 Font Awesome 图标库
- 每个设置模块都有对应的图标
- 增强视觉识别度

## 🚀 后续开发计划

### 待集成功能
1. **Electron IPC 集成**
   - 文件夹选择对话框
   - 实际壁纸设置调用
   
2. **Toast 提示组件**
   - 保存成功提示
   - 错误提示
   
3. **设置验证**
   - API Key 有效性验证
   - 下载路径存在性检查

### 可能的扩展
- 主题切换功能
- 语言设置
- 快捷键配置
- 代理设置
- 缓存管理

## 📝 技术实现要点

### Pinia Store 集成
```typescript
// 在组件中使用
import { useWallpaperStore } from '@/stores/wallpaper'

const wallpaperStore = useWallpaperStore()
const settings = wallpaperStore.settings

// 更新设置
wallpaperStore.updateSettings({ 
  downloadPath: '/path/to/downloads',
  maxConcurrentDownloads: 5 
})

// 加载设置
wallpaperStore.loadSettings()
```

### 本地存储工具
```typescript
// settings-storage.ts 提供纯函数
import { saveSettingsToStorage, getSettingsFromStorage } from '@/stores/modules/wallpaper/settings-storage'

// 保存设置
saveSettingsToStorage(settings)

// 读取设置
const settings = getSettingsFromStorage()
```

## ⚠️ 注意事项

1. **API Key 安全**: API Key 会保存在 localStorage 中，请注意保护
2. **下载路径**: 当前仅支持手动输入，后续会集成文件夹选择器
3. **设置验证**: 保存时会进行基本验证，确保数据有效性
4. **默认值**: 首次使用或恢复默认时会使用预设的合理默认值

## 🐛 常见问题

### Q: 设置保存后重启应用丢失？
A: 检查浏览器是否禁用了 localStorage，或清除缓存时是否清除了本地存储。

### Q: API Key 输入后仍然无法访问 NSFW 内容？
A: 请确认 API Key 是否正确，以及账户是否有权限访问 NSFW 内容。

### Q: 如何查看当前保存的设置？
A: 打开浏览器开发者工具，在 Application/Storage 标签页查看 localStorage 中的 `wallhaven_app_settings` 键。

## 📞 技术支持

如有问题或建议，请提交 Issue 或 Pull Request。
