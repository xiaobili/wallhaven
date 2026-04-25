---
phase: 1
plan: 3
status: complete
completed: 2025-04-25
---

# Plan 03: 创建错误类定义

## 完成的工作

创建了 `src/errors/` 目录，建立统一的错误处理层次结构。

### 创建的文件

| 文件 | 用途 |
|------|------|
| `src/errors/types.ts` | 错误类相关类型定义和错误码常量 |
| `src/errors/AppError.ts` | 应用基础错误类 |
| `src/errors/IpcError.ts` | IPC 通信错误类 |
| `src/errors/StoreError.ts` | Store 操作错误类 |
| `src/errors/NetworkError.ts` | 网络请求错误类 |
| `src/errors/index.ts` | 统一导出 |

### 错误类层次结构

```
Error (JavaScript 内置)
└── AppError (应用基础错误类)
    ├── IpcError (IPC 通信错误)
    ├── StoreError (Store 操作错误)
    └── NetworkError (网络请求错误)
```

### AppError 基类

```typescript
class AppError extends Error {
  readonly code: string           // 错误码
  readonly context?: Record<string, unknown>  // 错误上下文
  readonly cause?: Error          // 原始错误
  
  toJSON(): Record<string, unknown>
  toString(): string
}
```

### 专用错误类

#### IpcError
- `channel?: string` - IPC 通道名称

#### StoreError
- `key?: string` - 操作的键名
- `operation?: 'get' | 'set' | 'delete' | 'clear'` - 操作类型

#### NetworkError
- `statusCode?: number` - HTTP 状态码
- `url?: string` - 请求 URL
- `timeout: boolean` - 是否为超时错误
- `getUserMessage(): string` - 获取用户友好的错误消息

### 错误码常量

```typescript
export const ErrorCodes = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  
  // IPC 错误
  IPC_ERROR: 'IPC_ERROR',
  IPC_HANDLER_NOT_FOUND: 'IPC_HANDLER_NOT_FOUND',
  IPC_RESPONSE_PARSE_ERROR: 'IPC_RESPONSE_PARSE_ERROR',
  IPC_TIMEOUT: 'IPC_TIMEOUT',
  
  // Store 错误
  STORE_ERROR: 'STORE_ERROR',
  STORE_READ_ERROR: 'STORE_READ_ERROR',
  STORE_WRITE_ERROR: 'STORE_WRITE_ERROR',
  STORE_DELETE_ERROR: 'STORE_DELETE_ERROR',
  
  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_UNAUTHORIZED: 'NETWORK_UNAUTHORIZED',
  NETWORK_FORBIDDEN: 'NETWORK_FORBIDDEN',
  NETWORK_NOT_FOUND: 'NETWORK_NOT_FOUND',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',
}
```

## 验证结果

- [x] 所有错误类文件创建成功
- [x] 错误类继承层次正确
- [x] 每个错误类包含特定属性和方法
- [x] TypeScript 编译无错误
- [x] 可通过 `@/errors` 导入所有错误类

## 使用示例

```typescript
import { AppError, IpcError, NetworkError, ErrorCodes } from '@/errors'

// 抛出 IPC 错误
throw new IpcError('IPC 调用失败', {
  channel: 'select-folder',
  code: ErrorCodes.IPC_ERROR,
  context: { args: [] }
})

// 抛出网络错误
throw new NetworkError('请求超时', {
  timeout: true,
  url: 'https://wallhaven.cc/api/v1/search'
})

// 捕获并处理
try {
  // ...
} catch (err) {
  if (err instanceof NetworkError) {
    console.log(err.getUserMessage())
  }
}
```
