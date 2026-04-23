# Sharp 模块 macOS 构建问题解决方案

## 📋 问题描述

在 macOS 上构建 Electron 应用后，双击应用时出现以下错误：

```
Error: Could not load the "sharp" module using the darwin-x64 runtime
Possible solutions:
- Ensure optional dependencies can be installed
- Ensure your package manager supports multi-platform installation
- Add platform-specific dependencies
```

## 🔍 问题原因

1. **原生模块编译问题**：[sharp](file:///Volumes/DATA/Code/Vscode/wallhaven/node_modules/sharp) 是一个基于 C++ 的原生 Node.js 模块，需要针对特定平台编译
2. **Python 版本兼容性**：Python 3.14 移除了 `distutils` 模块，导致从源码编译失败
3. **electron-builder 配置**：`npmRebuild: false` 阻止了原生模块的重新编译

## ✅ 解决方案

### 步骤 1：更新 electron-builder 配置

修改 [`electron-builder.yml`](file:///Volumes/DATA/Code/Vscode/wallhaven/electron-builder.yml)：

```yaml
# 解包 sharp 模块以支持原生二进制文件
asarUnpack:
  - '**/node_modules/sharp/**/*'
  - resources/**

# 启用原生模块重建（可选）
npmRebuild: true
```

### 步骤 2：重新安装 sharp

使用 cnpm 重新安装针对当前平台的 sharp：

```bash
# 删除旧的 sharp 模块
rm -rf node_modules/.store/sharp*

# 重新安装（指定平台）
cnpm install sharp --platform=darwin --arch=x64
```

### 步骤 3：验证 sharp 安装

```bash
node -e "const sharp = require('sharp'); console.log('✅ Sharp 版本:', sharp.versions);"
```

预期输出：
```
✅ Sharp 版本: {
  aom: '3.13.1',
  vips: '8.17.3',
  sharp: '0.34.5',
  ...
}
```

### 步骤 4：重新构建应用

```bash
npm run build:mac
```

## 📦 构建结果

成功生成以下文件：

| 文件 | 大小 | 说明 |
|------|------|------|
| [dist/Wallhaven-1.0.0-mac.zip](file:///Volumes/DATA/Code/Vscode/wallhaven/dist/Wallhaven-1.0.0-mac.zip) | 117 MB | macOS 压缩包 |
| [dist/wallhaven-1.0.0.dmg](file:///Volumes/DATA/Code/Vscode/wallhaven/dist/wallhaven-1.0.0.dmg) | 121 MB | macOS DMG 安装包 |
| [dist/mac/Wallhaven.app](file:///Volumes/DATA/Code/Vscode/wallhaven/dist/mac/Wallhaven.app) | - | macOS 应用程序 |

## 🔧 其他注意事项

### 1. 避免使用 rebuild 脚本

由于 Python 3.14 兼容性问题，建议在 [`package.json`](file:///Volumes/DATA/Code/Vscode/wallhaven/package.json) 中移除 `rebuild:sharp` 脚本：

```json
{
  "scripts": {
    "build": "electron-vite build",  // 移除了 rebuild:sharp
    "build:mac": "npm run build && electron-builder --mac --config"
  }
}
```

### 2. 使用预编译二进制文件

sharp 提供了预编译的二进制文件，通常不需要从源码编译。确保：
- 使用最新的 sharp 版本
- 网络环境可以访问 npm registry
- 不要强制使用 `--build-from-source`

### 3. 跨平台构建

如果需要为多个平台构建，建议：
- 在各自的平台上进行构建
- 或使用 CI/CD 服务（如 GitHub Actions、Travis CI）
- 避免交叉编译原生模块

## 🎯 测试验证

1. 打开生成的应用：
   ```bash
   open dist/mac/Wallhaven.app
   ```

2. 检查应用是否正常启动
3. 验证图标是否正确显示
4. 测试所有功能是否正常工作

## 📚 相关资源

- [Sharp 官方文档](https://sharp.pixelplumbing.com/install)
- [Electron Builder 原生模块指南](https://www.electron.build/configuration/configuration#npmrebuild)
- [Node.js 原生模块编译指南](https://github.com/nodejs/node-gyp)

## ⚠️ 常见问题

### Q: 为什么不能直接从源码编译？

A: Python 3.12+ 移除了 `distutils` 模块，而 node-gyp 依赖此模块。解决方法：
- 降级到 Python 3.11 或更早版本
- 使用预编译的二进制文件（推荐）
- 安装 `setuptools` 提供 distutils

### Q: 如何确认 sharp 已正确安装？

A: 运行以下命令：
```bash
node -e "console.log(require('sharp').versions)"
```
如果输出了版本信息，说明安装成功。

### Q: 其他原生模块也有类似问题吗？

A: 是的，任何使用 node-gyp 编译的原生模块都可能遇到类似问题，例如：
- sqlite3
- node-sass
- bcrypt
- canvas

解决方法类似：使用预编译版本或在正确的环境中编译。

---

**最后更新**: 2026-04-23
**状态**: ✅ 已解决
