# Wallhaven Arch Linux 构建指南

本文档说明如何在 Arch Linux 上构建和安装 Wallhaven 壁纸浏览器。

## 目录

- [快速开始](#快速开始)
- [构建方式](#构建方式)
- [从 AUR 安装](#从-aur-安装)
- [发布到 AUR](#发布到-aur)
- [常见问题](#常见问题)

---

## 快速开始

### 前置要求

确保已安装基本构建工具：

```bash
sudo pacman -S --needed base-devel git npm nodejs
```

### 本地构建（推荐用于开发）

```bash
# 进入 archlinux 目录
cd archlinux

# 使用本地源码构建并安装
./build-arch-package.sh --local --install
```

---

## 构建方式

### 方式一：使用本地源码

适合开发测试，使用当前目录的源码进行构建：

```bash
cd archlinux
./build-arch-package.sh --local --install
```

### 方式二：从 GitHub 下载源码

适合构建特定版本，从 GitHub Release 下载源码：

```bash
cd archlinux
./build-arch-package.sh --install
```

### 方式三：手动构建

```bash
cd archlinux/wallhaven
makepkg -si
```

### 构建脚本选项

| 选项 | 说明 |
|------|------|
| `-l, --local` | 使用本地源码构建 |
| `-i, --install` | 构建完成后安装 |
| `-c, --clean` | 清理后重新构建 |
| `-h, --help` | 显示帮助信息 |

---

## 从 AUR 安装

Wallhaven 已发布到 AUR，提供两种包：

### wallhaven-bin（推荐）

从 GitHub Release 下载预编译版本，安装速度快：

```bash
# 使用 yay
yay -S wallhaven-bin

# 或使用 paru
paru -S wallhaven-bin
```

**优点**：
- ✅ 安装快速（无需编译）
- ✅ 依赖更少
- ✅ 适合大多数用户

### wallhaven（从源码构建）

从源码构建，适合开发者：

```bash
# 使用 yay
yay -S wallhaven

# 或使用 paru
paru -S wallhaven
```

**优点**：
- ✅ 可以自定义编译选项
- ✅ 适合开发测试

**注意**：需要安装完整的构建依赖（npm、nodejs、gcc 等）

### 手动安装

```bash
# 克隆 AUR 仓库
git clone https://aur.archlinux.org/wallhaven-bin.git
cd wallhaven-bin

# 构建并安装
makepkg -si
```

---

## 发布到 AUR

### 前置条件

1. 拥有 AUR 账户
2. 已配置 SSH 密钥

### 发布流程

1. **生成 .SRCINFO**

   确保 `.SRCINFO` 与 `PKGBUILD` 同步：

   ```bash
   cd archlinux/wallhaven
   makepkg --printsrcinfo > .SRCINFO
   ```

2. **首次提交**

   ```bash
   # 克隆 AUR 仓库
   git clone ssh://aur@aur.archlinux.org/wallhaven.git aur-wallhaven
   cd aur-wallhaven

   # 复制文件
   cp ../archlinux/wallhaven/PKGBUILD .
   cp ../archlinux/wallhaven/.SRCINFO .

   # 添加并提交
   git add PKGBUILD .SRCINFO
   git commit -m "Initial upload: wallhaven 2.7.0"
   git push origin master
   ```

3. **更新版本**

   ```bash
   # 更新 PKGBUILD 和 .SRCINFO 中的版本号
   # 更新 sha256sums

   git add PKGBUILD .SRCINFO
   git commit -m "Update to 2.8.0"
   git push origin master
   ```

### 验证发布

发布后，检查 AUR 页面：
https://aur.archlinux.org/packages/wallhaven

---

## 常见问题

### 构建失败：缺少依赖

**问题：** `error: cannot find module 'xxx'`

**解决：** 确保已安装所有构建依赖：

```bash
sudo pacman -S --needed base-devel git npm nodejs libsecret python gcc make
```

### 构建失败：node-gyp 错误

**问题：** `gyp ERR! stack Error: not found: make`

**解决：** 安装编译工具链：

```bash
sudo pacman -S --needed make gcc python
```

### 运行时错误：找不到共享库

**问题：** `error while loading shared libraries: libxxx.so`

**解决：** 安装运行时依赖：

```bash
sudo pacman -S gtk3 libnotify nss libxss at-spi2-core
```

### npm 缓存问题

**问题：** 构建过程中 npm 报错

**解决：** 清理 npm 缓存：

```bash
npm cache clean --force
```

### 权限问题

**问题：** `makepkg` 不应以 root 运行

**解决：** 使用普通用户运行 `makepkg`，需要安装依赖时使用 `-s` 选项自动处理。

---

## 依赖说明

### 构建依赖 (makedepends)

| 包名 | 用途 |
|------|------|
| `git` | 克隆源码 |
| `npm` | Node.js 包管理器 |
| `nodejs` | Node.js 运行时 |
| `libsecret` | keytar 原生依赖 |
| `python` | node-gyp 构建工具 |
| `gcc` | 编译原生模块 |
| `make` | 构建工具 |

### 运行时依赖 (depends)

| 包名 | 用途 |
|------|------|
| `gtk3` | GUI 工具包 |
| `libnotify` | 桌面通知 |
| `nss` | 网络安全服务 |
| `libxss` | X Screen Saver 扩展 |
| `at-spi2-core` | 辅助技术支持 |
| `libdrm` | Direct Rendering Manager |
| `libxkbcommon` | 键盘处理 |
| `mesa` | 图形驱动 |

---

## 相关链接

- [Arch Linux PKGBUILD 指南](https://wiki.archlinux.org/title/PKGBUILD)
- [Arch Linux 打包规范](https://wiki.archlinux.org/title/Arch_package_guidelines)
- [AUR 提交指南](https://wiki.archlinux.org/title/AUR_submission_guidelines)
- [Wallhaven GitHub](https://github.com/xiaobili/wallhaven)
