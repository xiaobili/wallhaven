# TypeScript 类型定义指南

## 概述

本项目采用统一的 TypeScript 类型管理方式，所有类型定义都集中在 `src/types/index.ts` 文件中。

## 目录结构

```
src/
├── types/
│   └── index.ts          # 统一的类型定义文件
├── components/
│   ├── SearchBar.vue
│   └── WallpaperList.vue
└── views/
    └── ToolBars.vue
```

## 类型分类

### 1. Wallhaven API 相关类型
- `WallpaperThumb`: 壁纸缩略图信息
- `WallpaperQuery`: 壁纸查询参数
- `WallpaperMeta`: 壁纸元数据
- `WallpaperItem`: 壁纸项目信息

### 2. 页面数据相关类型
- `PageData`: 页面数据结构

### 3. 搜索参数相关类型
- `CustomParams`: 自定义搜索参数
- `GetParams`: API 获取参数

### 4. UI 辅助类型
- `ResolutionLine`: 分辨率行数据
- `RatioLine`: 比例行数据
- `ColorLine`: 颜色行数据

### 5. 组件 Props 类型
- `SearchBarProps`: SearchBar 组件 Props
- `WallpaperListProps`: WallpaperList 组件 Props

### 6. 下载和壁纸信息类型
- `WallpaperActionInfo`: 壁纸操作信息（用于设置背景、下载等）

## 使用规范

### ✅ 正确做法

1. **从统一类型文件导入**
```typescript
import type { CustomParams, WallpaperItem } from '@/types'
```

2. **在组件中使用类型**
```typescript
const props = defineProps<{
  customParams: CustomParams
}>()
```

3. **为变量添加类型注解**
```typescript
const localParams = reactive<CustomParams>({ ... })
```

### ❌ 错误做法

1. **不要在组件中重复定义 interface**
```typescript
// ❌ 错误：在组件中定义已存在的类型
interface CustomParams {
  selector: number
  // ...
}
```

2. **不要分散类型定义**
```typescript
// ❌ 错误：在不同文件中定义相同或相似的类型
```

## 添加新类型的步骤

1. 在 `src/types/index.ts` 中添加新的类型定义
2. 添加清晰的注释说明类型用途
3. 在相应的组件中导入并使用新类型
4. 更新本文档（如需要）

## 类型命名规范

- 使用 PascalCase 命名接口和类型
- 使用描述性的名称，避免缩写
- 相关的类型使用共同的前缀（如 `Wallpaper*`）
- Props 类型使用 `*Props` 后缀

## 最佳实践

1. **优先使用 `type` 而非 `interface`**（除非需要扩展）
2. **使用联合类型提高类型安全性**
   ```typescript
   purity: 'sfw' | 'sketchy' | 'nsfw'
   ```
3. **为可选属性使用 `?` 标记**
4. **使用有意义的注释说明复杂类型**
5. **定期审查和重构类型定义**

## 示例

### 完整的类型使用示例

```typescript
<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { CustomParams, WallpaperItem } from '@/types'

// Props 定义
const props = defineProps<{
  customParams: CustomParams
  apiKey: string
}>()

// Emits 定义
const emit = defineEmits<{
  (e: 'changeParams', value: CustomParams): void
  (e: 'preview', item: WallpaperItem): void
}>()

// 响应式数据
const localParams = reactive<CustomParams>({
  ...props.customParams
})

// 函数类型注解
const formatMulti = (str: string): string => {
  return str.replace(/x/g, ' × ')
}
</script>
```

## 维护建议

- 每次添加新功能时，先检查是否已有相关类型
- 保持类型定义的简洁性和可复用性
- 避免过度复杂的嵌套类型
- 定期清理未使用的类型定义
