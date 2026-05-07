---
phase: 1
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - electron/main/ipc/handlers/download.handler.ts
  - src/services/wallpaper.service.ts
  - package.json
autonomous: true
requirements:
  - PERF-01
  - PERF-02
---

# Plan 1.1: 性能优化核心实现

<objective>
优化下载进度 IPC 更新频率（100ms → 300ms）和壁纸搜索缓存策略（使用 lru-cache），降低 IPC 压力并提升缓存效率。
</objective>

<tasks>

## Task 1: 降低下载进度 IPC 更新频率

**type:** execute

**objective:** 将下载进度更新间隔从 100ms 调整为 300ms，减少 IPC 调用频率。

<read_first>
- `electron/main/ipc/handlers/download.handler.ts` — 当前进度更新实现（第 456-498 行）
- `.planning/phases/01-performance-download-cache/01-RESEARCH.md` — 技术研究文档
</read_first>

<action>
1. 打开 `electron/main/ipc/handlers/download.handler.ts`
2. 定位到第 457 行附近的进度更新逻辑：
   ```typescript
   // Every 100ms update progress
   const now = Date.now()
   if (now - lastTime >= 100) {
   ```
3. 将注释修改为：`// Every 300ms update progress (PERF-01 optimization)`
4. 将间隔值从 `100` 修改为 `300`：
   ```typescript
   if (now - lastTime >= 300) {
   ```
5. 保存文件
</action>

<verify>
- 文件中包含 `if (now - lastTime >= 300)` 字符串
- 文件中包含 `// Every 300ms update progress` 注释
- TypeScript 编译无错误：`npm run typecheck` 命令退出码为 0
</verify>

<acceptance_criteria>
- `electron/main/ipc/handlers/download.handler.ts` 包含 `if (now - lastTime >= 300)`
- `electron/main/ipc/handlers/download.handler.ts` 包含 `PERF-01` 注释
- `npm run typecheck` 命令成功执行（退出码 0）
</acceptance_criteria>

---

## Task 2: 安装 lru-cache 依赖

**type:** execute

**objective:** 安装 lru-cache 库用于壁纸搜索缓存优化。

<read_first>
- `package.json` — 当前依赖列表
- `.planning/phases/01-performance-download-cache/01-RESEARCH.md` — lru-cache 版本信息
</read_first>

<action>
1. 在项目根目录执行：
   ```bash
   npm install lru-cache
   ```
2. 等待安装完成
3. 验证 `package.json` 中 `dependencies` 包含 `"lru-cache": "^11.x.x"`
</action>

<verify>
- `package.json` 的 `dependencies` 包含 `lru-cache`
- `node_modules/lru-cache` 目录存在
</verify>

<acceptance_criteria>
- `package.json` 包含 `"lru-cache"` 字符串
- `node_modules/lru-cache` 目录存在
</acceptance_criteria>

---

## Task 3: 重构壁纸搜索缓存实现

**type:** execute

**objective:** 使用 lru-cache 重构 WallpaperServiceImpl 缓存，实现基于内存大小的 LRU 策略和命中率监控。

<read_first>
- `src/services/wallpaper.service.ts` — 当前缓存实现（第 30-86 行）
- `.planning/phases/01-performance-download-cache/01-RESEARCH.md` — 推荐实现方案
</read_first>

<action>
1. 在文件顶部添加导入：
   ```typescript
   import { LRUCache } from 'lru-cache'
   ```

2. 在 `WallpaperServiceImpl` 类中：
   a. 删除以下属性：
      ```typescript
      private readonly CACHE_TTL = 5 * 60 * 1000
      private readonly MAX_CACHE_SIZE = 50
      ```

   b. 将 `private cache = new Map<string, CacheItem>()` 替换为：
      ```typescript
      private cache = new LRUCache<string, CacheItem>({
        max: 50 * 1024 * 1024,  // 50MB 内存限制
        ttl: 5 * 60 * 1000,     // 5 分钟 TTL
        sizeCalculation: (value: CacheItem) => {
          // 估算缓存项大小
          return JSON.stringify(value.data).length
        },
      })
      ```

   c. 添加命中率统计属性：
      ```typescript
      private hits = 0
      private misses = 0
      ```

3. 添加缓存统计方法（在 `clearCache` 方法后）：
   ```typescript
   /**
    * 获取缓存统计信息
    * @returns 缓存命中率和大小信息
    */
   getCacheStats(): { hits: number; misses: number; hitRate: number; size: number; calculatedSize: number } {
     return {
       hits: this.hits,
       misses: this.misses,
       hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
       size: this.cache.size,
       calculatedSize: this.cache.calculatedSize ?? 0,
     }
   }
   ```

4. 修改 `getFromCache` 方法：
   ```typescript
   private getFromCache<T>(key: string): T | null {
     const item = this.cache.get(key)
     if (item) {
       this.hits++
       return item.data as T
     }
     this.misses++
     return null
   }
   ```

5. 修改 `setCache` 方法：
   ```typescript
   private setCache(key: string, data: unknown): void {
     this.cache.set(key, {
       data,
       timestamp: Date.now(),
     })
   }
   ```

