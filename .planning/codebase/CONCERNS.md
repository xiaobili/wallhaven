# 技术债务与问题清单

> 分析日期: 2026-05-06
> 分析范围: Wallhaven 壁纸浏览器完整代码库

---

## 目录

1. [安全性问题](#安全性问题)
2. [性能问题](#性能问题)
3. [代码质量问题](#代码质量问题)
4. [架构债务](#架构债务)
5. [脆弱区域](#脆弱区域)
6. [已知 Bug](#已知-bug)
7. [待优化项](#待优化项)

---

## 安全性问题

### CRITICAL-01: API Key 明文存储

**位置**: `src/repositories/settings.repository.ts`, `electron/main/database.ts`

**描述**: API Key 以明文形式存储在 SQLite 数据库中，没有加密保护。如果用户配置了 Wallhaven API Key，任何能访问数据库文件的人都可读取。

**影响**:
- 用户 API Key 泄露风险
- 可能导致第三方服务滥用

**建议**:
- 使用 Electron 的 `safeStorage` API 加密敏感数据
- 或使用系统级密钥存储（如 macOS Keychain、Windows Credential Manager）

---

### MEDIUM-01: 自定义协议未做路径验证

**位置**: `electron/main/index.ts:24-66` (`registerLocalFileProtocol`)

**描述**: `wallhaven://` 协议处理本地文件请求时，只检查文件是否存在，未对路径进行安全校验。

```typescript
const filePath = decodeURIComponent(url)
// 没有检查路径是否在预期目录内
```

**风险**:
- 可能被利用访问应用目录外的文件
- 路径遍历攻击风险

**建议**:
- 添加路径白名单验证
- 限制只能访问下载目录和缓存目录

---

### LOW-01: 过多 console.log 输出

**位置**: 全局（见 Grep 结果）

**描述**: 生产代码中保留了大量 `console.log` 调试输出，包括：
- Preload 脚本每个 IPC 调用都输出日志
- Store 操作日志
- 下载进度日志

**风险**:
- 泄露应用内部状态信息
- 影响性能（I/O 开销）
- 暴露用户操作路径

**建议**:
- 实现日志级别控制
- 生产环境禁用 DEBUG 级别日志
- 使用统一的日志模块

---

## 性能问题

### HIGH-01: 下载进度更新频率过高

**位置**: `electron/main/ipc/handlers/download.handler.ts:456-498`

**描述**: 下载进度每 100ms 通过 IPC 发送到渲染进程，高频 IPC 调用可能导致：

```typescript
if (now - lastTime >= 100) {
  // 每 100ms 发送进度更新
  windows[0].webContents.send('download-progress', {...})
}
```

**影响**:
- IPC 通道压力大
- 渲染进程频繁重渲染
- CPU 使用率上升

**建议**:
- 将更新间隔调整为 200-500ms
- 使用节流/防抖优化
- 考虑批量更新策略

---

### MEDIUM-02: 壁纸搜索结果缓存策略简单

**位置**: `src/services/wallpaper.service.ts:30-86`

**描述**: 缓存实现存在以下问题：

```typescript
private cache = new Map<string, CacheItem>()
private readonly CACHE_TTL = 5 * 60 * 1000  // 5 分钟固定 TTL
private readonly MAX_CACHE_SIZE = 50        // 硬编码上限
```

**问题**:
- 固定 TTL 不考虑数据类型差异
- LRU 策略简单（只删除第一个条目）
- 无内存使用监控

**建议**:
- 实现基于内存占用的缓存策略
- 添加缓存命中率监控
- 考虑使用成熟的缓存库（如 lru-cache）

---

### MEDIUM-03: 收藏状态批量查询未优化

**位置**: `src/services/wallpaper.service.ts:130-143`

**描述**: 搜索结果注入收藏状态时，每次都查询所有壁纸 ID 的状态：

```typescript
const wallpaperIds = result.data.data.map((item) => item.id)
const statusMapResult = await favoritesRepository.getFavoriteStatusMap(wallpaperIds)
```

**影响**:
- 每次搜索都触发数据库查询
- 未利用前端缓存

**建议**:
- 实现前端收藏状态缓存
- 使用增量更新策略
- 考虑在 WallpaperItem 类型中持久化收藏状态

---

### LOW-02: 图片尺寸解析可能失败

**位置**: `electron/main/ipc/handlers/base.ts:19-101` (`getImageDimensions`)

**描述**: 图片尺寸解析在失败时返回 `{ width: 0, height: 0 }`，但调用方未处理此情况：

```typescript
// WebP 需要更多字节，直接返回 0
if (...) {
  width = 0
  height = 0
}
```

**影响**:
- UI 显示异常
- 性能统计不准确

**建议**:
- 使用 sharp 库进行可靠解析（已依赖）
- 或添加格式特定的解析逻辑

---

## 代码质量问题

### HIGH-02: 错误处理不一致

**位置**: 多处

**描述**: 错误处理模式混乱，存在多种风格：

1. **返回 error 对象**:
```typescript
return { success: false, error: { code: 'XXX', message: '...' } }
```

2. **返回 error 字符串**:
```typescript
return { success: false, error: '简单错误消息' }
```

3. **混合使用**:
```typescript
return { success: false, error: result.error?.message || '默认消息' }
```

**影响**:
- 调用方需要处理多种错误格式
- 类型不安全
- 调试困难

**建议**:
- 统一使用 `IpcErrorInfo` 类型
- 在所有 IPC handler 中使用一致的错误格式
- 利用已有的 `AppError` 错误类体系

---

### MEDIUM-04: 类型定义分散

**位置**: `src/types/` 目录

**描述**: 类型定义分散在多个文件中：
- `src/types/index.ts` - 重导出入口
- `src/types/ipc.ts` - IPC 相关类型
- `src/types/domain/*.ts` - 领域类型

虽然结构清晰，但存在重复定义：
- `DownloadProgressData` 在 `ipc.ts` 和 `download.service.ts` 中都有定义
- `CacheInfo` 在多处重复定义

**建议**:
- 统一类型定义位置
- 消除重复定义
- 使用 TypeScript 的 declaration merging 或命名空间

---

### MEDIUM-05: 异步操作缺少取消机制

**位置**: `src/services/wallpaper.service.ts`, `src/composables/`

**描述**: 多数异步操作没有取消机制：

```typescript
async search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>> {
  // 无法取消正在进行的搜索
  const result = await apiClient.get<WallpaperSearchResult>('/search', ...)
}
```

**影响**:
- 组件卸载时请求继续执行
- 竞态条件风险
- 内存泄漏风险

**建议**:
- 使用 AbortController 取消机制
- 在 Vue composables 的 onUnmounted 中清理

---

### LOW-03: 硬编码魔法值

**位置**: 多处

**示例**:
```typescript
// download.handler.ts
const BACKOFF_BASE_MS = 2000
const BACKOFF_MAX_MS = 30000
const MAX_RETRIES = 3

// wallpaper.service.ts
private readonly CACHE_TTL = 5 * 60 * 1000
private readonly MAX_CACHE_SIZE = 50

// database.ts
const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000
const WAL_SIZE_THRESHOLD_BYTES = 10 * 1024 * 1024
```

**建议**:
- 将配置值集中到配置文件
- 考虑用户可配置选项

---

## 架构债务

### MEDIUM-06: 服务层职责边界模糊

**描述**: `Repository` 和 `Service` 层职责重叠：

```typescript
// favorites.service.ts 调用 favoritesRepository
// 但 download.service.ts 直接调用 electronClient

// 有的 service 有缓存
private cachedFavorites: FavoriteItem[] | null = null

// 有的 service 没有缓存，直接透传
async getByCollection(collectionId: string) {
  return favoritesRepository.getFavorites(collectionId)
}
```

**问题**:
- 职责划分不清晰
- 缓存策略不一致
- 难以统一测试

**建议**:
- 明确 Service 职责：业务逻辑 + 缓存 + 错误转换
- Repository 职责：数据访问 + 持久化
- 统一缓存策略

---

### MEDIUM-07: 状态管理分散

**描述**: 应用状态分散在多处：

1. **Pinia Store**: `useDownloadStore`, `useWallpaperStore`
2. **Service 缓存**: `favoritesService.cachedFavorites`, `wallpaperService.cache`
3. **组件本地状态**: 各 Vue 组件

**问题**:
- 状态同步困难
- 缓存失效逻辑分散
- 调试复杂

**建议**:
- 统一状态管理策略
- 考虑所有缓存放入 Store
- 或使用单一数据源原则

---

### LOW-04: IPC 通道命名不一致

**位置**: `src/types/ipc.ts`

**描述**: IPC 通道命名风格混合：

```typescript
// kebab-case
SELECT_FOLDER: 'select-folder',
DOWNLOAD_WALLPAPER: 'download-wallpaper',

// 短横线
START_DOWNLOAD_TASK: 'start-download-task',

// 完全不同的风格
FAVORITES_GET_COLLECTIONS: 'favorites-get-collections',
```

**建议**:
- 统一使用 kebab-case 命名
- 或采用命名空间格式如 `favorites:get-collections`

---

## 脆弱区域

### 高风险修改区域

#### 1. 下载队列系统

**相关文件**:
- `electron/main/ipc/handlers/download.handler.ts`
- `electron/main/ipc/handlers/download-queue.ts`
- `src/composables/download/useDownload.ts`
- `src/stores/modules/download/index.ts`

**风险因素**:
- 状态同步复杂（主进程 ↔ 渲染进程）
- 重试逻辑分散
- 多处定时器管理
- 并发控制敏感

**修改建议**:
- 任何修改前必须运行完整下载测试
- 验证暂停/恢复/取消各场景
- 测试边界条件（网络中断、应用关闭）

---

#### 2. 收藏功能

**相关文件**:
- `src/repositories/favorites.repository.ts`
- `src/services/favorites.service.ts`
- `src/composables/favorites/useCollections.ts`
- `electron/main/ipc/handlers/index.ts` (favorites handlers)

**风险因素**:
- SQLite 外键约束
- 默认收藏夹不可删除逻辑
- 分页查询性能
- 状态同步（多处使用收藏状态）

---

#### 3. 数据迁移

**相关文件**:
- `electron/main/database.ts`
- `electron/main/migration.ts`

**风险因素**:
- 用户数据丢失风险
- 版本兼容性
- 迁移失败回滚

---

## 已知 Bug

### BUG-01: 状态文件清理竞态条件

**位置**: `electron/main/ipc/handlers/download.handler.ts:1029-1068`

**描述**: `GET_PENDING_DOWNLOADS` handler 扫描过程中删除无效状态文件，但可能与其他操作产生竞态：

```typescript
// 扫描并删除无效文件
if (result.error === 'PARSE_ERROR') {
  fs.unlinkSync(statePath) // 可能与正在进行的下载冲突
}
```

**状态**: 未修复

---

### BUG-02: 暂停时 URL 丢失

**位置**: `electron/main/ipc/handlers/download.handler.ts:848-859`

**描述**: 暂停下载时，状态文件中 URL 字段设为空字符串：

```typescript
const state: PendingDownload = {
  taskId,
  url: '', // URL not stored in ActiveDownload
  ...
}
```

**影响**: 恢复下载依赖渲染进程补充 URL，如果应用重启后恢复，可能无法正确恢复。

**状态**: 已知问题，代码注释中标注

---

### BUG-03: WebP 尺寸解析失败

**位置**: `electron/main/ipc/handlers/base.ts:78-81`

**描述**: WebP 格式图片尺寸解析直接返回 0：

```typescript
// WebP needs more bytes, simply return 0
width = 0
height = 0
```

**影响**: 本地壁纸列表中 WebP 图片尺寸显示不正确

**状态**: 未修复

---

## 待优化项

### 低优先级优化

1. **日志系统重构**
   - 实现分级日志
   - 添加日志文件输出
   - 生产环境过滤敏感信息

2. **类型系统增强**
   - 消除 `any` 类型使用
   - 添加更严格的类型守卫
   - 使用 branded types 区分相似类型

3. **测试覆盖率提升**
   - 添加服务层单元测试
   - 添加 IPC handler 集成测试
   - 添加 E2E 下载流程测试

4. **国际化准备**
   - 抽取硬编码中文字符串
   - 使用 i18n 库
   - 支持多语言切换

5. **Electron 安全加固**
   - 启用 contextIsolation（已启用）
   - 禁用 nodeIntegration（已禁用）
   - 添加 CSP 配置
   - 使用沙箱模式

---

## 文档更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-05-06 | 1.0.0 | 初始版本，完成完整代码库分析 |

---

*此文档应随代码更新同步维护。发现新问题时请及时添加。*
