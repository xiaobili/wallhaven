# Arch Linux 构建支持实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Wallhaven 壁纸浏览器添加完整的 Arch Linux 构建支持，包括 PKGBUILD、本地构建脚本和 AUR 发布准备。

**Architecture:** 创建 `archlinux/` 目录，包含 PKGBUILD（从源码构建生成 pacman 包）、本地构建脚本和文档。复用现有 electron-builder 配置，不修改核心代码。

**Tech Stack:** PKGBUILD、bash 脚本、.SRCINFO（AUR 元数据）

---

## 文件结构

```
archlinux/
├── README.md                 # 构建说明文档
├── build-arch-package.sh     # 本地构建脚本
├── wallhaven/
│   ├── PKGBUILD             # 稳定版 PKGBUILD
│   └── .SRCINFO             # AUR 元数据
└── .gitignore               # 忽略构建产物
```

**需要修改的文件：**
- `README.md` - 更新 Arch Linux 安装说明

---

## Task 1: 创建 archlinux 目录结构

**Files:**
- Create: `archlinux/`
- Create: `archlinux/wallhaven/`
- Create: `archlinux/.gitignore`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p archlinux/wallhaven
```

- [ ] **Step 2: 创建 .gitignore 文件**

```bash
cat > archlinux/.gitignore << 'EOF'
# 构建产物
pkg/
src/
*.pkg.tar.zst
*.tar.gz

# npm 缓存
npm-cache/

# 本地构建目录
build-local/
EOF
```

- [ ] **Step 3: 提交目录结构**

```bash
git add archlinux/.gitignore
git commit -m "feat(archlinux): add .gitignore for build artifacts"
```

---

## Task 2: 编写 PKGBUILD 文件

**Files:**
- Create: `archlinux/wallhaven/PKGBUILD`

- [ ] **Step 1: 创建 PKGBUILD 文件**

```bash
cat > archlinux/wallhaven/PKGBUILD << 'EOF'
# Maintainer: BillyJR <your-email@example.com>
# Contributor: BillyJR <your-email@example.com>

pkgname=wallhaven
pkgver=2.7.0
pkgrel=1
pkgdesc="一款优雅的跨平台桌面壁纸浏览与下载应用"
arch=('x86_64')
url="https://github.com/xiaobili/wallhaven"
license=('MIT')
depends=(
    'gtk3'
    'libnotify'
    'nss'
    'libxss'
    'at-spi2-core'
    'libdrm'
    'libxkbcommon'
    'mesa'
)
makedepends=(
    'git'
    'npm'
    'nodejs'
    'libsecret'
    'python'
    'gcc'
    'make'
)
source=("$pkgname-$pkgver.tar.gz::https://github.com/xiaobili/wallhaven/archive/v$pkgver.tar.gz")
sha256sums=('SKIP')

build() {
    cd "$srcdir/$pkgname-$pkgver"

    # 设置 npm 缓存目录
    npm install --cache="$srcdir/npm-cache"

    # 构建应用（生成 pacman 包）
    npm run build:linux
}

