# Phase 1: 性能优化（下载与缓存）— 技术研究

**研究日期:** 2026-05-06
**Phase:** 1 - 性能优化（下载与缓存）
**需求 ID:** PERF-01, PERF-02

---

## 目录

1. [研究概述](#研究概述)
2. [PERF-01: IPC 进度更新优化](#perf-01-ipc-进度更新优化)
3. [PERF-02: 缓存策略改进](#perf-02-缓存策略改进)
4. [风险评估](#风险评估)
5. [验证策略](#验证策略)

---

## 研究概述

本阶段聚焦两个性能优化点：
1. **下载进度 IPC 更新频率** — 当前 100ms 间隔过高，导致 IPC 压力和渲染进程频繁重绘
2. **壁纸搜索缓存策略** — 当前实现简单，缺乏基于内存的 LRU 策略和命中率监控

---

## PERF-01: IPC 进度更新优化

### 当前实现分析

**文件:** `electron/main/ipc/handlers/download.handler.ts`
**位置:** 第 456-498 行

```typescript
// 当前实现 (line 456-498)
response.data.on('data', (chunk: Buffer) => {
  downloadedSize += chunk.length

  // ... tracking logic ...

  // Every 100ms update progress
  const now = Date.now()
  if (now - lastTime >= 100) {
    const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
    const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0

    // Send progress to renderer
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('download-progress', {
        taskId,
        progress: Math.min(progress, 99),
        offset: downloadedSize,
        speed,
        state: 'downloading',
        totalSize,
      })
    }

    // ... state persistence ...

    lastTime = now
    lastSize = downloadedSize
  }
})
```

### 问题分析

1. **IPC 调用频率过高**：每 100ms 一次，对于高速下载可能每秒发送 10 次 IPC 消息
2. **渲染进程负担**：每次 IPC 触发 Vue 响应式更新和 DOM 重绘
3. **UI 感知阈值**：用户难以感知 100ms vs 300ms 的进度更新差异

### 优化方案

**方案 A: 固定间隔增加 (推荐)**

```typescript
// 修改常量
const PROGRESS_UPDATE_INTERVAL_MS = 300  // 从 100ms 改为 300ms

// 修改检查逻辑
if (now - lastTime >= PROGRESS_UPDATE_INTERVAL_MS) {
  // ... 发送进度 ...
}
```

**优点:**
- 实现简单，改动最小
- 减少 66% 的 IPC 调用
- UI 流畅度不受影响（300ms 仍然足够平滑）

**方案 B: 动态节流**

```typescript
// 根据下载速度动态调整
const getProgressInterval = (speed: number): number => {
  if (speed > 10 * 1024 * 1024) return 500  // >10MB/s: 500ms
  if (speed > 5 * 1024 * 1024) return 300   // >5MB/s: 300ms
  return 200                                 // 默认 200ms
}
```

**优点:**
- 自适应下载速度
- 高速下载时减少 IPC，低速时保持精度

**缺点:**
- 增加复杂度
- 可能引入不一致行为

### 推荐方案

**采用方案 A（固定间隔 300ms）**

理由：
1. 简单可靠，风险最低
2. 满足需求文档要求（200-500ms 范围）
3. 不改变现有逻辑结构

### 影响分析

**GitNexus Impact 结果:**
- Target: `executeDownload`
- Risk: **LOW**
- Direct callers: `executeWithRetry`
- Affected processes: 4 (ExecuteWithRetry → shouldPersistState, writeStateFile, etc.)

**结论:** 修改范围有限，仅影响下载进度更新逻辑，不影响暂停/恢复/取消流程。

---

## PERF-02: 缓存策略改进

### 当前实现分析

**文件:** `src/services/wallpaper.service.ts`
**位置:** 第 30-86 行

```typescript
class WallpaperServiceImpl {
  /** 缓存存储 */
  private cache = new Map<string, CacheItem>()

  /** 缓存有效期：5分钟 */
  private readonly CACHE_TTL = 5 * 60 * 1000

  /** 最大缓存条数 */
  private readonly MAX_CACHE_SIZE = 50

  private setCache(key: string, data: unknown): void {
    // 限制缓存大小，超过限制时删除最旧条目
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
}
```

### 问题分析

1. **LRU 策略简单**：仅删除 Map 的第一个条目，不是真正的 LRU
2. **固定条数限制**：不考虑内存占用，可能占用过多或过少内存
3. **无监控能力**：无法获知缓存命中率，难以评估效果
4. **TTL 固定**：所有数据类型使用相同的 5 分钟 TTL

### 优化方案

**方案: 使用 lru-cache 库**

```typescript
import { LRUCache } from 'lru-cache'

class WallpaperServiceImpl {
  private cache = new LRUCache<string, CacheItem>({
    max: 50 * 1024 * 1024,  // 50MB 内存限制
    ttl: 5 * 60 * 1000,     // 5 分钟 TTL
    sizeCalculation: (value: CacheItem) => {
      // 估算缓存项大小
      return JSON.stringify(value.data).length
    },
  })

  // 缓存命中统计
  private hits = 0
  private misses = 0

  getCacheStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0,
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
    }
  }
}
```

### lru-cache 特性

**版本:** 11.3.6 (最新稳定版)

**关键 API:**
- `max`: 最大条目数或内存大小
- `ttl`: 生存时间（毫秒）
- `sizeCalculation`: 自定义大小计算函数
- `calculatedSize`: 当前已使用的计算大小

**内存限制示例:**
```typescript
// 按内存大小限制（推荐）
new LRUCache({
  max: 50 * 1024 * 1024,  // 50MB
  sizeCalculation: (value) => estimateSize(value),
})

// 按条目数限制
new LRUCache({
  max: 100,  // 最多 100 个条目
})
```

### 推荐方案

**使用 lru-cache，按内存大小限制（50MB），保持 5 分钟 TTL**

```typescript
// 配置参数
const CACHE_CONFIG = {
  maxSize: 50 * 1024 * 1024,  // 50MB
  ttl: 5 * 60 * 1000,         // 5 分钟
}
```

### 命中率监控

**接口定义:**

```typescript
interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  calculatedSize: number
}

// 添加到 WallpaperServiceImpl
getCacheStats(): CacheStats
```

**使用场景:**
- 开发调试时监控缓存效率
- 可选：在设置页面显示缓存统计（后续阶段）

### 影响分析

**GitNexus Impact 结果:**
- Target: `WallpaperServiceImpl`
- Risk: **LOW**
- Direct callers: `src/services/index.ts` (重导出)
- Affected modules: 12 个 composables、stores、views 间接使用

**结论:** 修改仅限于 `WallpaperServiceImpl` 内部实现，外部 API 不变，风险低。

---

## 风险评估

### GitNexus 影响分析汇总

| 修改点 | 文件 | 风险级别 | 直接调用者 | 影响进程数 |
|--------|------|----------|------------|------------|
| `executeDownload` 进度间隔 | `download.handler.ts` | LOW | `executeWithRetry` | 4 |
| `WallpaperServiceImpl` 缓存 | `wallpaper.service.ts` | LOW | `services/index.ts` | 0 |

### 脆弱区域检查

根据 `.planning/codebase/CONCERNS.md`，下载队列系统是高风险区域：

**下载队列系统风险因素:**
- 状态同步复杂（主进程 ↔ 渲染进程）
- 重试逻辑分散
- 多处定时器管理
- 并发控制敏感

**缓解措施:**
1. 仅修改进度更新间隔，不触碰核心队列逻辑
2. 保持暂停/恢复/取消流程不变
3. 完整测试下载流程（开始/暂停/恢复/取消）

### 修改前后对比

| 修改点 | 修改前 | 修改后 | 影响范围 |
|--------|--------|--------|----------|
| 进度更新间隔 | 100ms | 300ms | 仅影响 IPC 调用频率 |
| 缓存实现 | 简单 Map | lru-cache | 仅影响内部实现 |
| 缓存限制 | 50 条目 | 50MB 内存 | 更合理的内存控制 |
| 监控能力 | 无 | 命中率统计 | 新增功能 |

---

## 验证策略

### PERF-01 验证

**手动测试场景:**

1. **正常下载**
   - 开始下载一个壁纸
   - 观察进度条更新流畅度
   - 验证最终文件完整性

2. **暂停/恢复**
   - 下载过程中暂停
   - 等待 5 秒后恢复
   - 验证断点续传正确性

3. **取消下载**
   - 下载过程中取消
   - 验证临时文件已删除

4. **多任务并发**
   - 同时开始 3 个下载
   - 验证队列管理正确
   - 验证进度更新独立

**性能验证:**

```bash
# 下载一个大文件（>100MB）
# 观察 IPC 调用频率（Electron DevTools）
# 预期：从 ~10 次/秒 降低到 ~3 次/秒
```

### PERF-02 验证

**功能测试:**

1. **缓存命中**
   ```typescript
   // 搜索相同关键词两次
   const result1 = await wallpaperService.search({ q: 'nature' })
   const result2 = await wallpaperService.search({ q: 'nature' })

   // 验证第二次是从缓存返回
   const stats = wallpaperService.getCacheStats()
   console.log('Hit rate:', stats.hitRate)  // 预期: 0.5 或更高
   ```

2. **缓存过期**
   - 搜索后等待 5 分钟
   - 再次搜索，验证重新请求 API

3. **内存限制**
   - 连续搜索大量不同关键词
   - 观察内存占用不超过 50MB

**单元测试 (可选):**

```typescript
describe('WallpaperService Cache', () => {
  it('should return cached result on second call', async () => {
    // ...
  })

  it('should evict entries when max size reached', async () => {
    // ...
  })

  it('should track hit rate correctly', () => {
    // ...
  })
})
```

### 集成验证

**测试命令:**

```bash
# 1. 类型检查
npm run typecheck

# 2. 构建
npm run build

# 3. 启动应用并手动测试
npm run dev
```

**验证清单:**

- [ ] 下载功能正常（开始/暂停/恢复/取消）
- [ ] 进度更新流畅，无卡顿
- [ ] 搜索功能正常
- [ ] 缓存命中统计可用
- [ ] 内存占用合理
- [ ] 无 TypeScript 编译错误
- [ ] 无运行时错误

---

## 附录: 代码变更摘要

### PERF-01 变更

**文件:** `electron/main/ipc/handlers/download.handler.ts`

```diff
  response.data.on('data', (chunk: Buffer) => {
    downloadedSize += chunk.length

    // ... tracking logic ...

-   // Every 100ms update progress
+   // Every 300ms update progress (PERF-01 optimization)
    const now = Date.now()
-   if (now - lastTime >= 100) {
+   if (now - lastTime >= 300) {
      // ... 发送进度 ...
    }
  })
```

### PERF-02 变更

**文件:** `src/services/wallpaper.service.ts`

```diff
+ import { LRUCache } from 'lru-cache'

  class WallpaperServiceImpl {
-   private cache = new Map<string, CacheItem>()
+   private cache = new LRUCache<string, CacheItem>({
+     max: 50 * 1024 * 1024,  // 50MB
+     ttl: 5 * 60 * 1000,
+     sizeCalculation: (value) => JSON.stringify(value.data).length,
+   })

-   private readonly CACHE_TTL = 5 * 60 * 1000
-   private readonly MAX_CACHE_SIZE = 50

+   private hits = 0
+   private misses = 0

+   getCacheStats(): CacheStats {
+     return {
+       hits: this.hits,
+       misses: this.misses,
+       hitRate: this.hits / (this.hits + this.misses) || 0,
+       size: this.cache.size,
+       calculatedSize: this.cache.calculatedSize,
+     }
+   }

    private getFromCache<T>(key: string): T | null {
-     const item = this.cache.get(key)
-     if (!item) return null
-     if (Date.now() - item.timestamp > this.CACHE_TTL) {
-       this.cache.delete(key)
-       return null
-     }
-     return item.data as T
+     const item = this.cache.get(key)
+     if (item) {
+       this.hits++
+       return item.data as T
+     }
+     this.misses++
+     return null
    }

    private setCache(key: string, data: unknown): void {
-     if (this.cache.size >= this.MAX_CACHE_SIZE) {
-       const firstKey = this.cache.keys().next().value
-       if (firstKey) {
-         this.cache.delete(firstKey)
-       }
-     }
-     this.cache.set(key, { data, timestamp: Date.now() })
+     this.cache.set(key, { data, timestamp: Date.now() })
    }
  }
```

**新依赖:**

```bash
npm install lru-cache
```

---

## 研究结论

两个优化点均为 **LOW 风险**，修改范围有限且可控：

1. **PERF-01**: 仅修改进度更新间隔常量，不影响下载核心逻辑
2. **PERF-02**: 仅重构缓存实现，API 保持不变

**建议执行顺序:**
1. 先实现 PERF-01（简单，影响大）
2. 再实现 PERF-02（需要安装依赖）
3. 最后验证整体效果

---

*研究完成时间: 2026-05-06*
