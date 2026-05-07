# Phase 3 上下文：代码质量（错误处理与类型）

**创建日期:** 2026-05-06
**阶段目标:** 统一错误处理格式和消除类型定义重复

---

## 覆盖需求

- **QUAL-01**: 统一错误处理格式
- **QUAL-02**: 消除类型定义重复

---

## 问题分析

### 1. 错误处理不一致（HIGH-02）

#### 当前状态

IPC handlers 存在 3 种错误返回格式：

```typescript
// 格式 1: 简单字符串（错误码）
return { success: false, error: 'NOT_FOUND' }
return { success: false, error: 'VALIDATION_ERROR' }

// 格式 2: 中文消息
return { success: false, error: '图片文件不存在' }
return { success: false, error: '文件不存在' }

// 格式 3: 动态消息
return { success: false, error: error.message }
return { success: false, error: `wallpaper 模块加载失败: ${importError.message}` }
```

#### 现有基础设施

1. **IpcErrorInfo 类型** (`src/types/ipc.ts:88-91`)
   ```typescript
   export interface IpcErrorInfo {
     code: string
     message: string
   }
   ```

2. **IpcResponse 类型** (`src/types/ipc.ts:79-83`)
   ```typescript
   export interface IpcResponse<T = unknown> {
     success: boolean
     data?: T
     error?: IpcErrorInfo
   }
   ```

3. **AppError 错误类** (`src/errors/AppError.ts`)
   - 基础错误类，包含 `code`、`context`、`cause`

4. **IpcError 错误类** (`src/errors/IpcError.ts`)
   - 继承 AppError，增加 `channel` 字段

5. **类型守卫** (`src/types/ipc.ts:381-390`)
   ```typescript
   export function isIpcErrorInfo(value: unknown): value is IpcErrorInfo
   ```

#### 需要统一的文件

| 文件 | 错误返回数量 | 问题类型 |
|------|-------------|----------|
| `download.handler.ts` | 3 | 字符串错误码 |
| `wallpaper.handler.ts` | 3 | 中文消息、动态消息 |
| `store.handler.ts` | 4 | 动态消息 |
| `file.handler.ts` | 3 | 中文消息、动态消息 |
| `favorites.handler.ts` | ? | 待确认 |

#### 解决方案

1. 定义标准错误码常量
2. 创建错误响应辅助函数
3. 更新所有 IPC handlers 使用统一格式
4. 更新调用方错误处理逻辑

---

### 2. 类型定义重复（MEDIUM-04）

#### 重复类型 A: DownloadProgressData

**位置 1:** `src/types/ipc.ts:199-214`
```typescript
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed' | 'retrying'
  filePath?: string
  error?: string
  totalSize?: number
  resumeNotSupported?: boolean
  retryCount?: number
  retryDelay?: number
}
```

**位置 2:** `src/services/download.service.ts:14-29`
```typescript
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed' | 'retrying'
  filePath?: string
  error?: string
  totalSize?: number
  resumeNotSupported?: boolean
  retryCount?: number
  retryDelay?: number
}
```

**使用分析:**
- `src/types/ipc.ts` - 主进程和渲染进程共享
- `src/services/download.service.ts` - 渲染进程服务层
- 需要保留 `src/types/ipc.ts` 中的定义

#### 重复类型 B: CacheInfo

**位置 1:** `src/types/ipc.ts:310-313`
```typescript
export interface CacheInfo {
  thumbnailsCount: number
  tempFilesCount: number
}
```

**位置 2:** `src/repositories/settings.repository.ts:10-13`
```typescript
export interface CacheInfo {
  thumbnailsCount: number
  tempFilesCount: number
}
```

**使用分析:**
- `src/types/ipc.ts` - 标准位置
- `src/repositories/settings.repository.ts` - 本地定义
- 应从 `@/types/ipc` 导入

#### 解决方案

1. 保留 `src/types/ipc.ts` 中的定义作为唯一来源
2. 从 `src/services/download.service.ts` 删除重复定义
3. 从 `src/repositories/settings.repository.ts` 删除重复定义
4. 更新导入引用

---

## 影响范围分析

### GitNexus 影响分析

**DownloadProgressData 修改影响:**
- 调用方: `src/services/download.service.ts`
- 消费方: `src/composables/download/useDownload.ts`
- 进程通信: `electron/main/ipc/handlers/download.handler.ts`

**CacheInfo 修改影响:**
- 调用方: `src/repositories/settings.repository.ts`
- 消费方: `src/services/settings.service.ts`, `src/views/SettingPage.vue`

### 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 错误格式变更影响调用方 | 中 | 中 | 保持向后兼容的字符串格式转换 |
| 类型导入路径变更 | 低 | 低 | TypeScript 编译检查 |
| 遗漏更新点 | 低 | 中 | Grep 搜索确认所有引用 |

---

## 约束条件

1. **保持功能兼容** - 所有现有功能必须正常工作
2. **不改变 UI** - 用户界面无变化
3. **原子提交** - 每个逻辑变更独立提交
4. **GitNexus 验证** - 提交前运行 `gitnexus_detect_changes`

---

## 验收标准

### 错误处理统一

- [ ] 所有 IPC handlers 返回 `IpcErrorInfo` 格式
- [ ] 错误码使用常量定义
- [ ] 调用方能正确处理统一格式
- [ ] 无硬编码字符串错误

### 类型定义统一

- [ ] `DownloadProgressData` 只有一处定义
- [ ] `CacheInfo` 只有一处定义
- [ ] 所有导入路径正确
- [ ] TypeScript 编译无错误

---

*上下文创建日期: 2026-05-06*
