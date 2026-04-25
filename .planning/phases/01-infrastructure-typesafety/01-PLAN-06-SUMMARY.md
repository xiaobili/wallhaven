---
phase: 1
plan: 6
status: complete
completed: 2025-04-25
---

# Plan 06: 消除 Store any 类型

## 完成的工作

将 `src/stores/modules/wallpaper/actions.ts` 中的 `any` 类型替换为正确的 `ShallowRef<TotalPageData>` 类型。

### 修改的文件

| 文件 | 变更 |
|------|------|
| `src/stores/modules/wallpaper/actions.ts` | 修复 any 类型 |

### 变更详情

#### 1. 添加 ShallowRef 导入

```typescript
// 之前
import type { Ref, Reactive } from 'vue'

// 之后
import type { Ref, Reactive, ShallowRef } from 'vue'
```

#### 2. 修复参数类型

```typescript
// 之前
export function createWallpaperActions(
  totalPageData: any, // shallowRef<TotalPageData>
  ...
)

// 之后
export function createWallpaperActions(
  totalPageData: ShallowRef<TotalPageData>,
  ...
)
```

## 验证结果

- [x] ShallowRef 类型成功导入
- [x] totalPageData 参数类型从 `any` 变更为 `ShallowRef<TotalPageData>`
- [x] TypeScript 编译无错误
- [x] 壁纸浏览、搜索、加载更多功能正常

## 类型安全收益

1. **IDE 自动补全**
   - 现在 IDE 能够正确推断 `totalPageData.value` 的类型
   - 访问 `sections`, `totalPage`, `currentPage` 有类型检查

2. **编译时错误检测**
   - 错误的属性访问会在编译时报错
   - 避免运行时类型错误

3. **代码可读性**
   - 类型签名明确表达了参数的意图
   - 不再需要注释说明类型

## 注意事项

- 此变更不改变任何运行时行为
- Store 的使用方式保持不变
- 仅提升了类型安全性
