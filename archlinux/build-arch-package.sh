#!/bin/bash
# Arch Linux 包构建脚本
# 用法: ./build-arch-package.sh [选项]
#
# 选项:
#   -b, --build     构建包 (默认)
#   -i, --install   构建并安装包
#   -c, --clean     清理构建文件
#   -h, --help      显示帮助信息

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${PROJECT_ROOT}/archlinux/build"

# 默认操作
ACTION="build"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--build)
            ACTION="build"
            shift
            ;;
        -i|--install)
            ACTION="install"
            shift
            ;;
        -c|--clean)
            ACTION="clean"
            shift
            ;;
        -h|--help)
            echo "Arch Linux 包构建脚本"
            echo ""
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  -b, --build     构建包 (默认)"
            echo "  -i, --install   构建并安装包"
            echo "  -c, --clean     清理构建文件"
            echo "  -h, --help      显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0              # 构建包"
            echo "  $0 --install    # 构建并安装"
            echo "  $0 --clean      # 清理构建文件"
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            exit 1
            ;;
    esac
done

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}检查依赖...${NC}"

    local missing_deps=()

    # 检查必要的工具
    for dep in npm node makepkg; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done

    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}缺少以下依赖:${NC}"
        printf '  - %s\n' "${missing_deps[@]}"
        echo ""
        echo "请安装缺少的依赖后重试。"
        echo "在 Arch Linux 上可以运行:"
        echo "  sudo pacman -S nodejs npm base-devel"
        exit 1
    fi

    echo -e "${GREEN}所有依赖已满足${NC}"
}

# 清理构建文件
clean_build() {
    echo -e "${YELLOW}清理构建文件...${NC}"

    rm -rf "$BUILD_DIR"
    rm -f "${PROJECT_ROOT}/archlinux"/*.pkg.tar.zst
    rm -f "${PROJECT_ROOT}/archlinux"/*.src.tar.gz

    echo -e "${GREEN}清理完成${NC}"
}

# 构建包
build_package() {
    echo -e "${YELLOW}开始构建 Arch Linux 包...${NC}"

    # 检查依赖
    check_dependencies

    # 切换到 archlinux 目录
    cd "${PROJECT_ROOT}/archlinux"

    # 清理旧的构建文件
    rm -rf src pkg *.pkg.tar.zst *.src.tar.gz

    # 运行 makepkg
    if [ "$ACTION" = "install" ]; then
        echo -e "${YELLOW}构建并安装包...${NC}"
        makepkg -si
    else
        echo -e "${YELLOW}仅构建包...${NC}"
        makepkg -s
    fi

    # 检查构建结果
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ 构建成功!${NC}"
        echo ""
        echo "构建产物位于:"
        ls -lh *.pkg.tar.zst 2>/dev/null || echo "  (未找到 .pkg.tar.zst 文件)"
        echo ""

        if [ "$ACTION" != "install" ]; then
            echo "安装命令:"
            echo "  sudo pacman -U *.pkg.tar.zst"
            echo ""
            echo "或使用本脚本:"
            echo "  $0 --install"
        fi
    else
        echo -e "${RED}✗ 构建失败${NC}"
        exit 1
    fi
}

# 执行操作
case $ACTION in
    clean)
        clean_build
        ;;
    build|install)
        build_package
        ;;
esac
