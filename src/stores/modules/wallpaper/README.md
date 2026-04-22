# Wallpaper Store 模块化结构

## 📁 文件结构

```
stores/modules/wallpaper/
├── state.ts      # 状态定义
├── actions.ts    # 业务逻辑和 API 调用
├── storage.ts    # 本地存储管理
└── index.ts      # Store 主入口
```

## 📝 各模块说明

### state.ts
**职责**: 定义所有响应式状态的初始值

**导出函数**:
- `createInitialState()` - 创建并返回初始状态对象

**包含的状态**:
- `totalPageData` - 分页数据（总页数、当前页、壁纸列表）
- `loading` - 加载状态
- `error` - 错误状态
- `queryParams` - 查询参数
- `savedParams` - 保存的自定义搜索参数

### actions.ts
**职责**: 封装所有业务逻辑和 API 调用

**导出的 Actions**:
- `fetchWallpapers(params)` - 搜索壁纸（替换现有数据）
- `loadMoreWallpapers()` - 加载更多壁纸（追加数据）
- `resetState()` - 重置状态
- `saveCustomParams(params)` - 保存自定义搜索参数
- `getSavedParams()` - 获取保存的自定义搜索参数

**特点**:
- 接收状态引用作为参数，实现与状态的解耦
- 统一的错误处理
- 自动过滤空值参数
- 数字类型安全转换

### storage.ts
**职责**: 管理本地存储（localStorage）相关操作

**导出函数**:
- `saveCustomParamsToStorage(params)` - 保存参数到 localStorage
- `getSavedParamsFromStorage()` - 从 localStorage 获取参数

**特点**:
- 统一的错误处理
- 常量化的存储键名
- 纯函数设计，易于测试

### index.ts
**职责**: Store 的主入口，整合所有模块

**功能**:
- 使用 `defineStore` 创建 Pinia store
- 组合 state 和 actions
- 导出 `useWallpaperStore` hook

## 🚀 使用方式

### 标准用法（推荐）

```typescript
import { useWallpaperStore } from '@/stores/wallpaper'

const wallpaperStore = useWallpaperStore()

// 访问状态
console.log(wallpaperStore.loading)
console.log(wallpaperStore.totalPageData)

// 调用方法
await wallpaperStore.fetchWallpapers(params)
await wallpaperStore.loadMoreWallpapers()
wallpaperStore.saveCustomParams(customParams)
```

### 模块化导入（高级用法）

如果需要单独使用某个模块的功能：

```typescript
// 直接使用 storage 工具函数
import { saveCustomParamsToStorage, getSavedParamsFromStorage } 
  from '@/stores/modules/wallpaper/storage'

// 直接创建状态（用于测试等场景）
import { createInitialState } from '@/stores/modules/wallpaper/state'
```

## ✨ 优势

1. **职责分离**: 每个文件只负责一个明确的功能
2. **易于维护**: 修改某个功能时只需关注对应文件
3. **便于测试**: 可以独立测试每个模块
4. **代码复用**: 工具函数可以被其他地方复用
5. **清晰的结构**: 新成员可以快速理解代码组织

## 🔄 迁移说明

原有的导入方式仍然有效，无需修改现有代码：

```typescript
// ✅ 仍然有效（向后兼容）
import { useWallpaperStore } from '@/stores/wallpaper'

// ✅ 也可以使用新的路径
import { useWallpaperStore } from '@/stores/modules/wallpaper'
```

## 📌 注意事项

1. **不要直接修改 state**: 始终通过 actions 来修改状态
2. **错误处理**: 所有异步操作都有 try-catch 保护
3. **类型安全**: 所有函数都有完整的 TypeScript 类型定义
4. **localStorage 限制**: 注意浏览器存储空间限制（通常 5-10MB）
