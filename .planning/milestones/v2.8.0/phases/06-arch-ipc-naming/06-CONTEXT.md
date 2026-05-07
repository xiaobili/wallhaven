# Phase 6: 架构优化（IPC 命名规范）- Context

**收集日期:** 2026-05-06
**状态:** 已验证 - 需求已完成
**来源:** 代码审查发现

---

## Phase Boundary

本阶段的目标是统一 IPC 通道命名风格为 kebab-case。通过全面代码审查发现，IPC 通道命名**已经统一使用 kebab-case**。

### 需求 ARCH-03 状态

| 要求 | 当前状态 | 验证方法 |
|------|----------|----------|
| 统一使用 kebab-case 命名 | ✅ 已完成 | 代码审查 |
| 更新所有 IPC 通道定义 | ✅ 已完成 | IPC_CHANNELS 常量已定义 |
| 保持向后兼容 | ✅ N/A | 从未使用其他命名风格 |

---

<decisions>

## Implementation Decisions

### D-01: IPC 通道命名已统一为 kebab-case ✅

**决策:** 确认 IPC 通道命名已统一使用 kebab-case，无需额外修改。

**验证证据:**
- `src/types/ipc.ts` 中 `IPC_CHANNELS` 常量已全部使用 kebab-case
- 所有主进程 handlers 使用 `ipcMain.handle('channel-name', ...)` 匹配
- 预加载脚本通过 `IPC_CHANNELS` 常量调用，保持一致性

**命名示例:**
```
文件操作: select-folder, read-directory, delete-file, file-exists
下载功能: download-wallpaper, start-download-task, pause-download-task
收藏功能: favorites-get-collections, favorites-add, favorites-remove
窗口控制: window-minimize, window-maximize, window-close
Store 操作: store-get, store-set, store-delete
缓存管理: clear-app-cache, get-cache-info, cleanup-orphan-files
```

### D-02: 将本阶段标记为"验证完成" ✅

**决策:** 由于需求已在代码库中满足，本阶段的任务是验证现有实现，而非修改代码。

</decisions>

---

<canonical_refs>

## Canonical References

**下游代理必须阅读以下文件：**

### IPC 通道定义
- `src/types/ipc.ts` — IPC 通道常量和类型定义（单一数据源）
- `electron/preload/index.ts` — 预加载脚本，暴露 IPC API
- `electron/preload/types.ts` — 预加载类型定义

### IPC Handlers
- `electron/main/ipc/handlers/download.handler.ts` — 下载相关 IPC
- `electron/main/ipc/handlers/file.handler.ts` — 文件操作 IPC
- `electron/main/ipc/handlers/store.handler.ts` — 持久化存储 IPC
- `electron/main/ipc/handlers/favorites.handler.ts` — 收藏功能 IPC
- `electron/main/ipc/handlers/cache.handler.ts` — 缓存管理 IPC
- `electron/main/ipc/handlers/window.handler.ts` — 窗口控制 IPC
- `electron/main/ipc/handlers/api.handler.ts` — Wallhaven API 代理 IPC
- `electron/main/ipc/handlers/wallpaper.handler.ts` — 壁纸设置 IPC

</canonical_refs>

---

<specifics>

## Specific Ideas

### 验证任务

1. **确认 IPC_CHANNELS 常量完整性**
   - 所有通道都已在 `src/types/ipc.ts` 中定义
   - 命名风格统一为 kebab-case

2. **确认 handlers 使用一致性**
   - 主进程 handlers 使用字符串字面量或 IPC_CHANNELS 常量
   - 无硬编码的不一致命名

3. **确认 preload 使用一致性**
   - 预加载脚本通过 IPC_CHANNELS 常量调用
   - 无直接硬编码字符串

### 无需执行的任务

- ~~统一转换为 kebab-case~~ — 已完成
- ~~更新 IPC 通道定义~~ — 已完成
- ~~更新 preload API~~ — 已完成
- ~~更新 handlers~~ — 已完成

</specifics>

---

<deferred>

## Deferred Ideas

无 — 本阶段需求已在代码库中满足。

</deferred>

---

*Phase: 06-arch-ipc-naming*
*Context 收集日期: 2026-05-06*
*验证状态: 需求已满足*
