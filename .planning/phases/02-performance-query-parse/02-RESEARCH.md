# Phase 2 Research: 性能优化（查询与解析）

**研究日期:** 2026-05-06
**阶段目标:** 优化收藏状态批量查询和图片尺寸解析

---

## 1. 收藏状态查询分析 (PERF-03)

### 当前实现

**调用链路:**
```
wallpaperService.search()
  → favoritesRepository.getFavoriteStatusMap(wallpaperIds)
    → electronClient.favoritesGetStatusMap()
      → IPC → SQLite 查询
```

**关键代码位置:**
- `src/services/wallpaper.service.ts` (L129-137) - 在搜索结果中注入收藏状态
- `src/repositories/favorites.repository.ts` (L273-288) - 批量查询收藏状态
- `src/composables/favorites/useFavorites.ts` - 收藏管理 composable
- `src/stores/modules/favorites/index.ts` - 收藏状态 Store

### 当前问题

1. **每次搜索都查询数据库**: `wallpaperService.search()` 每次都调用 `getFavoriteStatusMap`
2. **缓存层不存在**: 收藏状态没有前端缓存，完全依赖数据库查询
3. **Store 中的 favoriteIds 未被利用**: Store 已经维护了 `favoriteIds` Set，但没有用于批量状态查询

### 优化方案

**策略: 前端缓存 + 增量更新**

```typescript
// 在 wallpaperService 中添加本地缓存
private favoriteStatusCache = new Map<string, 0 | 1 | 2>()

// 在 search() 方法中:
// 1. 首先从本地缓存获取状态
// 2. 只查询缓存中不存在的壁纸 ID
// 3. 更新缓存

// 监听收藏变更事件，更新缓存
// 在 add/remove/move 操作后清除相关缓存
```

**优势:**
- 减少数据库查询次数（缓存命中时为 0）
- 保持数据一致性（收藏变更时清除缓存）
- 对现有 API 无影响

### 实现要点

1. **缓存存储位置**: `wallpaper.service.ts` 中的私有 Map
2. **缓存失效时机**:
   - 用户添加/移除收藏时
   - 用户手动刷新时
   - 切换收藏夹视图时
3. **增量查询策略**:
   ```typescript
   const uncachedIds = wallpaperIds.filter(id => !this.favoriteStatusCache.has(id))
   if (uncachedIds.length > 0) {
     const newStatusMap = await favoritesRepository.getFavoriteStatusMap(uncachedIds)
     // 更新缓存
   }
   ```

### 风险评估

- **风险等级**: LOW
- **影响范围**: 仅影响收藏状态显示，不影响收藏操作
- **回滚策略**: 移除缓存逻辑，恢复原始查询

---

## 2. 图片尺寸解析分析 (PERF-04)

### 当前实现

**位置:** `electron/main/ipc/handlers/base.ts` (L18-100)

**方法:** `getImageDimensions(filePath: string)`

**实现方式:** 手动解析文件头（24 字节）

```typescript
// 当前支持的格式:
- JPEG: 手动解析 SOF 标记
- PNG: 读取 IHDR 块
- GIF: 读取逻辑屏幕描述符
- BMP: 读取 BITMAPINFOHEADER
- WebP: 返回 { width: 0, height: 0 } ❌
```

### 当前问题

1. **WebP 格式不支持**: 返回 0x0 尺寸，导致本地 WebP 壁纸无法正确显示
2. **手动解析复杂**: 需要理解每种格式的二进制结构
3. **维护成本高**: 添加新格式支持需要额外代码
4. **sharp 已安装但未使用**: 项目已有 sharp 依赖（^0.34.5），仅在 `generateThumbnail` 中使用

### 优化方案

**策略: 使用 sharp 库替换手动解析**

```typescript
import sharp from 'sharp'

export async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(filePath).metadata()
    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    }
  } catch (error) {
    // 解析失败，返回默认值
    return { width: 0, height: 0 }
  }
}
```

**优势:**
- 支持 WebP、AVIF、TIFF 等更多格式
- 代码简洁，易于维护
- 性能可靠（sharp 是成熟的图像处理库）
- 无需额外依赖（已安装）

### 实现要点

1. **函数签名变更**: 从同步回调改为 async/await
2. **调用方更新**: `file.handler.ts` 中的 `read-directory` handler
3. **错误处理**: 保持现有行为（失败返回 0x0）
4. **测试验证**: 本地 WebP 壁纸列表显示正确

### 调用链分析

```
LocalWallpaper.vue
  → IPC 'read-directory'
    → registerFileHandlers()
      → getImageDimensions(filePath)
        → 返回 { width, height }
```

**影响范围**: 仅影响本地壁纸浏览功能

### 风险评估

- **风险等级**: LOW
- **影响范围**: 本地壁纸列表显示
- **回滚策略**: 恢复原始解析逻辑

---

## 3. 依赖检查

### sharp 库

- **当前版本**: ^0.34.5
- **安装状态**: ✅ 已安装
- **使用位置**:
  - `electron/main/ipc/handlers/base.ts` - `generateThumbnail()` 函数
- **平台支持**: Windows, macOS, Linux

### 无需新增依赖

---

## 4. 实现计划

### Task 2.1: 前端收藏状态缓存

**修改文件:**
1. `src/services/wallpaper.service.ts`
   - 添加 `favoriteStatusCache` Map
   - 修改 `search()` 方法，实现增量查询
   - 添加缓存清除方法

2. `src/composables/favorites/useFavorites.ts`
   - 在 `add/remove/move` 操作后调用缓存清除

**验证:**
- 搜索壁纸时，收藏状态正确显示
- 添加/移除收藏后，状态立即更新
- 缓存命中率统计（可选）

### Task 2.2: 使用 sharp 解析图片尺寸

**修改文件:**
1. `electron/main/ipc/handlers/base.ts`
   - 重写 `getImageDimensions()` 函数
   - 使用 sharp.metadata() 获取尺寸

**验证:**
- 本地 JPEG/PNG/GIF/BMP 壁纸显示正常
- 本地 WebP 壁纸尺寸正确显示
- 解析失败时返回 0x0（不抛异常）

### Task 2.3: 验证优化效果

**测试场景:**
1. 在线壁纸搜索 → 收藏状态正确
2. 添加/移除收藏 → 状态立即更新
3. 本地壁纸浏览（含 WebP）→ 尺寸正确
4. 性能对比 → 查询次数减少

---

## 5. 关键发现

1. **Store 已维护 favoriteIds**: `useFavoritesStore` 中的 `favoriteIds` 计算属性可用，但当前搜索流程未利用
2. **sharp 已在使用**: `generateThumbnail` 已经使用 sharp，不会引入新依赖
3. **缓存策略一致**: 与 Phase 1 的壁纸搜索缓存策略一致（LRU + TTL）
4. **无破坏性变更**: 两个优化都是内部实现改进，不影响 API 和 UI

---

## 6. GitNexus 影响分析

### getImageDimensions

- **调用方**: `registerFileHandlers` in `file.handler.ts`
- **风险**: LOW
- **测试点**: 本地壁纸浏览功能

### favoritesRepository.getFavoriteStatusMap

- **调用方**: `wallpaperService.search()`
- **风险**: LOW
- **测试点**: 在线壁纸搜索、收藏状态显示

---

## 7. 后续优化建议

1. **统一缓存管理**: 考虑在 Phase 5 将缓存迁移到 Store
2. **缓存统计**: 添加收藏状态缓存命中率监控
3. **预加载策略**: 用户打开收藏页时预加载收藏状态

---

*研究完成日期: 2026-05-06*
