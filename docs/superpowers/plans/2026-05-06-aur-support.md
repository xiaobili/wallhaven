# Arch Linux AUR 支持实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Wallhaven 添加 Arch Linux AUR 自动化发布支持，实现从 GitHub Release 到 AUR 的完全自动化流程。

**Architecture:** 创建 `wallhaven-bin` AUR 包，从 GitHub Release 下载预编译的 `.pacman` 文件。使用 GitHub Actions 在 Release 发布时自动更新 PKGBUILD 和 .SRCINFO，并推送到 AUR 仓库。

**Tech Stack:** PKGBUILD, GitHub Actions, AUR SSH, Docker (for .SRCINFO generation)

---

## 文件结构

```
archlinux/
├── wallhaven-bin/                    # 新增：AUR bin 包
│   ├── PKGBUILD                      # AUR 包定义
│   ├── .SRCINFO                      # AUR 元数据
│   └── wallhaven-bin.install         # 安装后提示
├── wallhaven/                        # 现有：源码构建包
│   └── PKGBUILD
├── README.md                         # 修改：添加 wallhaven-bin 说明
└── build-arch-package.sh             # 现有：本地构建脚本

.github/workflows/
├── build.yml                         # 修改：添加 .pacman 上传
└── aur-publish.yml                   # 新增：AUR 自动发布工作流

docs/
└── aur-setup-guide.md                # 新增：AUR 账户设置指南

README.md                             # 修改：更新 AUR 安装说明
```

---

## Task 1: 创建 wallhaven-bin PKGBUILD 文件

**Files:**
- Create: `archlinux/wallhaven-bin/PKGBUILD`

**目的:** 创建从 GitHub Release 下载预编译二进制的 PKGBUILD

- [ ] **Step 1: 创建 wallhaven-bin 目录**

```bash
mkdir -p archlinux/wallhaven-bin
```

- [ ] **Step 2: 创建 PKGBUILD 文件**

创建文件 `archlinux/wallhaven-bin/PKGBUILD`：

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
    # 解压 .pacman 文件到目标目录，排除 pacman 元数据文件
    tar -xJf "$srcdir/wallhaven-$pkgver.pacman" -C "$pkgdir" --exclude='.{MTREE,PKGINFO,BUILDINFO}'

    # 安装许可证文件（如果存在）
    install -Dm644 "$pkgdir/usr/share/licenses/wallhaven/LICENSE" \
        "$pkgdir/usr/share/licenses/$pkgname/LICENSE" 2>/dev/null || true
}
```

- [ ] **Step 3: 验证 PKGBUILD 语法**

```bash
cd archlinux/wallhaven-bin
bash -n PKGBUILD && echo "PKGBUILD syntax OK"
```

预期输出：`PKGBUILD syntax OK`

---

## Task 2: 创建 wallhaven-bin.install 文件

**Files:**
- Create: `archlinux/wallhaven-bin/wallhaven-bin.install`

**目的:** 提供安装后的用户提示信息

- [ ] **Step 1: 创建 install 脚本**

创建文件 `archlinux/wallhaven-bin/wallhaven-bin.install`：

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

- [ ] **Step 2: 验证 install 脚本语法**

```bash
cd archlinux/wallhaven-bin
bash -n wallhaven-bin.install && echo "Install script syntax OK"
```

预期输出：`Install script syntax OK`

---

## Task 3: 创建初始 .SRCINFO 文件

**Files:**
- Create: `archlinux/wallhaven-bin/.SRCINFO`

**目的:** 创建 AUR 元数据文件，供 AUR 网站解析

- [ ] **Step 1: 创建 .SRCINFO 文件**

创建文件 `archlinux/wallhaven-bin/.SRCINFO`：

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
	install = wallhaven-bin.install
	source = wallhaven-2.7.0.pacman::https://github.com/xiaobili/wallhaven/releases/download/v2.7.0/wallhaven-2.7.0.pacman
	sha256sums = SKIP

pkgname = wallhaven-bin
```

---

## Task 4: 创建 AUR 自动发布 GitHub Actions 工作流

**Files:**
- Create: `.github/workflows/aur-publish.yml`

