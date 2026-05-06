---
phase: 3
plan: 1
type: implementation
wave: 1
depends_on: []
files_modified:
  - src/types/ipc.ts
  - src/services/download.service.ts
  - src/repositories/settings.repository.ts
  - electron/main/ipc/handlers/download.handler.ts
  - electron/main/ipc/handlers/wallpaper.handler.ts
  - electron/main/ipc/handlers/store.handler.ts
  - electron/main/ipc/handlers/file.handler.ts
  - electron/main/ipc/handlers/cache.handler.ts
  - electron/main/ipc/handlers/api.handler.ts
  - src/errors/index.ts
autonomous: true
requirements:
  - QUAL-01
  - QUAL-02
---

# Phase 3 Plan: 代码质量（错误处理与类型）

## Objective

统一错误处理格式和消除类型定义重复，提升代码质量和可维护性。

**覆盖需求:**
- QUAL-01: 统一错误处理格式
- QUAL-02: 消除类型定义重复

---

## Tasks

### Task 3.1: 统一错误处理格式

**类型:** refactoring
**文件:**
- `electron/main/ipc/handlers/download.handler.ts`
- `electron/main/ipc/handlers/wallpaper.handler.ts`
- `electron/main/ipc/handlers/store.handler.ts`
- `electron/main/ipc/handlers/file.handler.ts`
- `electron/main/ipc/handlers/cache.handler.ts`
- `electron/main/ipc/handlers/api.handler.ts`
- `src/errors/index.ts`

**Action:**

#### 步骤 1: 创建错误码常量和辅助函数

在 `src/errors/index.ts` 中添加：

```typescript
// 错误码常量
export const IPC_ERROR_CODES = {
  // 通用错误
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // 文件操作
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_DELETE_FAILED: 'FILE_DELETE_FAILED',

  // 下载相关
  DOWNLOAD_PATH_NOT_SET: 'DOWNLOAD_PATH_NOT_SET',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',

  // 壁纸设置
  WALLPAPER_FILE_NOT_FOUND: 'WALLPAPER_FILE_NOT_FOUND',
  WALLPAPER_MODULE_ERROR: 'WALLPAPER_MODULE_ERROR',
} as const

// 创建标准错误响应的辅助函数
export function createErrorResponse(
  code: string,
  message: string
): { success: false; error: IpcErrorInfo }
```

#### 步骤 2: 更新 download.handler.ts

修改以下错误返回：

| 行号 | 当前代码 | 修改为 |
|------|---------|--------|
| 119 | `return { success: false, error: 'NOT_FOUND' }` | `return createErrorResponse(IPC_ERROR_CODES.NOT_FOUND, '下载状态文件不存在')` |
| 126 | `return { success: false, error: 'VALIDATION_ERROR' }` | `return createErrorResponse(IPC_ERROR_CODES.VALIDATION_ERROR, '下载状态文件格式无效')` |
| 131 | `return { success: false, error: 'PARSE_ERROR' }` | `return createErrorResponse(IPC_ERROR_CODES.PARSE_ERROR, '下载状态文件解析失败')` |

#### 步骤 3: 更新 wallpaper.handler.ts

修改以下错误返回：

| 行号 | 当前代码 | 修改为 |
|------|---------|--------|
| 17 | `return { success: false, error: '图片文件不存在' }` | `return createErrorResponse(IPC_ERROR_CODES.WALLPAPER_FILE_NOT_FOUND, '图片文件不存在')` |
| 31 | `return { success: false, error: \`wallpaper 模块加载失败: ...\` }` | `return createErrorResponse(IPC_ERROR_CODES.WALLPAPER_MODULE_ERROR, \`wallpaper 模块加载失败: ${importError.message}\`)` |
| 39 | `return { success: false, error: error.message }` | `return createErrorResponse(IPC_ERROR_CODES.INTERNAL_ERROR, error.message)` |

#### 步骤 4: 更新 store.handler.ts

修改以下错误返回（4 处）：
- 统一使用 `createErrorResponse(IPC_ERROR_CODES.INTERNAL_ERROR, error.message)`

#### 步骤 5: 更新 file.handler.ts

修改以下错误返回：

| 行号 | 当前代码 | 修改为 |
|------|---------|--------|
| 92 | `return { success: false, error: '文件不存在' }` | `return createErrorResponse(IPC_ERROR_CODES.FILE_NOT_FOUND, '文件不存在')` |
| 99 | `return { success: false, error: error.message }` | `return createErrorResponse(IPC_ERROR_CODES.FILE_DELETE_FAILED, error.message)` |
| 125 | `return { success: false, error: error.message }` | `return createErrorResponse(IPC_ERROR_CODES.INTERNAL_ERROR, error.message)` |

#### 步骤 6: 更新 cache.handler.ts

检查并统一错误返回格式。