package() {
    cd "$srcdir/$pkgname-$pkgver"

    # 创建临时目录用于解压 pacman 包
    local extract_dir="$srcdir/extract"
    mkdir -p "$extract_dir"

    # 找到生成的 pacman 包并解压
    local pacman_file=$(find release -name "wallhaven-*.pacman" -type f | head -n1)

    if [[ -z "$pacman_file" ]]; then
        error "无法找到生成的 pacman 包"
        return 1
    fi

    # 解压 pacman 包到目标目录
    # pacman 包实际上是 tar.xz 格式
    tar -xJf "$pacman_file" -C "$pkgdir"

    # 安装许可证文件
    install -Dm644 "$srcdir/$pkgname-$pkgver/LICENSE" \
        "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}
EOF
```

- [ ] **Step 2: 提交 PKGBUILD**

```bash
git add archlinux/wallhaven/PKGBUILD
git commit -m "feat(archlinux): add PKGBUILD for building from source"
```

---

## Task 3: 编写 .SRCINFO 文件

**Files:**
- Create: `archlinux/wallhaven/.SRCINFO`

- [ ] **Step 1: 创建 .SRCINFO 文件**

```bash
cat > archlinux/wallhaven/.SRCINFO << 'EOF'
pkgbase = wallhaven
	pkgdesc = 一款优雅的跨平台桌面壁纸浏览与下载应用
	pkgver = 2.7.0
	pkgrel = 1
	url = https://github.com/xiaobili/wallhaven
	arch = x86_64
	license = MIT
	makedepends = git
	makedepends = npm
	makedepends = nodejs
	makedepends = libsecret
	makedepends = python
	makedepends = gcc
	makedepends = make
	depends = gtk3
	depends = libnotify
	depends = nss
	depends = libxss
	depends = at-spi2-core
	depends = libdrm
	depends = libxkbcommon
	depends = mesa
	source = wallhaven-2.7.0.tar.gz::https://github.com/xiaobili/wallhaven/archive/v2.7.0.tar.gz
	sha256sums = SKIP

pkgname = wallhaven
EOF
```

- [ ] **Step 2: 提交 .SRCINFO**

```bash
git add archlinux/wallhaven/.SRCINFO
git commit -m "feat(archlinux): add .SRCINFO for AUR metadata"
```

---

## Task 4: 编写本地构建脚本

**Files:**
- Create: `archlinux/build-arch-package.sh`

- [ ] **Step 1: 创建构建脚本**

```bash
cat > archlinux/build-arch-package.sh << 'EOF'
#!/usr/bin/env bash
#
# Wallhaven Arch Linux Package Builder
# 用于本地构建和测试 Arch Linux 包
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PKGBUILD_DIR="$SCRIPT_DIR/wallhaven"

# 默认值
LOCAL_BUILD=false
INSTALL_AFTER=false
CLEAN_BUILD=false

# 打印帮助信息
print_help() {
    cat << HELP
Wallhaven Arch Linux Package Builder

用法: $(basename "$0") [选项]

选项:
    -l, --local      使用本地源码构建（不克隆远程仓库）
    -i, --install    构建完成后直接安装
    -c, --clean      清理构建产物后重新构建
    -h, --help       显示此帮助信息

示例:
    $(basename "$0")                    # 标准构建
    $(basename "$0") --install          # 构建并安装
    $(basename "$0") --local --install  # 使用本地源码构建并安装
    $(basename "$0") --clean            # 清理后重新构建

HELP
}

# 打印信息
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# 清理构建产物
clean_build() {
    info "清理构建产物..."

    cd "$PKGBUILD_DIR"
    rm -rf pkg/ src/ *.pkg.tar.zst *.tar.gz npm-cache/

    # 清理本地构建目录
    if [[ -d "$SCRIPT_DIR/build-local" ]]; then
        rm -rf "$SCRIPT_DIR/build-local"
    fi

    success "清理完成"
}

# 从 package.json 提取版本号
get_version() {
    local pkg_json="$PROJECT_ROOT/package.json"
    if [[ -f "$pkg_json" ]]; then
        grep -o '"version": *"[^"]*"' "$pkg_json" | sed 's/"version": *"\([^"]*\)"/\1/' | sed 's/^v//'
    else
        error "找不到 package.json"
        exit 1
    fi
}

# 更新 PKGBUILD 版本号
update_pkgbuild_version() {
    local version="$1"
    local pkgbuild="$PKGBUILD_DIR/PKGBUILD"

    info "更新 PKGBUILD 版本号到 $version..."

    sed -i "s/^pkgver=.*/pkgver=$version/" "$pkgbuild"
    sed -i "s/^pkgrel=.*/pkgrel=1/" "$pkgbuild"

    # 更新源码 URL
    sed -i "s|source=.*|source=(\"\$pkgname-\$pkgver.tar.gz::https://github.com/xiaobili/wallhaven/archive/v\$pkgver.tar.gz\")|" "$pkgbuild"
}

# 更新 .SRCINFO 版本号
update_srcinfo_version() {
    local version="$1"
    local srcinfo="$PKGBUILD_DIR/.SRCINFO"

    info "更新 .SRCINFO 版本号到 $version..."

    sed -i "s/^\tpkgver = .*/\tpkgver = $version/" "$srcinfo"
    sed -i "s/^\tpkgrel = .*/\tpkgrel = 1/" "$srcinfo"
    sed -i "s|\tsource = .*|\tsource = wallhaven-$version.tar.gz::https://github.com/xiaobili/wallhaven/archive/v$version.tar.gz|" "$srcinfo"
}

# 本地构建
build_local() {
    info "开始本地构建..."

    local build_dir="$SCRIPT_DIR/build-local"
    local version
    version=$(get_version)

    # 创建构建目录
    mkdir -p "$build_dir"
    cd "$build_dir"

    # 复制源码
    info "复制源码到构建目录..."
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='out' --exclude='dist' --exclude='release' \
        "$PROJECT_ROOT/" "$build_dir/wallhaven-$version/"

    # 创建源码压缩包
    info "创建源码压缩包..."
    tar -czf "wallhaven-$version.tar.gz" "wallhaven-$version"

    # 复制 PKGBUILD
    cp "$PKGBUILD_DIR/PKGBUILD" .

    # 修改 PKGBUILD 使用本地源码
    sed -i "s|source=.*|source=(\"wallhaven-\$pkgver.tar.gz\")|" PKGBUILD

    # 更新版本号
    sed -i "s/^pkgver=.*/pkgver=$version/" PKGBUILD
    sed -i "s/^pkgrel=.*/pkgrel=1/" PKGBUILD

    # 构建包
    info "执行 makepkg..."
    if [[ "$INSTALL_AFTER" == true ]]; then
        makepkg -si
    else
        makepkg -s
    fi

    success "构建完成！"

    # 显示生成的包
    ls -lh *.pkg.tar.zst 2>/dev/null || warning "未找到生成的包文件"
}

# 标准构建（从 GitHub 下载源码）
build_standard() {
    info "开始标准构建..."

    cd "$PKGBUILD_DIR"

    # 更新版本号
    local version
    version=$(get_version)
    update_pkgbuild_version "$version"
    update_srcinfo_version "$version"

    # 构建包
    info "执行 makepkg..."
    if [[ "$INSTALL_AFTER" == true ]]; then
        makepkg -si
    else
        makepkg -s
    fi

    success "构建完成！"

    # 显示生成的包
    ls -lh *.pkg.tar.zst 2>/dev/null || warning "未找到生成的包文件"
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--local)
                LOCAL_BUILD=true
                shift
                ;;
            -i|--install)
                INSTALL_AFTER=true
                shift
                ;;
            -c|--clean)
                CLEAN_BUILD=true
                shift
                ;;
            -h|--help)
                print_help
                exit 0
                ;;
            *)
                error "未知选项: $1"
                print_help
                exit 1
                ;;
        esac
    done
}