**目的:** 自动化 AUR 包发布流程，在 Release 发布时自动更新 AUR

- [ ] **Step 1: 创建工作流文件**

创建文件 `.github/workflows/aur-publish.yml`：

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
          echo "Publishing version: $VERSION"

      - name: Download .pacman file
        run: |
          wget -O wallhaven-${{ steps.version.outputs.version }}.pacman \
            https://github.com/xiaobili/wallhaven/releases/download/v${{ steps.version.outputs.version }}/wallhaven-${{ steps.version.outputs.version }}.pacman

      - name: Calculate SHA256
        id: sha256
        run: |
          SHA256=$(sha256sum wallhaven-${{ steps.version.outputs.version }}.pacman | awk '{print $1}')
          echo "sha256=$SHA256" >> $GITHUB_OUTPUT
          echo "SHA256: $SHA256"

      - name: Update PKGBUILD
        run: |
          cd archlinux/wallhaven-bin
          sed -i "s/pkgver=.*/pkgver=${{ steps.version.outputs.version }}/" PKGBUILD
          sed -i "s/sha256sums=.*/sha256sums=('${{ steps.sha256.outputs.sha256 }}')/" PKGBUILD
          echo "Updated PKGBUILD:"
          cat PKGBUILD

      - name: Generate .SRCINFO
        run: |
          cd archlinux/wallhaven-bin
          docker run --rm -v $(pwd):/src archlinux:latest \
            sh -c "pacman -Sy --noconfirm pacman-contrib && cd /src && makepkg --printsrcinfo > .SRCINFO"
          echo "Generated .SRCINFO:"
          cat .SRCINFO

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

