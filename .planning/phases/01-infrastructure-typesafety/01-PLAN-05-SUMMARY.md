---
phase: 1
plan: 5
status: complete
completed: 2025-04-25
---

# Plan 05: 添加全局错误处理器

## 完成的工作

在 `src/main.ts` 中添加全局错误处理器，处理 Vue 错误、未捕获的 Promise rejection 和全局 JavaScript 错误。

### 修改的文件

| 文件 | 变更 |
|------|------|
| `src/main.ts` | 添加全局错误处理器和 AppError 导入 |

### 添加的内容

#### 1. 导入 AppError

```typescript
import { AppError } from './errors'
```

#### 2. Vue 错误处理器

```typescript
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err)
  console.error('[Component Info]', info)

  if (err instanceof AppError) {
    console.error('[Error Code]', err.code)
    if (err.context) {
      console.error('[Error Context]', err.context)
    }
  }
}
```

#### 3. 未处理的 Promise rejection

```typescript
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)

  if (event.reason instanceof AppError) {
    console.error('[Error Code]', event.reason.code)
    if (event.reason.context) {
      console.error('[Error Context]', event.reason.context)
    }
  }

  event.preventDefault()  // 阻止默认的控制台警告
})
```

#### 4. 全局 JavaScript 错误

```typescript
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
})
```

## 验证结果

- [x] AppError 导入成功
- [x] Vue errorHandler 注册成功
- [x] unhandledrejection 监听器注册成功
- [x] error 监听器注册成功
- [x] TypeScript 编译无错误
- [x] 应用正常启动和运行

## 设计要点

1. **错误处理器在 app.mount 之前注册**
   - 确保应用初始化期间的错误也能被捕获

2. **AppError 实例特殊处理**
   - 额外记录错误码和上下文信息
   - 便于调试和问题追踪

3. **unhandledrejection 使用 preventDefault**
   - 阻止浏览器默认的控制台警告
   - 统一错误日志格式

4. **不在此处显示 Alert**
   - 应用可能未完全初始化
   - 组件级别的错误应由组件自行处理

## 注意事项

- 此处理器仅用于日志记录，不改变错误行为
- 生产环境可以考虑将错误上报到监控系统
