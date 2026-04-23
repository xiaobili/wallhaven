# 🎨 应用图标配置快速指南

## 📦 准备工作

### 方法一：使用自动生成脚本（推荐）

1. **准备源图片**
   - 准备一张高质量的 PNG 或 SVG 图片
   - 建议尺寸：**至少 1024x1024 像素**
   - 放置到：`build/source-icon.png`

2. **运行生成脚本**
   ```bash
   npm run generate-icons
   # 或指定源图片路径
   npm run generate-icons ./my-logo.png
   ```

3. **完成平台特定步骤**
   
   **Windows:**
   - 将 `build/icon-256.png` 转换为 `.ico` 格式
   - 推荐使用在线工具：[ICO Convert](https://icoconvert.com/)
   
   **macOS (仅在 macOS 系统上):**
   ```bash
   iconutil -c icns build/icon.iconset -o build/icon.icns
   ```
   
   **Linux:**
   - ✅ `build/icon.png` 已自动生成，无需额外操作

---

### 方法二：手动准备图标

如果不想使用脚本，可以手动准备以下文件并放到 `build/` 目录：

| 平台 | 文件名 | 要求 |
|------|--------|------|
| Windows | `icon.ico` | 包含 16x16 到 256x256 多尺寸 |
| macOS | `icon.icns` | 包含 16x16 到 1024x1024 多尺寸 |
| Linux | `icon.png` | 512x512 或 1024x1024 |

**在线转换工具推荐：**
- [ICO Convert](https://icoconvert.com/) - PNG/JPG 转 ICO
- [ICNS Builder](https://www.icns.io/) - 生成 ICNS
- [CloudConvert](https://cloudconvert.com/) - 支持多种格式互转

---

## ✅ 验证配置

1. **检查文件是否存在**
   ```bash
   ls -la build/icon.*
   ```

2. **测试构建**
   ```bash
   # Windows
   npm run build:win
   
   # macOS
   npm run build:mac
   
   # Linux
   npm run build:linux
   ```

3. **查看生成的应用**
   - 构建完成后在 `dist/` 目录查看应用
   - 确认图标显示正常

---

## 🎯 图标设计建议

### 尺寸规范
- **最小可用尺寸**: 16x16（任务栏、标题栏）
- **推荐源图尺寸**: 1024x1024 或更大
- **关键尺寸**: 32x32, 64x64, 128x128, 256x256, 512x512

### 设计原则
1. ✅ **简洁清晰** - 小尺寸下仍能识别
2. ✅ **高对比度** - 适应不同背景
3. ✅ **品牌一致** - 与应用主题色匹配
4. ✅ **透明背景** - PNG/ICO 使用透明背景
5. ❌ **避免细节过多** - 缩小后会模糊
6. ❌ **避免文字过小** - 小尺寸无法辨认

### 颜色建议
根据当前应用的深色主题（`#1a1a1a` 背景，`#0cd` 强调色），建议：
- 主色调：青色 `#0cd` 或其变体
- 辅助色：深灰 `#313131` 或白色
- 保持与 UI 风格一致

---

## 🔧 常见问题

### Q: 图标没有显示？
**A:** 检查以下几点：
1. 图标文件是否在正确的路径（`build/` 目录）
2. 文件名是否正确（`icon.ico`, `icon.icns`, `icon.png`）
3. `electron-builder.yml` 中的路径配置是否正确
4. 重新运行构建命令

### Q: Windows 图标模糊？
**A:** 
- 确保 ICO 文件包含多个尺寸（至少 256x256）
- 使用专业的 ICO 生成工具
- 避免从低分辨率图片转换

### Q: macOS 图标不显示？
**A:**
- 必须在 macOS 系统上使用 `iconutil` 生成 `.icns`
- 确保 iconset 包含所有必需尺寸
- 清除缓存后重新构建

### Q: 如何更新已有图标？
**A:**
1. 替换 `build/` 目录下的图标文件
2. 清理构建缓存：`rm -rf dist/ out/`
3. 重新构建：`npm run build:win`（或其他平台）

---

## 📚 相关文档

- [详细配置说明](./README_ICONS.md)
- [Electron Builder 图标文档](https://www.electron.build/icons.html)
- [图标生成脚本](../scripts/generate-icons.js)

---

## 🚀 下一步

图标配置完成后：
1. 运行 `npm run build:[platform]` 构建应用
2. 测试安装后的应用图标显示
3. 如需调整，修改源图片后重新生成
