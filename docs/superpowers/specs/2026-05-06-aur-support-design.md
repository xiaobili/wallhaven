# Arch Linux AUR 支持设计文档

**日期**：2026-05-06
**版本**：v1.0
**作者**：BillyJR
**状态**：待实施

---

## 概述

本文档描述如何为 Wallhaven 壁纸浏览器添加 Arch Linux User Repository (AUR) 自动化发布支持。目标是实现完全自动化的发布流程，当发布新版本时自动更新 AUR 包。

---

## 目标

### 主要目标

1. 发布 `wallhaven-bin` 到 AUR
2. 实现版本更新时自动推送到 AUR
3. 提供 AUR 账户注册和配置指南

### 成功标准

- ✅ 用户可通过 `yay -S wallhaven-bin` 或 `paru -S wallhaven-bin` 安装
- ✅ 新版本发布后，AUR 包自动更新
- ✅ 安装后应用可正常运行
- ✅ 版本号与 GitHub Release 保持同步

---

## 架构设计

### 整体流程

```
GitHub Push/Release
        │
        ▼
┌──────────────────────┐
│  GitHub Actions      │
│  - 构建各平台产物     │
│  - 上传到 Release    │
│  - 触发 AUR 更新     │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│  GitHub Release      │
│  - wallhaven-x.x.x.pacman │
│  - 其他平台产物       │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│  AUR 仓库            │
│  wallhaven-bin       │
│  - PKGBUILD          │
│  - .SRCINFO          │
│  - .install          │
└──────────────────────┘
```

### 发布触发机制

1. **自动触发**：当 GitHub Release 发布时
2. **手动触发**：通过 GitHub Actions workflow_dispatch

---

## 组件设计

### 1. PKGBUILD 文件

**位置**：`archlinux/wallhaven-bin/PKGBUILD`

**包名**：`wallhaven-bin`

**构建方式**：从 GitHub Release 下载预编译的 `.pacman` 文件

**关键特性**：
- 无需编译依赖（减少构建时间）
- 从 Release 下载二进制文件
- SHA256 校验和验证
- 简化的安装流程

**依赖声明**：

运行时依赖（depends）：
- `gtk3`：GUI 工具包
- `libnotify`：桌面通知
- `nss`：网络安全服务
- `libxss`：X Screen Saver 扩展
- `at-spi2-core`：辅助技术支持
- `libdrm`：Direct Rendering Manager
- `libxkbcommon`：键盘处理
- `mesa`：图形驱动

构建依赖（makedepends）：
- 无（使用预编译二进制）

**安装流程**：
```bash
package() {
    # 解压 .pacman 文件
    tar -xJf "$srcdir/wallhaven-$pkgver.pacman" -C "$pkgdir"
}
```

---

### 2. .SRCINFO 文件

**位置**：`archlinux/wallhaven-bin/.SRCINFO`

**用途**：AUR 网站解析包元数据

**生成方式**：`makepkg --printsrcinfo > .SRCINFO`

**内容示例**：
```
pkgbase = wallhaven-bin
	pkgdesc = 一款优雅的跨平台桌面壁纸浏览与下载应用
	pkgver = 2.7.0
	pkgrel = 1
	url = https://github.com/xiaobili/wallhaven
	arch = x86_64
	license = MIT
	depends = gtk3
	depends = libnotify
	depends = nss
	depends = libxss
	depends = at-spi2-core
	depends = libdrm
	depends = libxkbcommon
	depends = mesa
	source = wallhaven-2.7.0.pacman::https://github.com/xiaobili/wallhaven/releases/download/v2.7.0/wallhaven-2.7.0.pacman
	sha256sums = SKIP

pkgname = wallhaven-bin
```

---

### 3. 安装脚本

**位置**：`archlinux/wallhaven-bin/wallhaven-bin.install`

**内容**：
```bash
post_install() {
    echo ""
    echo "Wallhaven 壁纸浏览器已安装成功！"
    echo ""
    echo "使用方法："
    echo "  运行应用：wallhaven"
    echo "  查看文档：https://github.com/xiaobili/wallhaven"
    echo ""
    echo "如果遇到问题，请访问："
    echo "  https://github.com/xiaobili/wallhaven/issues"
    echo ""
}

post_upgrade() {
    post_install
}
```

