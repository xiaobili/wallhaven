# Arch Linux 安装指南

本目录包含用于在 Arch Linux 及其衍生发行版（如 Manjaro、EndeavourOS）上构建和安装 Wallhaven 的文件。

## 文件说明

| 文件 | 说明 |
|------|------|
| `PKGBUILD` | Arch Linux 包构建脚本 |
| `wallhaven.desktop` | XDG 桌面入口文件 |
| `wallhaven.install` | 安装/卸载钩子脚本 |
| `build-arch-package.sh` | 辅助构建脚本 |

## 安装方式

### 方式一：使用 AUR（推荐）

如果此包已发布到 AUR（Arch User Repository），可以使用 AUR 助手安装：

```bash
# 使用 yay
yay -S wallhaven-app

# 或使用 paru
paru -S wallhaven-app
```

### 方式二：从源码构建

#### 1. 安装依赖

```bash
sudo pacman -S --needed base-devel nodejs npm git
```

#### 2. 克隆仓库

```bash
git clone https://github.com/BillyJR/wallhaven.git
cd wallhaven
```

#### 3. 构建包

**选项 A：使用构建脚本（推荐）**

```bash
# 仅构建
./archlinux/build-arch-package.sh

# 构建并安装
./archlinux/build-arch-package.sh --install
```

**选项 B：手动构建**

```bash
cd archlinux

# 构建包
makepkg -s

# 安装包
sudo pacman -U wallhaven-app-*.pkg.tar.zst
```

### 方式三：使用已发布的二进制包

从 [Releases](https://github.com/BillyJR/wallhaven/releases) 页面下载 `.pkg.tar.zst` 文件：

```bash
sudo pacman -U wallhaven-app-*.pkg.tar.zst
```

## 使用方法

安装后，可以通过以下方式启动应用：

1. **从应用菜单启动**: 在应用菜单中搜索 "Wallhaven"
2. **从终端启动**: 运行 `wallhaven` 命令

## 卸载

```bash
sudo pacman -Rns wallhaven-app
```

> 注意：卸载后，您的配置文件和下载的壁纸仍保存在 `~/.config/wallhaven/` 目录中。

## 故障排除

### 问题：构建时提示缺少依赖

确保已安装所有构建依赖：

```bash
sudo pacman -S --needed base-devel nodejs npm
```

### 问题：应用启动失败

检查 Electron 依赖是否正确安装：

```bash
sudo pacman -S electron gtk3 libnotify libsecret libxtst nss alsa-lib libcups libxss nspr at-spi2-core
```

### 问题：图标不显示

更新图标缓存：

```bash
sudo gtk-update-icon-cache /usr/share/icons/hicolor
```

### 问题：Wayland 支持问题

如果使用 Wayland 显示服务器，可能需要设置环境变量：

```bash
export ELECTRON_OZONE_PLATFORM_HINT=auto
```

或在 `/etc/environment` 中添加此行。

## 开发构建

如果您想修改代码并测试：

```bash
# 安装 Node.js 依赖
npm install

# 开发模式运行
npm run dev

# 构建 Linux 版本
npm run build:linux
```

## 贡献

欢迎贡献！如果您改进了 PKGBUILD 或添加了新功能，请提交 Pull Request。

## 许可证

本项目采用 MIT 许可证。详见项目根目录的 LICENSE 文件。
