# Phase 2 Plan: 性能优化（查询与解析）

**阶段编号:** 02
**阶段名称:** 性能优化（查询与解析）
**预计任务数:** 3
**创建日期:** 2026-05-06
**关联需求:** PERF-03, PERF-04

---

## 目标

优化收藏状态批量查询和图片尺寸解析，提升用户体验和系统可靠性。

---

## 前置条件

- [x] Phase 1 已完成
- [x] GitNexus 索引是最新的
- [x] 研究文档已完成（02-RESEARCH.md）

---

## 风险评估

| 修改点 | 风险等级 | 影响范围 | 缓解措施 |
|--------|----------|----------|----------|
| `getImageDimensions` | LOW | 本地壁纸浏览 | 使用 sharp 库，错误时返回 0x0 |
| `wallpaperService.search` | LOW | 在线壁纸搜索 | 前端缓存策略，失败时回退到原始查询 |

---

## 执行计划

### Task 2.1: 实现前端收藏状态缓存

**目标:** 减少收藏状态数据库查询次数

**执行步骤:**

#### Step 1: 添加收藏状态缓存机制

**文件:** `src/services/wallpaper.service.ts`

**修改内容:**

1. 添加私有缓存属性:
```typescript
/** 收藏状态缓存 (PERF-03) */
private favoriteStatusCache = new Map<string, 0 | 1 | 2>()
```

2. 添加缓存清除方法:
```typescript
/**
 * 清除收藏状态缓存
 */
clearFavoriteStatusCache(): void {
  this.favoriteStatusCache.clear()
}
```

3. 修改 `search()` 方法中的收藏状态注入逻辑:
```typescript
// 注入收藏状态
if (result.data.data.length > 0) {
  const wallpaperIds = result.data.data.map((item) => item.id)

  // 分离已缓存和未缓存的 ID
  const cachedStatus: Record<string, 0 | 1 | 2> = {}
  const uncachedIds: string[] = []

  for (const id of wallpaperIds) {
    if (this.favoriteStatusCache.has(id)) {
      cachedStatus[id] = this.favoriteStatusCache.get(id)!
    } else {
      uncachedIds.push(id)
    }
  }

  // 只查询未缓存的 ID
  if (uncachedIds.length > 0) {
    const statusMapResult = await favoritesRepository.getFavoriteStatusMap(uncachedIds)
    if (statusMapResult.success && statusMapResult.data) {
      // 更新缓存
      for (const [id, status] of Object.entries(statusMapResult.data)) {
        this.favoriteStatusCache.set(id, status)
      }
    }
  }

  // 合并缓存和查询结果
  const statusMap = { ...cachedStatus }
  for (const [id, status] of this.favoriteStatusCache) {
    if (wallpaperIds.includes(id)) {
      statusMap[id] = status
    }
  }

  result.data.data = result.data.data.map((item) => ({
    ...item,
    is_favorite: statusMap[item.id] ?? 0,
  }))
}
```

**GitNexus 影响分析:**
- 目标: `wallpaperService`
- 风险: LOW
- 直接调用方: 无（通过 Service 接口调用）
- 验证: 在线壁纸搜索功能

**提交信息:**
```
feat(perf): 添加收藏状态前端缓存以减少数据库查询

- 在 WallpaperService 中添加 favoriteStatusCache Map
- 实现增量查询策略（只查询未缓存的 ID）
- 添加 clearFavoriteStatusCache() 方法

PERF-03
```

#### Step 2: 在收藏操作后清除缓存

**文件:** `src/composables/favorites/useFavorites.ts`

**修改内容:**

在 `add()`, `remove()`, `move()` 方法中添加缓存清除:

```typescript
const add = async (...): Promise<boolean> => {
  const result = await favoritesService.add(wallpaperId, collectionId, wallpaperData)
  if (result.success) {
    await store.loadFavorites()
    await loadCounts()
    store.clearPageCache()

    // PERF-03: 清除收藏状态缓存
    wallpaperService.clearFavoriteStatusCache()

    showSuccess('已添加到收藏')
    return true
  }
  // ...
}

// 同样在 remove() 和 move() 中添加
```

**GitNexus 影响分析:**
- 目标: `useFavorites`
- 风险: LOW
- 调用方: OnlineWallpaper.vue, FavoritesPage.vue 等
- 验证: 添加/移除收藏后状态立即更新

**提交信息:**
```
feat(perf): 收藏操作后清除状态缓存

- 在 add/remove/move 操作后调用 clearFavoriteStatusCache
- 确保收藏状态实时更新

PERF-03
```

**验证清单:**
- [ ] TypeScript 类型检查通过
- [ ] 在线壁纸搜索时收藏状态正确显示
- [ ] 添加收藏后，搜索结果中的收藏状态立即更新
- [ ] 移除收藏后，搜索结果中的收藏状态立即更新
- [ ] 移动收藏后，收藏状态正确