---

### 4. GitHub Actions 工作流

**位置**：`.github/workflows/aur-publish.yml`

**触发条件**：
- `release` 事件（发布 Release 时）
- `workflow_dispatch`（手动触发）

**工作流程**：

#### Step 1: 检出代码
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

#### Step 2: 获取版本号
```yaml
- name: Get version
  id: version
  run: |
    VERSION=$(node -p "require('./package.json').version")
    echo "version=$VERSION" >> $GITHUB_OUTPUT
```

#### Step 3: 下载 .pacman 文件
```yaml
- name: Download .pacman file
  run: |
    wget -O wallhaven-${{ steps.version.outputs.version }}.pacman \
      https://github.com/xiaobili/wallhaven/releases/download/v${{ steps.version.outputs.version }}/wallhaven-${{ steps.version.outputs.version }}.pacman
```

#### Step 4: 计算 SHA256
```yaml
- name: Calculate SHA256
  id: sha256
  run: |
    SHA256=$(sha256sum wallhaven-${{ steps.version.outputs.version }}.pacman | awk '{print $1}')
    echo "sha256=$SHA256" >> $GITHUB_OUTPUT
```

#### Step 5: 更新 PKGBUILD
```yaml
- name: Update PKGBUILD
  run: |
    cd archlinux/wallhaven-bin
    sed -i "s/pkgver=.*/pkgver=${{ steps.version.outputs.version }}/" PKGBUILD
    sed -i "s/sha256sums=.*/sha256sums=('${{ steps.sha256.outputs.sha256 }}')/" PKGBUILD
```

#### Step 6: 生成 .SRCINFO
```yaml
- name: Generate .SRCINFO
  run: |
    cd archlinux/wallhaven-bin
    docker run --rm -v $(pwd):/src archlinux:latest \
      sh -c "pacman -Sy --noconfirm pacman-contrib && cd /src && makepkg --printsrcinfo > .SRCINFO"
```

#### Step 7: 推送到 AUR
```yaml
- name: Publish to AUR
  uses: KSXGitHub/github-actions-deploy-aur@v2.7.0
  with:
    pkgname: wallhaven-bin
    pkgbuild: ./archlinux/wallhaven-bin/PKGBUILD
    commit_username: ${{ secrets.AUR_USERNAME }}
    commit_email: ${{ secrets.AUR_EMAIL }}
    ssh_private_key: ${{ secrets.AUR_SSH_PRIVATE_KEY }}
    commit_message: "Update to v${{ steps.version.outputs.version }}"
```

---

### 5. 构建流程修改

**文件**：`.github/workflows/build.yml`

**修改点**：在 Linux 构建任务中添加 `.pacman` 文件上传

```yaml
- name: Build application
  run: npm run build:linux
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Upload Linux artifacts
  uses: actions/upload-artifact@v4
  with:
    name: wallhaven-linux
    path: |
      dist/*.AppImage
      dist/*.snap
      dist/*.deb
      dist/*.pacman  # 添加这行
    if-no-files-found: error
```

**Release 步骤修改**：
```yaml
- name: Create Release
  uses: softprops/action-gh-release@v2
  with:
    files: |
      artifacts/wallhaven-windows/*
      artifacts/wallhaven-macos-arm64/*
      artifacts/wallhaven-macos-x64/*
      artifacts/wallhaven-linux/*
```

---

### 6. AUR 账户注册指南

**位置**：`docs/aur-setup-guide.md`

**内容大纲**：

1. **注册 AUR 账户**
   - 访问 https://aur.archlinux.org/register/
   - 填写用户名、邮箱、密码

