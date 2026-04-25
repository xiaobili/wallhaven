---
phase: 1
plan: 4
status: complete
completed: 2025-04-25
---

# Plan 04: 创建 useAlert composable

## 完成的工作

创建了 `src/composables/core/useAlert.ts`，解决 Alert 逻辑重复问题。

### 创建的文件

| 文件 | 用途 |
|------|------|
| `src/composables/core/useAlert.ts` | Alert 状态管理 composable |
| `src/composables/index.ts` | Composables 统一导出 |

### 导出的接口

```typescript
// Alert 类型
export type AlertType = 'success' | 'error' | 'warning' | 'info'

// Alert 状态接口
export interface AlertState {
  visible: boolean
  type: AlertType
  message: string
  duration: number
}

// useAlert 返回值接口
export interface UseAlertReturn {
  alert: Reactive<AlertState>
  showAlert: (message: string, type?: AlertType, duration?: number) => void
  hideAlert: () => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}
```

### 使用示例

```typescript
import { useAlert } from '@/composables'

// 在 setup 中使用
const { alert, showSuccess, showError } = useAlert()

// 显示成功提示（默认 3000ms）
showSuccess('操作成功')

// 显示错误提示（默认 5000ms，更长显示时间）
showError('操作失败')

// 在模板中使用
// <Alert v-if="alert.visible" :type="alert.type" :message="alert.message" :duration="alert.duration" @close="alert.visible = false" />
```

### 设计要点

1. **与现有 Alert.vue 组件完全兼容**
   - `visible`, `type`, `message`, `duration` 与 Alert.vue props 一致

2. **showError 默认显示更长时间**
   - 普通提示：3000ms
   - 错误提示：5000ms

3. **响应式状态**
   - 使用 `reactive` 创建响应式状态对象
   - 组件可以直接绑定 `alert.visible` 等

## 验证结果

- [x] composable 文件创建成功
- [x] 接口定义与现有 Alert.vue 组件 props 兼容
- [x] 返回值包含 alert 响应式对象和便捷方法
- [x] TypeScript 编译无错误
- [x] 可通过 `@/composables` 导入

## 注意事项

- 此 composable 仅提供状态管理，不包含 UI 组件
- 需要与现有的 `Alert.vue` 组件配合使用
- 后续阶段可以将 Alert.vue 组件也进行封装
