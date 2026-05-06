---
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements_addressed:
  - ARCH-03
must_haves:
  truths:
    - IPC 通道命名已统一为 kebab-case
  goals:
    - 验证 ARCH-03 需求已满足
    - 更新项目状态文档
---

# Plan 01: 验证 IPC 命名规范

**目标:** 验证 IPC 通道命名已统一使用 kebab-case，满足 ARCH-03 需求

## Context

通过代码审查发现，IPC 通道命名在项目开发过程中已经统一使用 kebab-case 格式。本计划旨在验证这一发现，并更新相关文档以记录需求完成状态。

---

## Task 01: 验证 IPC_CHANNELS 常量定义

<read_first>
- `src/types/ipc.ts`
</read_first>

<action>
审查 `src/types/ipc.ts` 中的 `IPC_CHANNELS` 常量，确认：

1. 所有通道名称使用 kebab-case 格式
2. 无 camelCase 或 snake_case 混用
3. 命名具有一致的模式（领域-操作）

当前已知格式：
- 文件操作: `select-folder`, `read-directory`, `delete-file`, `file-exists`
- 下载功能: `download-wallpaper`, `start-download-task`, `pause-download-task`
- 收藏功能: `favorites-get-collections`, `favorites-add`, `favorites-remove`
- 窗口控制: `window-minimize`, `window-maximize`, `window-close`
- Store 操作: `store-get`, `store-set`, `store-delete`, `store-clear`
</action>

<acceptance_criteria>
- `src/types/ipc.ts` 中 `IPC_CHANNELS` 对象所有属性值为 kebab-case 字符串
- 无 camelCase 或 snake_case 格式的通道名
- 通道总数约 35 个，覆盖所有功能域
</acceptance_criteria>

---

## Task 02: 验证 Handlers 使用一致性

<read_first>
- `electron/main/ipc/handlers/download.handler.ts`
- `electron/main/ipc/handlers/file.handler.ts`
- `electron/main/ipc/handlers/store.handler.ts`
- `electron/main/ipc/handlers/favorites.handler.ts`
- `electron/main/ipc/handlers/cache.handler.ts`
- `electron/main/ipc/handlers/window.handler.ts`
</read_first>

<action>
检查所有 IPC handlers 中的 `ipcMain.handle()` 调用：

1. 确认使用字符串字面量时为 kebab-case
2. 确认使用常量时引用 `IPC_CHANNELS`
3. 无硬编码的不一致命名

已验证的 handlers 及其使用的通道：
- `download.handler.ts`: `start-download-task`, `pause-download-task`, `cancel-download-task`, `resume-download-task`, `get-pending-downloads`, `download-progress`
- `file.handler.ts`: `select-folder`, `read-directory`, `delete-file`, `file-exists`, `open-folder`
- `store.handler.ts`: `store-get`, `store-set`, `store-delete`, `store-clear`
- `favorites.handler.ts`: `favorites-get-collections`, `favorites-create-collection`, `favorites-rename-collection`, `favorites-delete-collection`, `favorites-set-default-collection`, `favorites-get-by-collection`, `favorites-add`, `favorites-remove`, `favorites-move`, `favorites-is-favorite`, `favorites-get-collections-for-wallpaper`, `favorites-get-paginated`, `favorites-get-counts`, `favorites-get-status-map`
- `cache.handler.ts`: `clear-app-cache`, `get-cache-info`, `cleanup-orphan-files`
- `window.handler.ts`: `window-minimize`, `window-maximize`, `window-close`, `window-is-maximized`
</action>

<acceptance_criteria>
- 所有 handlers 的 `ipcMain.handle()` 第一个参数为 kebab-case 字符串或 IPC_CHANNELS 常量
- 无 camelCase 或 snake_case 格式
- 每个功能域的 handlers 都已注册
</acceptance_criteria>

---

## Task 03: 验证 Preload API 一致性

<read_first>
- `electron/preload/index.ts`
- `electron/preload/types.ts`
</read_first>

<action>
检查预加载脚本中的 IPC 调用：

1. 确认所有 `ipcRenderer.invoke()` 调用使用 `IPC_CHANNELS` 常量
2. 确认 `ipcRenderer.on()` 和 `ipcRenderer.removeListener()` 使用 `IPC_CHANNELS`
3. 无直接硬编码的字符串字面量

已知的 preload 方法映射：
- `selectFolder()` → `IPC_CHANNELS.SELECT_FOLDER`
- `startDownloadTask()` → `IPC_CHANNELS.START_DOWNLOAD_TASK`
- `favoritesGetCollections()` → `IPC_CHANNELS.FAVORITES_GET_COLLECTIONS`
- 等等...
</action>

<acceptance_criteria>
- `electron/preload/index.ts` 中所有 `ipcRenderer.invoke()` 调用使用 `IPC_CHANNELS` 常量
- `ipcRenderer.on()` 和 `ipcRenderer.removeListener()` 调用使用 `IPC_CHANNELS` 常量
- 无硬编码字符串
</acceptance_criteria>

---

## Task 04: 更新 REQUIREMENTS.md 状态

<read_first>
- `.planning/REQUIREMENTS.md`
</read_first>

<action>
将 ARCH-03 需求标记为已完成：

1. 在 REQUIREMENTS.md 中找到 ARCH-03 条目
2. 将 `[ ]` 改为 `[x]` 表示完成
3. 更新 Traceability 表格中的状态为 "Completed"

修改内容：
```markdown
- [x] **ARCH-03**: IPC 通道命名规范化
  - 统一使用 kebab-case 命名 ✅
  - 更新所有 IPC 通道定义 ✅
  - 保持向后兼容（或迁移计划）✅ N/A - 从未使用其他风格
```
</action>

<acceptance_criteria>
- `.planning/REQUIREMENTS.md` 中 ARCH-03 标记为 `[x]`
- Traceability 表格更新为 "Completed"
</acceptance_criteria>

---

## Task 05: 更新 STATE.md 最终状态

<read_first>
- `.planning/STATE.md`
</read_first>

<action>
更新 STATE.md 以反映里程碑完成：

1. 更新当前阶段状态
2. 更新进度条为 100%
3. 添加 Phase 6 完成记录
4. 更新关键指标表

修改要点：
```markdown
**当前阶段**: Phase 6 - ✅ 完成

Progress: ██████████ 100%

- Phase 6: 架构优化（IPC 命名规范）— ✅ 完成

| IPC 命名 | 混合风格 | 统一 kebab-case | 已统一 ✅ |
```
</action>

<acceptance_criteria>
- `.planning/STATE.md` 中 Phase 6 标记为完成
- 进度条显示 100%
- 关键指标表中 IPC 命名状态为 "已统一 ✅"
</acceptance_criteria>

---

## Verification

### 功能验证
- [ ] 所有 IPC 通道名称为 kebab-case
- [ ] IPC_CHANNELS 常量完整覆盖所有功能
- [ ] Handlers 和 Preload 使用一致的通道名

### 文档验证
- [ ] REQUIREMENTS.md ARCH-03 标记完成
- [ ] STATE.md 更新为里程碑完成状态

### 质量验证
- [ ] TypeScript 类型检查通过：`pnpm type-check`
- [ ] 构建成功：`pnpm build`
- [ ] 无功能变更，仅文档更新

---

## Notes

**关键发现:** IPC 通道命名在项目开发过程中已经统一使用 kebab-case 格式。这是一个"验证"阶段而非"实现"阶段。

**影响范围:** 无代码变更，仅文档更新。

**风险评估:** 无风险 — 仅验证现有实现并更新文档。