#### 步骤 7: 更新 api.handler.ts

检查并统一错误返回格式。

**Verify:**

```bash
# 1. TypeScript 类型检查
npx tsc --noEmit

# 2. 搜索确认无遗漏的字符串错误
grep -r "success: false, error: '" electron/main/ipc/handlers/ | grep -v "code:" || echo "全部统一"

# 3. GitNexus 变更检测
# 通过 gitnexus_detect_changes 确认修改范围
```

**Acceptance Criteria:**

- [ ] 所有 IPC handlers 使用 `IpcErrorInfo` 格式
- [ ] 错误码使用常量定义
- [ ] 无硬编码字符串错误
- [ ] TypeScript 编译通过

---

### Task 3.2: 消除类型定义重复

**类型:** refactoring
**文件:**
- `src/services/download.service.ts`
- `src/repositories/settings.repository.ts`

**Action:**

#### 步骤 1: 删除 download.service.ts 中的重复类型

**修改文件:** `src/services/download.service.ts`

1. 删除第 14-29 行的 `DownloadProgressData` 接口定义
2. 在文件顶部添加导入：

```typescript
import type {
  IpcResponse,
  PendingDownload,
  ResumeDownloadParams,
  DownloadProgressData  // 添加此导入
} from '@/types/ipc'
```

3. 删除本地 `DownloadProgressData` 定义

#### 步骤 2: 删除 settings.repository.ts 中的重复类型

**修改文件:** `src/repositories/settings.repository.ts`

1. 删除第 10-14 行的 `CacheInfo` 接口定义
2. 在文件顶部添加导入：

```typescript
import type { IpcResponse, LocalFile, CacheInfo } from '@/types/ipc'
```

3. 保留 `ClearCacheResult` 类型（这是本地特有类型，不重复）

**Verify:**

```bash
# 1. TypeScript 类型检查
npx tsc --noEmit

# 2. 确认无重复定义
grep -n "interface DownloadProgressData" src/ -r
grep -n "interface CacheInfo" src/ -r

# 3. GitNexus 变更检测
```

**Acceptance Criteria:**

- [ ] `DownloadProgressData` 只在 `src/types/ipc.ts` 定义
- [ ] `CacheInfo` 只在 `src/types/ipc.ts` 定义
- [ ] 所有导入路径正确
- [ ] TypeScript 编译无错误

---

### Task 3.3: 验证错误处理和类型系统

**类型:** verification
**文件:**
- 无修改（验证任务）

**Action:**

#### 步骤 1: 运行 TypeScript 类型检查

```bash
npx tsc --noEmit
```

#### 步骤 2: 运行构建

```bash
npm run build
```

#### 步骤 3: 功能测试

测试以下场景：
1. **错误场景测试**
   - 设置壁纸时选择不存在的文件
   - 删除不存在的文件
   - 打开不存在的目录

2. **类型系统测试**
   - 下载功能正常
   - 缓存信息显示正常
   - 收藏功能正常

#### 步骤 4: GitNexus 变更检测

运行 `gitnexus_detect_changes` 确认：
- 修改文件符合预期
- 无意外影响其他执行流程

**Verify:**

```bash
# 确认所有验证通过
npm run build && echo "构建成功"
```

**Acceptance Criteria:**

- [ ] TypeScript 编译无错误
- [ ] 构建成功
- [ ] 错误信息对用户友好
- [ ] 所有功能正常工作
- [ ] GitNexus 变更检测通过

---

## Verification

### 整体验证步骤

1. **代码质量验证**
   ```bash
   npx tsc --noEmit
   npm run build
   ```

2. **功能回归测试**
   - 下载功能：启动、暂停、恢复、取消
   - 壁纸设置：选择文件、设置壁纸
   - 文件操作：删除、打开目录
   - 缓存管理：获取信息、清理缓存
   - 收藏功能：添加、删除、移动

3. **错误处理验证**
   - 触发各类错误场景
   - 确认错误信息格式统一
   - 确认错误码正确

---

## Success Criteria

- [ ] 所有 IPC handlers 返回 `IpcErrorInfo` 格式的错误
- [ ] 错误码使用常量定义，无硬编码字符串
- [ ] `DownloadProgressData` 只有一处定义
- [ ] `CacheInfo` 只有一处定义
- [ ] TypeScript 编译无错误
- [ ] 构建成功
- [ ] 所有功能正常工作
- [ ] GitNexus 变更检测确认修改范围正确

---

## Risk Mitigation

| 风险 | 缓解措施 |
|------|----------|
| 错误格式变更影响调用方 | 保持错误消息语义不变，仅格式统一 |
| 类型导入遗漏 | TypeScript 编译检查 + Grep 搜索确认 |
| 功能回归 | 完整的功能测试流程 |

---

*计划创建日期: 2026-05-06*
