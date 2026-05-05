# Requirements: Wallhaven 代码清理

**Defined:** 2026-05-05
**Core Value:** 保守清理：只移除确定无用的代码，保留可能在未来使用的类型和工具函数

## v1 Requirements

### 代码分析

- [ ] **ANAL-01**: 使用 ts-prune 识别所有未使用的导出
- [ ] **ANAL-02**: 使用 grep 验证每个导出的实际使用情况
- [ ] **ANAL-03**: 区分误报（Pinia Store、barrel 文件重导出）和真正未使用代码
- [ ] **ANAL-04**: 生成未使用代码清单报告

### 代码清理

- [ ] **CLEAN-01**: 移除 src/types/ipc.ts 中未使用的类型守卫函数（isIpcErrorInfo, isResumeDownloadParams, isPendingDownload）
- [ ] **CLEAN-02**: 移除 src/services/wallpaperApi.ts 中未使用的导出（clearApiCache, searchWallpapers, getWallpaperDetail）
- [ ] **CLEAN-03**: 检查并清理 barrel 文件中的冗余导出

### 验证

- [ ] **VER-01**: 运行 TypeScript 类型检查（npm run type-check）
- [ ] **VER-02**: 运行 ESLint 检查（npm run lint）
- [ ] **VER-03**: 运行单元测试（npm run test:unit）
- [ ] **VER-04**: 手动验证应用功能正常

## v2 Requirements

暂无

## Out of Scope

| Feature | Reason |
|---------|--------|
| 移除工具函数 | debounce, throttle 等是通用函数，未来可能需要 |
| 移除 Store 文件 | 被 Composables 通过 Pinia 依赖注入使用 |
| 移除类型定义 | 公共 API 类型定义需要保留 |
| 移除 electronClient | 被 Repository 层使用 |
| 移除 Composable 返回类型 | 作为公共 API 的类型定义 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANAL-01 | Phase 1 | Complete |
| ANAL-02 | Phase 1 | Complete |
| ANAL-03 | Phase 1 | Complete |
| ANAL-04 | Phase 1 | Pending |
| CLEAN-01 | Phase 1 | Pending |
| CLEAN-02 | Phase 1 | Pending |
| CLEAN-03 | Phase 1 | Pending |
| VER-01 | Phase 1 | Pending |
| VER-02 | Phase 1 | Pending |
| VER-03 | Phase 1 | Pending |
| VER-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after 初始分析完成*
