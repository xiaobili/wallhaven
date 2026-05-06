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