6. 保存文件
</action>

<verify>
- 文件包含 `import { LRUCache } from 'lru-cache'`
- 文件包含 `new LRUCache<string, CacheItem>`
- 文件包含 `getCacheStats` 方法
- 文件包含 `this.hits++` 和 `this.misses++`
- TypeScript 编译无错误
</verify>

<acceptance_criteria>
- `src/services/wallpaper.service.ts` 包含 `import { LRUCache } from 'lru-cache'`
- `src/services/wallpaper.service.ts` 包含 `new LRUCache<string, CacheItem>`
- `src/services/wallpaper.service.ts` 包含 `getCacheStats()` 方法定义
- `src/services/wallpaper.service.ts` 包含 `max: 50 * 1024 * 1024` 配置
- `npm run typecheck` 命令成功执行（退出码 0）
</acceptance_criteria>

---

## Task 4: 验证性能优化效果

**type:** verify

**objective:** 手动测试下载和搜索功能，验证优化后行为正确且性能提升。

<read_first>
- `.planning/phases/01-performance-download-cache/01-RESEARCH.md` — 验证策略
- `ROADMAP.md` — Phase 1 Verification 清单
</read_first>

<action>
1. 运行构建命令：
   ```bash
   npm run build
   ```

2. 启动开发模式：
   ```bash
   npm run dev
   ```

3. **测试下载功能：**
   - 搜索一个壁纸并开始下载
   - 观察进度条更新流畅度（应该仍然平滑）
   - 测试暂停/恢复功能
   - 测试取消功能
   - 验证下载完成的文件完整性

4. **测试搜索缓存：**
   - 搜索关键词 "nature"
   - 在浏览器控制台执行（开发模式）：
     ```javascript
     // 通过 window.__WALLPAPER_SERVICE__ 暴露（如果可用）
     // 或直接观察第二次搜索速度
     ```
   - 再次搜索相同关键词 "nature"
   - 观察第二次搜索应该更快（从缓存返回）

5. **记录测试结果**
</action>

<verify>
- 下载进度条更新流畅，无卡顿
- 暂停/恢复/取消功能正常
- 搜索功能正常
- 无运行时错误
</verify>

<acceptance_criteria>
- `npm run build` 命令成功执行（退出码 0）
- 下载功能正常（开始/暂停/恢复/取消）
- 进度更新流畅，无明显卡顿
- 搜索功能正常，第二次相同搜索更快
- 应用无崩溃和运行时错误
</acceptance_criteria>

</tasks>

<verification>

## 验证步骤

### 1. 代码验证

```bash
# TypeScript 类型检查
npm run typecheck

# 构建验证
npm run build
```

### 2. 功能验证

**下载功能测试清单:**
- [ ] 开始下载 — 进度条开始更新
- [ ] 进度更新 — 流畅度满意（300ms 间隔）
- [ ] 暂停下载 — 状态正确，文件保留
- [ ] 恢复下载 — 从断点继续
- [ ] 取消下载 — 临时文件删除
- [ ] 完成下载 — 文件完整

**搜索功能测试清单:**
- [ ] 首次搜索 — 正常返回结果
- [ ] 缓存命中 — 第二次相同搜索更快
- [ ] 缓存过期 — 5 分钟后重新请求（可选测试）

### 3. 性能验证

**IPC 调用频率:**
- 使用 Electron DevTools 观察 IPC 调用
- 预期：下载时约 3 次/秒（原 10 次/秒）

**缓存命中率:**
- 连续搜索相同关键词 3 次
- 预期命中率 > 50%

</verification>

<success_criteria>

## 成功标准

### 必须满足 (MUST)

- [x] PERF-01: 下载进度更新间隔调整为 300ms
- [x] PERF-02: 壁纸搜索使用 lru-cache 实现
- [x] 所有现有功能正常工作（下载、搜索、暂停/恢复/取消）
- [x] 无 TypeScript 编译错误
- [x] 无运行时错误或崩溃

### 应该满足 (SHOULD)

- [ ] 下载进度 UI 流畅度保持良好
- [ ] 缓存命中率可监控（通过 getCacheStats）
- [ ] 内存占用合理（不超过 50MB 缓存）

### 可选满足 (NICE)

- [ ] 添加缓存统计单元测试
- [ ] 在设置页面显示缓存统计

</success_criteria>

<must_haves>
Derived from Phase 1 goal: "优化下载进度 IPC 更新频率和壁纸搜索缓存策略"

1. **下载进度 IPC 频率优化** (PERF-01)
   - 验证标准: `download.handler.ts` 中进度更新间隔为 300ms
   - 回归测试: 下载流程（开始/暂停/恢复/取消）正常

2. **壁纸搜索缓存优化** (PERF-02)
   - 验证标准: `wallpaper.service.ts` 使用 `lru-cache`
   - 回归测试: 搜索功能正常，缓存命中统计可用
</must_haves>

---

*Plan created: 2026-05-06*
*Phase: 1 - 性能优化（下载与缓存）*
*Requirements: PERF-01, PERF-02*
