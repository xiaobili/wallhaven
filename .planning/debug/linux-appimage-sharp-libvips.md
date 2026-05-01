---
status: resolved
trigger: |
  GitHub Actions CI 构建的 Linux AppImage 启动时报错：
  Error: Could not load the "sharp" module using the linux-x64 runtime
  ERR_DLOPEN_FAILED: libvips-cpp.so.8.17.3: 无法打开共享目标文件: 没有那个文件或目录
created: 2026-05-01
updated: 2026-05-01
---

## Symptoms

- **Expected**: Linux AppImage 构建后可以正常运行，图片处理功能正常
- **Actual**: AppImage 启动后立即崩溃，sharp 模块无法加载，报 `libvips-cpp.so.8.17.3` 共享库缺失
- **Error**: 
  ```
  Error: Could not load the "sharp" module using the linux-x64 runtime
  ERR_DLOPEN_FAILED: libvips-cpp.so.8.17.3: 无法打开共享目标文件: 没有那个文件或目录
  ```
- **Reproduction**: 使用 Actions 中 `build-linux` job 构建的 AppImage 安装后启动即可复现
- **CI Context**: CI 中运行了 `npm rebuild sharp --platform=linux --arch=x64`，但 sharp 的预构建二进制依赖 libvips 动态库没有被打包到 AppImage 中
- **Build config**: `build.yml` line 164-197, build-linux job

## Current Focus

- **hypothesis**: sharp 模块依赖的 libvips 原生动态库 (`libvips-cpp.so.8.17.3`) 在 electron-builder 打包时没有被正确 bundled 到 AppImage 中，或者系统环境缺少该运行时依赖
- **test**: 已确认 — 在 `node_modules/@img/sharp-libvips-*/lib/` 中存在 libvips 动态库，但 electron-builder 打包时未将其从 asar 中解出
- **expecting**: 确认 `asarUnpack` 配置缺失是根本原因
- **next_action**: 修复 `electron-builder.yml` 中的 `asarUnpack` 配置

## Evidence

- timestamp: 2026-05-01T00:00:00Z
  分析 Sharp v0.34.5 依赖结构：
  - sharp 的 `optionalDependencies` 中包含 `@img/sharp-linux-x64`（平台特定原生模块）
  - `@img/sharp-linux-x64` 的 `optionalDependencies` 中包含 `@img/sharp-libvips-linux-x64`
  - `@img/sharp-libvips-linux-x64/lib/` 中包含 `libvips-cpp.so.8.17.3` （错误报告中缺失的文件）
  - 开发环境中只安装了 darwin-x64 变体，linux-x64 是 optional dep 只在 linux 上安装

- timestamp: 2026-05-01T00:00:00Z
  Sharp 加载机制分析：
  - `sharp/lib/sharp.js` 第 16 行：通过 `require('@img/sharp-${runtimePlatform}/sharp.node')` 加载原生模块
  - `sharp/src/binding.gyp` 第 197-198 行：`sharp.node` 的 rpath 设置为 `$ORIGIN/../../node_modules/@img/sharp-libvips-linux-x64/lib/`，用于运行时查找 `libvips-cpp.so`
  - dlopen 无法从 asar 归档中加载 .so 文件，需要目标文件在真实文件系统上

- timestamp: 2026-05-01T00:00:00Z
  electron-builder 配置分析：
  - `electron-builder.yml` 第 12-15 行：`asarUnpack` 只包含 `**/node_modules/sharp/**/*`
  - `@img/sharp-linux-x64` 和 `@img/sharp-libvips-linux-x64` 不在 `asarUnpack` 列表中
  - 虽然 `npmRebuild: true` 已启用，但只对 sharp 主包生效，不影响 @img 子包的打包行为

## Eliminated

- ~~CI 中 npm install 未安装 linux optional deps~~ — ubuntu-latest 平台匹配，npm 默认会安装匹配平台的 optionalDependencies
- ~~npm rebuild sharp 导致 linux 包丢失~~ — `npm rebuild` 只重建原生模块，不影响 optional deps
- ~~Node.js 版本不兼容~~ — sharp v0.34.5 支持 Node.js ^18.17.0 || ^20.3.0 || >=21.0.0，CI 使用 Node.js 24
- ~~系统 libvips 全局安装缺失~~ — sharp v0.34.x 使用自带的预编译 @img 包，不依赖系统库

## Resolution

**Root Cause**: `electron-builder.yml` 中 `asarUnpack` 配置只包含了 `**/node_modules/sharp/**/*`，但 sharp v0.34.5 将其平台特定的原生二进制（`@img/sharp-linux-x64`）和 libvips 动态库（`@img/sharp-libvips-linux-x64`）拆分到了 `@img` 命名空间下的独立 optional dependency 包中。这些包含 `.node` 和 `.so` 文件的 `@img` 包在打包时被封装进了 asar 归档，导致运行时 dlopen 无法加载 `libvips-cpp.so.8.17.3`。

**Fix**: 在 `electron-builder.yml` 的 `asarUnpack` 中添加 `**/node_modules/@img/**/*`，确保所有 `@img` 命名空间下的包从 asar 中解出，使动态链接器可以在运行时访问到 `.so` 文件。

```yaml
asarUnpack:
  - '**/node_modules/sharp/**/*'
  - '**/node_modules/@img/**/*'
  - resources/**
```