# 检查依赖
check_dependencies() {
    info "检查构建依赖..."

    local missing_deps=()

    if ! command -v makepkg &> /dev/null; then
        missing_deps+=("pacman")
    fi

    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi

    if ! command -v node &> /dev/null; then
        missing_deps+=("nodejs")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "缺少以下依赖: ${missing_deps[*]}"
        error "请安装后重试: sudo pacman -S ${missing_deps[*]}"
        exit 1
    fi

    success "依赖检查通过"
}

# 主函数
main() {
    parse_args "$@"

    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════╗"
    echo "║   Wallhaven Arch Linux Package Builder     ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"

    check_dependencies

    # 清理构建产物
    if [[ "$CLEAN_BUILD" == true ]]; then
        clean_build
    fi

    # 执行构建
    if [[ "$LOCAL_BUILD" == true ]]; then
        build_local
    else
        build_standard
    fi
}

main "$@"
EOF

chmod +x archlinux/build-arch-package.sh
```

- [ ] **Step 2: 提交构建脚本**

```bash
git add archlinux/build-arch-package.sh
git commit -m "feat(archlinux): add local build script with options"
```

---

## Task 5: 编写 archlinux README 文档

**Files:**
- Create: `archlinux/README.md`

- [ ] **Step 1: 创建 README 文档**

```bash
cat > archlinux/README.md << 'EOF'
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