- [ ] **Step 2: 验证 YAML 语法**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/aur-publish.yml'))" && echo "YAML syntax OK"
```

预期输出：`YAML syntax OK`

---

## Task 5: 修改构建工作流以支持 .pacman 文件

**Files:**
- Modify: `.github/workflows/build.yml`

**目的:** 在 Linux 构建中添加 `.pacman` 文件的上传

- [ ] **Step 1: 修改 Linux 构建任务**

找到 `.github/workflows/build.yml` 文件的第 189-197 行（Upload Linux artifacts 步骤），替换为：

```yaml
      - name: Upload Linux artifacts
        uses: actions/upload-artifact@v4
        with:
          name: wallhaven-linux
          path: |
            dist/*.AppImage
            dist/*.snap
            dist/*.deb
            dist/*.pacman
          if-no-files-found: error
```

注意：只需在 `path` 列表中添加 `dist/*.pacman` 这一行。

- [ ] **Step 2: 验证修改后的 YAML 语法**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))" && echo "YAML syntax OK"
```

预期输出：`YAML syntax OK`

---

## Task 6: 创建 AUR 账户设置指南

**Files:**
- Create: `docs/aur-setup-guide.md`

**目的:** 提供完整的 AUR 账户注册和配置步骤

- [ ] **Step 1: 创建设置指南文档**

创建文件 `docs/aur-setup-guide.md`：

```markdown
# AUR 账户设置指南

本指南将帮助您完成 AUR (Arch User Repository) 账户注册和配置，以便自动发布 Wallhaven 到 AUR。

## 目录

- [前置条件](#前置条件)
- [第一步：注册 AUR 账户](#第一步注册-aur-账户)
- [第二步：生成 SSH 密钥对](#第二步生成-ssh-密钥对)
- [第三步：添加公钥到 AUR](#第三步添加公钥到-aur)
- [第四步：配置 GitHub Secrets](#第四步配置-github-secrets)
- [第五步：验证配置](#第五步验证配置)
- [常见问题](#常见问题)

---

## 前置条件

- 有效的邮箱地址
- GitHub 仓库的管理员权限
- 本地已安装 `ssh-keygen` 工具

---

## 第一步：注册 AUR 账户

1. 访问 AUR 注册页面：https://aur.archlinux.org/register/

2. 填写注册信息：
   - **Username**：选择一个用户名（记住这个用户名，后面需要配置到 GitHub Secrets）
   - **Email**：输入有效的邮箱地址
   - **Password**：设置一个强密码
   - **CAPTCHA**：完成人机验证

3. 点击 "Register" 提交注册

4. 检查邮箱，点击验证链接完成注册

---

## 第二步：生成 SSH 密钥对

AUR 使用 SSH 密钥进行身份验证。建议为 AUR 创建专用的 SSH 密钥。

1. **生成密钥对**

```bash
# 生成 ED25519 SSH 密钥（推荐）
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/aur_key

# 当提示输入密码时，可以直接回车（无密码）或设置密码
```

2. **查看生成的密钥**

```bash
# 查看私钥（需要添加到 GitHub Secrets）
cat ~/.ssh/aur_key

# 查看公钥（需要添加到 AUR 账户）
cat ~/.ssh/aur_key.pub
```

3. **配置 SSH 使用该密钥（可选）**

如果希望系统自动使用该密钥连接 AUR，可以添加到 SSH 配置：

```bash
# 编辑 SSH 配置文件
nano ~/.ssh/config

# 添加以下内容
Host aur.archlinux.org
    IdentityFile ~/.ssh/aur_key
    User aur
```

---

## 第三步：添加公钥到 AUR

1. **登录 AUR**

访问 https://aur.archlinux.org/login/ 并使用刚才注册的账户登录

2. **进入账户设置**

点击右上角的用户名 → "My Account"

3. **添加 SSH 公钥**

- 找到 "SSH Public Keys" 部分
- 点击 "Add key"
- 粘贴 `~/.ssh/aur_key.pub` 的完整内容
- 点击 "Save"

4. **验证公钥格式**

公钥应该类似这样：
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your-email@example.com
```

---

## 第四步：配置 GitHub Secrets

需要将 AUR 的认证信息添加到 GitHub 仓库的 Secrets 中。

1. **访问 GitHub 仓库设置**

- 进入仓库：https://github.com/xiaobili/wallhaven
- 点击 "Settings" → "Secrets and variables" → "Actions"

2. **添加 AUR_SSH_PRIVATE_KEY**

- 点击 "New repository secret"
- **Name**：`AUR_SSH_PRIVATE_KEY`
- **Value**：粘贴私钥内容（`cat ~/.ssh/aur_key` 的输出）
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ...（完整的私钥内容）...
  -----END OPENSSH PRIVATE KEY-----
  ```
- 点击 "Add secret"

3. **添加 AUR_USERNAME**

- 点击 "New repository secret"
- **Name**：`AUR_USERNAME`
- **Value**：您的 AUR 用户名
- 点击 "Add secret"

4. **添加 AUR_EMAIL**

- 点击 "New repository secret"
- **Name**：`AUR_EMAIL`
- **Value**：您注册 AUR 时使用的邮箱地址
- 点击 "Add secret"

---

## 第五步：验证配置

1. **验证 SSH 连接**

```bash
# 测试 SSH 连接到 AUR
ssh -i ~/.ssh/aur_key aur@aur.archlinux.org help
```

预期输出：
```
Welcome to the AUR, <username>!
Commands:
  help
  list-repos
  restore <pkgbase>
  git-receive-pack '<repo>'
  git-upload-pack '<repo>'
```

如果看到 "Welcome to the AUR"，说明 SSH 配置成功！

2. **验证 GitHub Secrets**

在 GitHub Actions 工作流中，这些 Secrets 将被引用为：
- `${{ secrets.AUR_SSH_PRIVATE_KEY }}`
- `${{ secrets.AUR_USERNAME }}`
- `${{ secrets.AUR_EMAIL }}`

确保所有三个 Secret 都已正确添加。

---

## 常见问题

### Q1: SSH 连接失败 "Permission denied (publickey)"

**原因**：SSH 密钥未正确配置

**解决方法**：
1. 确认公钥已添加到 AUR 账户
2. 确认使用正确的私钥文件：`ssh -i ~/.ssh/aur_key ...`
3. 检查私钥权限：`chmod 600 ~/.ssh/aur_key`

### Q2: GitHub Actions 推送 AUR 失败

**原因**：GitHub Secrets 配置不正确

**解决方法**：
1. 检查 `AUR_SSH_PRIVATE_KEY` 是否包含完整的私钥（包括 BEGIN 和 END 行）
2. 检查 `AUR_USERNAME` 和 `AUR_EMAIL` 是否正确
3. 查看 GitHub Actions 日志中的错误信息

### Q3: 如何更新 SSH 密钥？

1. 生成新的密钥对：
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/aur_key_new
   ```

2. 更新 AUR 账户中的公钥

3. 更新 GitHub Secret `AUR_SSH_PRIVATE_KEY`

4. 删除旧密钥：
   ```bash
   rm ~/.ssh/aur_key ~/.ssh/aur_key.pub
   mv ~/.ssh/aur_key_new ~/.ssh/aur_key
   mv ~/.ssh/aur_key_new.pub ~/.ssh/aur_key.pub
   ```

### Q4: 可以使用现有的 SSH 密钥吗？

可以，但**不推荐**。为 AUR 创建专用密钥有以下好处：
- 更好的安全性（密钥隔离）
- 可以独立轮换密钥
- 如果密钥泄露，只影响 AUR 访问

---

## 下一步

配置完成后，您可以：

1. **首次发布**：创建 GitHub Release，触发自动发布到 AUR
2. **手动触发**：在 GitHub Actions 页面手动触发 `aur-publish.yml` 工作流
3. **验证发布**：访问 https://aur.archlinux.org/packages/wallhaven-bin

---

## 参考链接

- [AUR 官方网站](https://aur.archlinux.org/)
- [AUR 维基](https://wiki.archlinux.org/title/AUR)
- [SSH 密钥管理](https://wiki.archlinux.org/title/SSH_keys)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
```

- [ ] **Step 2: 验证文档创建**

```bash
ls -lh docs/aur-setup-guide.md
```

预期输出：显示文件存在且大小合理

---

## Task 7: 更新 archlinux/README.md

**Files:**
- Modify: `archlinux/README.md`

**目的:** 添加 wallhaven-bin 包的说明，区分从 AUR 安装和从源码构建

- [ ] **Step 1: 更新 README.md 的快速开始部分**

找到 `archlinux/README.md` 文件的第 75-97 行（从 AUR 安装部分），替换为：

```markdown
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
```

- [ ] **Step 2: 验证更新**

```bash
grep -A 10 "wallhaven-bin（推荐）" archlinux/README.md
```

预期输出：显示新添加的 wallhaven-bin 说明

---

## Task 8: 更新主 README.md

**Files:**
- Modify: `README.md`

**目的:** 更新 AUR 安装说明和添加 AUR 徽章

- [ ] **Step 1: 添加 AUR 徽章**

找到 `README.md` 文件的第 11-17 行（徽章导航部分），在第 17 行后添加：

```markdown
<p align="center">
  <a href="https://aur.archlinux.org/packages/wallhaven-bin">
    <img src="https://img.shields.io/aur/version/wallhaven-bin" alt="AUR version">
  </a>
  <a href="https://aur.archlinux.org/packages/wallhaven-bin">
    <img src="https://img.shields.io/aur/votes/wallhaven-bin" alt="AUR votes">
  </a>
</p>
```

- [ ] **Step 2: 更新 Arch Linux 安装章节**

找到 `README.md` 文件的第 188-214 行（Arch Linux 安装部分），替换为：

```markdown
### Arch Linux 安装

Arch Linux 用户可以通过 AUR 安装：

#### 从 AUR 安装（推荐）

**wallhaven-bin**（预编译版本，推荐）：

```bash
# 使用 yay
yay -S wallhaven-bin

# 或使用 paru
paru -S wallhaven-bin
```

**wallhaven**（从源码构建）：

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

- [ ] **Step 3: 验证更新**

```bash
grep -A 5 "wallhaven-bin" README.md | head -n 10
```

预期输出：显示更新后的 AUR 安装说明

---

## Task 9: 提交所有更改

**目的:** 将所有创建和修改的文件提交到 git

- [ ] **Step 1: 查看更改状态**

```bash
git status
```

预期输出：显示以下新文件和修改的文件：
- `archlinux/wallhaven-bin/PKGBUILD` (new)
- `archlinux/wallhaven-bin/.SRCINFO` (new)
- `archlinux/wallhaven-bin/wallhaven-bin.install` (new)
- `.github/workflows/aur-publish.yml` (new)
- `docs/aur-setup-guide.md` (new)
- `.github/workflows/build.yml` (modified)
- `archlinux/README.md` (modified)
- `README.md` (modified)

- [ ] **Step 2: 添加所有文件到 git**

```bash
git add archlinux/wallhaven-bin/ \
        .github/workflows/aur-publish.yml \
        docs/aur-setup-guide.md \
        .github/workflows/build.yml \
        archlinux/README.md \
        README.md
```

- [ ] **Step 3: 提交更改**

```bash
git commit -m "feat: add AUR support with automated publishing

- Add wallhaven-bin PKGBUILD for binary package
- Add GitHub Actions workflow for automated AUR publishing
- Add .pacman artifact upload to build workflow
- Add AUR account setup guide
- Update documentation with AUR installation instructions

The automation will:
- Download .pacman from GitHub Release
- Update PKGBUILD with correct version and SHA256
- Generate .SRCINFO using Docker
- Push to AUR repository via SSH

Required GitHub Secrets:
- AUR_SSH_PRIVATE_KEY
- AUR_USERNAME
- AUR_EMAIL"
```

---

## Task 10: 验证计划完整性

**目的:** 确保所有文件都已创建且符合规范

- [ ] **Step 1: 验证所有文件存在**

```bash
# 检查所有必需文件
ls -1 archlinux/wallhaven-bin/PKGBUILD \
       archlinux/wallhaven-bin/.SRCINFO \
       archlinux/wallhaven-bin/wallhaven-bin.install \
       .github/workflows/aur-publish.yml \
       docs/aur-setup-guide.md
```

预期输出：列出所有文件路径

- [ ] **Step 2: 验证 PKGBUILD 格式**

```bash
cd archlinux/wallhaven-bin
bash -n PKGBUILD && echo "✓ PKGBUILD syntax valid"
```

- [ ] **Step 3: 验证 GitHub Actions 工作流格式**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/aur-publish.yml'))" && echo "✓ aur-publish.yml syntax valid"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))" && echo "✓ build.yml syntax valid"
```

- [ ] **Step 4: 验证 README 更新**

```bash
grep -q "wallhaven-bin" README.md && echo "✓ README.md updated"
grep -q "wallhaven-bin" archlinux/README.md && echo "✓ archlinux/README.md updated"
```

---

## 后续步骤（用户手动执行）

完成此实施计划后，用户需要执行以下步骤：

### 1. 注册 AUR 账户

按照 `docs/aur-setup-guide.md` 的指南完成：
- 注册 AUR 账户
- 生成 SSH 密钥对
- 添加公钥到 AUR
- 配置 GitHub Secrets

### 2. 创建首次 Release

```bash
# 确保版本号正确
grep '"version"' package.json

# 创建 git tag
git tag v2.7.0
git push origin v2.7.0

# 或者在 GitHub 网页上创建 Release
```

### 3. 验证自动化流程

1. GitHub Actions 自动构建并创建 Release
2. `aur-publish.yml` 工作流自动触发
3. 检查 AUR 页面：https://aur.archlinux.org/packages/wallhaven-bin

### 4. 测试安装

```bash
yay -S wallhaven-bin
wallhaven
```

---

## 测试清单

### 本地测试

- [ ] PKGBUILD 语法正确（`bash -n PKGBUILD`）
- [ ] install 脚本语法正确（`bash -n wallhaven-bin.install`）
- [ ] .SRCINFO 格式正确

### CI/CD 测试

- [ ] GitHub Actions 工作流语法正确
- [ ] build.yml 上传 .pacman 文件
- [ ] aur-publish.yml 可以手动触发

### 集成测试

- [ ] 创建 GitHub Release 后，.pacman 文件出现在 Release 中
- [ ] aur-publish.yml 工作流成功执行
- [ ] AUR 仓库更新（PKGBUILD 和 .SRCINFO）
- [ ] 用户可以通过 yay/paru 安装

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
- [ ] archlinux/README.md 已更新

---

**计划结束**
