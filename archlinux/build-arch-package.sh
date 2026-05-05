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