Wallhaven 已发布到 AUR，可以使用 AUR 助手安装：

### 使用 yay

```bash
yay -S wallhaven
```

### 使用 paru

```bash
paru -S wallhaven
```

### 手动安装

```bash
git clone https://aur.archlinux.org/wallhaven.git
cd wallhaven
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
EOF
```

- [ ] **Step 2: 提交 README 文档**

```bash
git add archlinux/README.md
git commit -m "docs(archlinux): add comprehensive build guide"
```

---

## Task 6: 更新主 README.md 的 Arch Linux 说明

**Files:**
- Modify: `README.md:188-201`

- [ ] **Step 1: 更新 Arch Linux 安装说明**

在 `README.md` 中找到第 188-201 行的 Arch Linux 安装部分，替换为：

```markdown
### Arch Linux 安装

Arch Linux 用户可以通过以下方式安装：

#### 从 AUR 安装（推荐）

```bash
# 使用 yay
yay -S wallhaven

# 或使用 paru
paru -S wallhaven
```

#### 从源码构建

```bash
# 方式一：使用构建脚本
cd archlinux
./build-arch-package.sh --local --install

# 方式二：手动构建
cd archlinux/wallhaven
makepkg -si
```

详细说明请参见 [archlinux/README.md](archlinux/README.md)。
```

- [ ] **Step 2: 提交 README 更新**

```bash
git add README.md
git commit -m "docs: update Arch Linux installation instructions"
```

---

## Task 7: 验证和最终提交

**Files:**
- 无新文件创建

- [ ] **Step 1: 验证文件结构**

```bash
# 检查所有文件是否存在
ls -la archlinux/
ls -la archlinux/wallhaven/
```

预期输出应包含：
- `archlinux/README.md`
- `archlinux/build-arch-package.sh`
- `archlinux/.gitignore`
- `archlinux/wallhaven/PKGBUILD`
- `archlinux/wallhaven/.SRCINFO`

- [ ] **Step 2: 验证 PKGBUILD 语法**

```bash
# 检查 PKGBUILD 语法（如果 namcap 可用）
namcap archlinux/wallhaven/PKGBUILD || true
```

- [ ] **Step 3: 最终提交（如有遗漏文件）**

```bash
git status
# 如有未提交的文件，添加并提交
git add -A
git commit -m "feat(archlinux): complete Arch Linux build support" || echo "没有需要提交的更改"
```

---

## 完成检查

实施完成后，验证以下内容：

- [ ] `archlinux/` 目录结构完整
- [ ] `PKGBUILD` 可以成功构建
- [ ] `.SRCINFO` 与 PKGBUILD 同步
- [ ] `build-arch-package.sh` 可执行且有正确权限
- [ ] `archlinux/README.md` 文档完整
- [ ] 主 `README.md` 已更新安装说明
- [ ] 所有文件已提交到 Git

---

## 后续步骤

实施完成后：

1. **本地测试**：在 Arch Linux 系统上运行 `./build-arch-package.sh --local --install`
2. **AUR 发布**：按照 `archlinux/README.md` 中的说明发布到 AUR
3. **版本更新流程**：建立版本更新时同步更新 PKGBUILD 和 .SRCINFO 的流程