---

### Task 2.2: 使用 sharp 库解析图片尺寸

**目标:** 支持 WebP 格式图片尺寸解析

**执行步骤:**

#### Step 1: 重写 getImageDimensions 函数

**文件:** `electron/main/ipc/handlers/base.ts`

**修改内容:**

替换现有的手动解析实现:

```typescript
/**
 * Get image dimensions using sharp library
 * Supports JPEG, PNG, GIF, WebP, AVIF, TIFF, BMP and more
 */
export async function getImageDimensions(
  filePath: string,
): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(filePath).metadata()
    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    }
  } catch (error) {
    // Parse error, return default values
    return { width: 0, height: 0 }
  }
}
```

**GitNexus 影响分析:**
- 目标: `getImageDimensions`
- 风险: LOW
- 直接调用方: `registerFileHandlers` (file.handler.ts)
- 影响流程: `registerAllHandlers`
- 验证: 本地壁纸浏览功能

**提交信息:**
```
feat(perf): 使用 sharp 库解析图片尺寸以支持 WebP

- 重写 getImageDimensions 使用 sharp.metadata()
- 支持 WebP, AVIF, TIFF 等更多格式
- 简化代码，提升可维护性
- 错误时返回 0x0（保持原有行为）

PERF-04
```

**验证清单:**
- [ ] TypeScript 类型检查通过
- [ ] 本地 JPEG 图片尺寸正确
- [ ] 本地 PNG 图片尺寸正确
- [ ] 本地 GIF 图片尺寸正确
- [ ] 本地 WebP 图片尺寸正确 ✨
- [ ] 损坏图片返回 0x0（不抛异常）

---

### Task 2.3: 验证优化效果

**目标:** 确认性能优化有效且无功能退化

**执行步骤:**

#### Step 1: 运行 TypeScript 类型检查

```bash
npm run typecheck
```

**期望结果:** 无类型错误

#### Step 2: 构建项目

```bash
npm run build
```

**期望结果:** 构建成功

#### Step 3: GitNexus 变更检测

```bash
# 使用 GitNexus 检测变更范围
```

**期望结果:**
- 修改文件符合预期
- 无意外修改

#### Step 4: 手动功能测试

**测试场景:**

1. **收藏状态缓存测试**
   - [ ] 搜索壁纸，确认收藏状态正确
   - [ ] 添加收藏，再次搜索，确认状态已更新
   - [ ] 移除收藏，再次搜索，确认状态已更新
   - [ ] 打开 F12 控制台，观察 IPC 调用次数减少

2. **图片尺寸解析测试**
   - [ ] 打开本地壁纸页面
   - [ ] 浏览 JPEG/PNG/GIF 图片，确认尺寸正确
   - [ ] 浏览 WebP 图片，确认尺寸正确显示 ✨
   - [ ] 测试损坏图片，确认显示 0x0（不崩溃）

#### Step 5: 性能对比（可选）

**测试方法:**
1. 打开 DevTools Console
2. 搜索壁纸 10 次，记录 `getFavoriteStatusMap` IPC 调用次数
3. 添加/移除收藏后，再次搜索 10 次
4. 对比优化前后的调用次数

**期望结果:**
- 相同壁纸第二次搜索时，`getFavoriteStatusMap` 调用次数为 0
- 添加/移除收藏后，缓存清除，首次搜索会重新查询

**提交信息:**
```
chore: 验证 Phase 2 性能优化效果

- TypeScript 类型检查通过
- 构建成功
- 功能测试通过
- 性能测试通过（收藏状态缓存生效）

Phase 2 Complete
```

---

## 验收标准

### 功能验收

- [ ] 在线壁纸搜索时收藏状态正确显示
- [ ] 收藏操作后状态立即更新
- [ ] 本地壁纸浏览时 WebP 尺寸正确显示
- [ ] 其他图片格式尺寸正确显示

### 性能验收

- [ ] 收藏状态缓存生效（二次搜索减少查询）
- [ ] WebP 图片解析成功（不再返回 0x0）

### 代码质量验收

- [ ] TypeScript 类型检查通过
- [ ] 构建成功
- [ ] 无 console 错误
- [ ] GitNexus 变更范围符合预期

---

## 回滚计划

### Task 2.1 回滚

```bash
git revert <commit-hash>
```

移除收藏状态缓存逻辑，恢复原始查询方式。

### Task 2.2 回滚

```bash
git revert <commit-hash>
```

恢复手动解析实现，WebP 将返回 0x0。

---

## 后续优化

- Phase 5 将统一缓存管理到 Store
- 可添加缓存命中率统计
- 考虑预加载策略

---

## 依赖关系

**上游阶段:**
- Phase 1: 性能优化（下载与缓存）✅

**下游阶段:**
- Phase 3: 代码质量（错误处理与类型）

---

*计划创建日期: 2026-05-06*
*预计完成时间: 1-2 小时*