2. **生成 SSH 密钥对**
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/aur_key
   ```

3. **添加公钥到 AUR**
   - 登录 AUR 账户
   - 进入 "My Account" → "SSH Public Keys"
   - 粘贴 `~/.ssh/aur_key.pub` 内容

4. **配置 GitHub Secrets**
   - `AUR_USERNAME`：AUR 用户名
   - `AUR_EMAIL`：AUR 邮箱
   - `AUR_SSH_PRIVATE_KEY`：私钥内容（`cat ~/.ssh/aur_key`）

5. **验证配置**
   ```bash
   ssh -i ~/.ssh/aur_key aur@aur.archlinux.org help
   ```

---

### 7. README.md 更新

**修改点**：

1. 更新 AUR 安装命令：
   ```bash
   # 使用 yay
   yay -S wallhaven-bin

   # 或使用 paru
   paru -S wallhaven-bin
   ```

2. 添加 AUR 徽章：
   ```markdown
   [![AUR version](https://img.shields.io/aur/version/wallhaven-bin)](https://aur.archlinux.org/packages/wallhaven-bin)
   ```

3. 更新 Arch Linux 安装章节：
   - 从 AUR 安装（推荐）
   - 从源码构建（archlinux 目录）

---

## 文件清单

| 文件路径 | 用途 | 操作 |
|---------|------|------|
| `archlinux/wallhaven-bin/PKGBUILD` | AUR 包定义 | 创建 |
| `archlinux/wallhaven-bin/.SRCINFO` | AUR 元数据 | 创建 |
| `archlinux/wallhaven-bin/wallhaven-bin.install` | 安装提示 | 创建 |
| `.github/workflows/aur-publish.yml` | 自动发布工作流 | 创建 |
| `docs/aur-setup-guide.md` | 账户注册指南 | 创建 |
| `.github/workflows/build.yml` | 构建流程 | 修改（添加 .pacman 上传） |
| `README.md` | 项目说明 | 修改（更新安装说明） |
| `archlinux/README.md` | Arch 构建指南 | 修改（添加 wallhaven-bin 说明） |

---

## GitHub Secrets 配置

| Secret 名称 | 用途 | 必需 |
|------------|------|------|
| `AUR_SSH_PRIVATE_KEY` | AUR 推送权限 | ✅ |
| `AUR_USERNAME` | Git 提交用户名 | ✅ |
| `AUR_EMAIL` | Git 提交邮箱 | ✅ |

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| AUR 包名被占用 | 无法使用 wallhaven-bin | 低 | 发布前检查可用性 |
| SSH 密钥泄露 | AUR 仓库被恶意修改 | 低 | 使用专用密钥，定期轮换 |
| GitHub Release 上传失败 | 无法发布到 AUR | 中 | 添加重试机制，手动触发选项 |
| 版本号不匹配 | 用户安装失败 | 低 | 自动从 package.json 读取 |
| .pacman 文件损坏 | 用户安装失败 | 低 | SHA256 校验和验证 |
| 依赖缺失 | 运行时错误 | 低 | 完整列出所有运行时依赖 |

---

## 测试计划

### 1. 本地测试

**测试 PKGBUILD**：
```bash
cd archlinux/wallhaven-bin
makepkg -si
```

**验证安装**：
- 应用可正常启动
- 所有功能正常工作
- 依赖完整

### 2. CI/CD 测试

**测试 GitHub Actions**：
1. 手动触发 `aur-publish.yml` 工作流
2. 检查 AUR 仓库是否更新
3. 验证 `.SRCINFO` 是否正确生成

### 3. 用户测试

**测试安装流程**：
```bash
yay -S wallhaven-bin
wallhaven
```

**验证更新**：
- 发布新版本
- 用户通过 `yay -Syu` 获取更新
- 版本号正确

---

## 发布流程

### 首次发布（一次性设置）

1. ✅ 注册 AUR 账户
2. ✅ 生成 SSH 密钥对
3. ✅ 添加公钥到 AUR 账户
4. ✅ 配置 GitHub Secrets
5. ✅ 创建 GitHub Release（v2.7.0）
6. ✅ GitHub Actions 自动发布到 AUR
7. ✅ 验证 AUR 页面：https://aur.archlinux.org/packages/wallhaven-bin

### 后续更新（自动化）

1. 更新 `package.json` 版本号
2. 推送代码到 `main` 分支
3. GitHub Actions 构建并发布 Release
4. 自动触发 AUR 更新
5. 用户通过 `yay/paru` 获取更新

---

## 验收标准

### 功能验收

- [ ] 用户可通过 `yay -S wallhaven-bin` 安装
- [ ] 安装后应用可正常启动
- [ ] 所有功能正常工作
- [ ] 发布新版本时 AUR 自动更新

### 技术验收

- [ ] PKGBUILD 符合 AUR 标准
- [ ] .SRCINFO 与 PKGBUILD 同步
- [ ] GitHub Actions 工作流正常执行
- [ ] 所有依赖完整列出

### 文档验收

- [ ] README.md 包含正确的安装说明
- [ ] AUR 设置指南完整清晰
- [ ] archlinux/README.md 更新

---

## 参考资料

- [Arch Linux PKGBUILD 指南](https://wiki.archlinux.org/title/PKGBUILD)
- [Arch Linux 打包规范](https://wiki.archlinux.org/title/Arch_package_guidelines)
- [AUR 提交指南](https://wiki.archlinux.org/title/AUR_submission_guidelines)
- [GitHub Actions 部署到 AUR](https://github.com/KSXGitHub/github-actions-deploy-aur)
- [electron-builder pacman 目标](https://www.electron.build/configuration/linux.html#pacman)

---

## 附录

### A. 完整 PKGBUILD 示例

```bash
# Maintainer: BillyJR <your-email@example.com>
# Contributor: BillyJR <your-email@example.com>

pkgname=wallhaven-bin
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
install="$pkgname.install"
source=("wallhaven-$pkgver.pacman::https://github.com/xiaobili/wallhaven/releases/download/v$pkgver/wallhaven-$pkgver.pacman")
sha256sums=('SKIP')

package() {
    # 解压 .pacman 文件到目标目录
    tar -xJf "$srcdir/wallhaven-$pkgver.pacman" -C "$pkgdir" --exclude='.{MTREE,PKGINFO,BUILDINFO}'

    # 安装许可证文件
    install -Dm644 "$pkgdir/usr/share/licenses/wallhaven/LICENSE" \
        "$pkgdir/usr/share/licenses/$pkgname/LICENSE" 2>/dev/null || true
}
```

### B. 完整 GitHub Actions 工作流

```yaml
name: Publish to AUR

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to publish (e.g., 2.7.0)'
        required: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Get version
        id: version
        run: |
          if [ -n "${{ github.event.inputs.version }}" ]; then
            VERSION="${{ github.event.inputs.version }}"
          else
            VERSION=$(node -p "require('./package.json').version")
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Download .pacman file
        run: |
          wget -O wallhaven-${{ steps.version.outputs.version }}.pacman \
            https://github.com/xiaobili/wallhaven/releases/download/v${{ steps.version.outputs.version }}/wallhaven-${{ steps.version.outputs.version }}.pacman

      - name: Calculate SHA256
        id: sha256
        run: |
          SHA256=$(sha256sum wallhaven-${{ steps.version.outputs.version }}.pacman | awk '{print $1}')
          echo "sha256=$SHA256" >> $GITHUB_OUTPUT

      - name: Update PKGBUILD
        run: |
          cd archlinux/wallhaven-bin
          sed -i "s/pkgver=.*/pkgver=${{ steps.version.outputs.version }}/" PKGBUILD
          sed -i "s/sha256sums=.*/sha256sums=('${{ steps.sha256.outputs.sha256 }}')/" PKGBUILD

      - name: Generate .SRCINFO
        run: |
          cd archlinux/wallhaven-bin
          docker run --rm -v $(pwd):/src archlinux:latest \
            sh -c "pacman -Sy --noconfirm pacman-contrib && cd /src && makepkg --printsrcinfo > .SRCINFO"

      - name: Publish to AUR
        uses: KSXGitHub/github-actions-deploy-aur@v2.7.0
        with:
          pkgname: wallhaven-bin
          pkgbuild: ./archlinux/wallhaven-bin/PKGBUILD
          commit_username: ${{ secrets.AUR_USERNAME }}
          commit_email: ${{ secrets.AUR_EMAIL }}
          ssh_private_key: ${{ secrets.AUR_SSH_PRIVATE_KEY }}
          commit_message: "Update to v${{ steps.version.outputs.version }}"
```

---

**文档结束**
