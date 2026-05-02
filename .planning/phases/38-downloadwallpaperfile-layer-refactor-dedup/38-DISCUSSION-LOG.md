# Phase 38: downloadWallpaperFile 分层重构与重复下载检测 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 38-downloadwallpaperfile-layer-refactor-dedup
**Areas discussed:** 分层策略, 检测位置, 匹配策略, 重复行为

---

## 分层策略 — downloadWallpaperFile 分层归属

| Option | Description | Selected |
|--------|-------------|----------|
| 经 DownloadService | 在 downloadService 中新增 simpleDownload() 方法 | ✓ |
| 当前组合方式 | 保持 composable 直接调用 electronClient | |

**User's choice:** 经 DownloadService
**Notes:** 遵循现有分层架构，将下载执行逻辑下沉到 Service 层

---

## 检测位置 — 重复下载检测的实现层次

| Option | Description | Selected |
|--------|-------------|----------|
| Service 层 | 在 downloadService 中统一实现检测 | ✓ |
| Client 层 | 在 electronClient.downloadWallpaper() 中检测 | |

**User's choice:** Service 层
**Notes:** 确保 composable 和未来其他调用者都能复用检测逻辑

---

## 匹配策略 — 重复检测的依据

| Option | Description | Selected |
|--------|-------------|----------|
| 文件名检测 | 生成完整路径后检查磁盘文件是否存在 | ✓ |
| 双重匹配 | 文件名 + finishedList 记录双重检查 | |

**User's choice:** 文件名检测
**Notes:** 直接可靠，不依赖下载历史记录

---

## 重复行为 — 检测到已存在文件时的处理

| Option | Description | Selected |
|--------|-------------|----------|
| 透明返回 | 不通知用户，直接返回已有文件路径 | ✓ |
| 简单提示 | 跳过下载但显示 "壁纸已存在" 提示 | |

**User's choice:** 透明返回
**Notes:** setBgFromUrl 流程正常继续设壁纸，用户无感知

---

## Claude's Discretion

- `simpleDownload()` 方法的具体签名和内部错误处理细节
- `electronClient` 检查文件存在的具体实现方式
- 文件名与 `downloadService.getDownloadPath()` 的组合细节

## Deferred Ideas

None — discussion stayed within phase scope.
