# Arch Linux 构建支持设计文档

**日期：** 2026-05-06
**状态：** 已批准
**目标：** 为 Wallhaven 壁纸浏览器添加 Arch Linux 构建支持，包括本地构建和 AUR 发布

---

## 1. 概述

Wallhaven 是一个基于 Electron + Vue 3 的跨平台壁纸应用。目前支持 Windows、macOS 和 Linux（AppImage/snap/deb/pacman），但缺少标准的 Arch Linux 打包支持。

本设计旨在：
- 提供本地 `makepkg` 构建能力
- 支持发布到 AUR（Arch User Repository）
- 从源码构建，符合 Arch 打包规范

---

## 2. 方案选择

### 采用方案：electron-builder pacman + PKGBUILD 包装器

**理由：**
1. 复用现有的 `electron-builder --linux pacman` 配置
2. 维护成本低，不需要手动追踪所有依赖
3. 仍然从源码构建，符合用户需求
4. 构建速度快，兼容性好

**替代方案（已排除）：**
- 纯源码 PKGBUILD：维护成本高，需手动管理所有依赖
- AppImage 提取：非 Arch 原生格式，额外步骤多

---

## 3. 目录结构

```
archlinux/
├── README.md                 # 构建说明文档
├── build-arch-package.sh     # 本地构建脚本（开发用）
├── wallhaven/
│   ├── PKGBUILD             # 稳定版 PKGBUILD
│   └── .SRCINFO             # AUR 元数据（自动生成）
└── .gitignore               # 忽略构建产物
```

---

## 4. PKGBUILD 设计

### 4.1 包信息

```bash
pkgname=wallhaven
pkgver=2.7.0  # 从 package.json 自动提取
pkgrel=1
pkgdesc="一款优雅的跨平台桌面壁纸浏览与下载应用"
arch=('x86_64')
url="https://github.com/xiaobili/wallhaven"
license=('MIT')
```

### 4.2 依赖声明

**构建依赖 (makedepends)：**
- `git` - 克隆源码
- `npm` - Node.js 包管理器
- `nodejs` - Node.js 运行时
- `libsecret` - keytar 原生依赖
- `python` - node-gyp 构建原生模块
- `gcc` - 编译原生模块
- `make` - 构建工具

**运行时依赖 (depends)：**
- `gtk3` - GUI 工具包
- `libnotify` - 桌面通知
- `nss` - 网络安全服务
- `libxss` - X Screen Saver 扩展
- `at-spi2-core` - 辅助技术支持
- `libdrm` - Direct Rendering Manager
- `libxkbcommon` - 键盘处理
- `mesa` - 图形驱动

### 4.3 构建流程

```bash
build() {
    cd "$srcdir/$pkgname"

    # 安装依赖
    npm install --cache="$srcdir/npm-cache"

    # 构建应用
    npm run build:linux
}

package() {
    cd "$srcdir/$pkgname"

    # 提取 pacman 包内容
    bsdtar -xf release/wallhaven-*.pacman -C "$pkgdir"

    # 安装 desktop 文件（如需要）
    # 安装图标（如需要）
}
```

### 4.4 版本处理

- 从 Git tag 提取版本号
- 格式：`v2.7.0` → `pkgver=2.7.0`

---

## 5. 本地构建脚本

### 5.1 功能

`build-arch-package.sh` 提供以下命令：

| 命令 | 说明 |
|------|------|
| `--local` | 使用本地源码构建（不克隆远程仓库） |
| `--install` | 构建完成后直接安装 |
| `--clean` | 清理构建产物 |
| `--help` | 显示帮助信息 |

### 5.2 工作流

```bash
# 标准流程
./build-arch-package.sh --install

# 本地开发测试
./build-arch-package.sh --local --install
```

---

## 6. .SRCINFO 文件

自动生成的 AUR 元数据，用于 AUR 网站显示包信息。

```ini
pkgbase = wallhaven
    pkgdesc = 一款优雅的跨平台桌面壁纸浏览与下载应用
    pkgver = 2.7.0
    pkgrel = 1
    url = https://github.com/BillyJR/wallhaven
    arch = x86_64
    license = MIT
    makedepends = git npm nodejs libsecret python gcc make
    depends = gtk3 libnotify nss libxss at-spi2-core libdrm libxkbcommon mesa
    source = wallhaven-v2.7.0.tar.gz::https://github.com/xiaobili/wallhaven/archive/v2.7.0.tar.gz
    sha256sums = SKIP

pkgname = wallhaven
```

---

## 7. 与现有构建集成

### 7.1 现有配置

`electron-builder.yml` 已配置 `pacman` 作为 Linux 目标之一：

```yaml
linux:
  target:
    - AppImage
    - snap
    - deb
    - pacman  # 已存在
```

### 7.2 无需修改

- 不修改 `package.json`
- 不修改 `electron-builder.yml`
- 仅添加 `archlinux/` 目录

---

## 8. 文档

### 8.1 archlinux/README.md 内容

- 构建前准备（安装依赖）
- 本地构建步骤
- AUR 发布流程
- 常见问题排查

### 8.2 主 README.md 更新

已有的 Arch Linux 安装说明需要更新路径，确保指向正确的文件。

---

## 9. 测试计划

### 9.1 本地测试

1. 在 Arch Linux 环境运行 `makepkg -si`
2. 验证应用启动
3. 验证核心功能（搜索、下载、设置壁纸）

### 9.2 AUR 测试

1. 上传到 AUR
2. 使用 `yay -S wallhaven` 安装
3. 验证依赖正确安装

---

## 10. 维护计划

### 10.1 版本更新

每次发布新版本时：
1. 更新 `package.json` 版本号
2. 生成新的 `.SRCINFO`
3. 更新 AUR 包

### 10.2 依赖更新

- Electron 版本更新时，检查运行时依赖是否变化
- 定期验证构建流程

---

## 11. 实施清单

- [ ] 创建 `archlinux/` 目录结构
- [ ] 编写 `PKGBUILD` 文件
- [ ] 编写 `.SRCINFO` 文件
- [ ] 编写 `build-arch-package.sh` 脚本
- [ ] 编写 `archlinux/README.md` 文档
- [ ] 更新主 `README.md` 的 Arch Linux 说明
- [ ] 创建 `archlinux/.gitignore`
- [ ] 本地测试构建流程
- [ ] 提交所有文件到仓库

---

## 12. 参考资料

- [Arch Linux PKGBUILD 指南](https://wiki.archlinux.org/title/PKGBUILD)
- [Arch Linux 打包规范](https://wiki.archlinux.org/title/Arch_package_guidelines)
- [electron-builder 文档](https://www.electron.build/)
- [AUR 提交指南](https://wiki.archlinux.org/title/AUR_submission_guidelines)
