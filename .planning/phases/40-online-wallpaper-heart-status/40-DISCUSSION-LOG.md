# Phase 40: 在线壁纸页面小红心多收藏夹状态区分 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the conversation.

**Date:** 2026-05-02
**Phase:** 40-online-wallpaper-heart-status
**Mode:** discuss

## Areas Discussed

### 1. 数据传递方式
- **选项呈现：** 方案 A（父组件计算心形状态 Map）/ 方案 B（传 defaultCollectionId + 原始数据）
- **用户选择：** 方案 B — 传 defaultCollectionId + wallpaperCollectionMap: Map<string, string[]>
- **说明：** 子组件自行计算心形状态，OnlineWallpaper 负责生成 Map 数据结构

### 2. 蓝色色值
- **选项呈现：** 应用主色 #667eea / 纯蓝 #4a90d9 / 同饱和度蓝 #5b8def
- **用户选择：** #5b8def（与红色 #ff6b6b 同亮度/饱和度，不同色相）

### 3. 蓝心左键行为
- **选项呈现：** 保持不变（添加到默认收藏夹）/ 不做操作
- **用户选择：** 保持不变 — 蓝心点击后添加到默认收藏夹，变为红心

### 4. ImagePreview 覆盖范围
- **选项呈现：** 完全一致的三态逻辑 / 仅两态
- **用户选择：** 完全一致 — WallpaperList 和 ImagePreview 使用相同的心形三态逻辑

## Decisions Recorded

| # | Area | Decision |
|---|------|----------|
| D-01 | 数据传递 | 传 defaultCollectionId + wallpaperCollectionMap 给子组件 |
| D-02 | 数据计算 | OnlineWallpaper 从 favorites 数据生成 Map |
| D-03 | 数据消费 | 子组件自行计算三态 |
| D-04 | 红色视觉 | 默认收藏夹 → 红色 #ff6b6b（现有样式） |
| D-05 | 蓝色视觉 | 非默认收藏夹 → 蓝色 #5b8def |
| D-06 | 透明状态 | 未收藏 → 透明/轮廓（现有行为） |
| D-07 | 颜色一致 | 蓝红同亮度/饱和度 |
| D-08 | 左键行为 | 保持一致（切换默认收藏夹） |
| D-09 | 右键行为 | 保持一致（显示下拉菜单） |
| D-10 | ImagePreview | 相同三态逻辑 |

## Deferred Ideas

None.

---

*Logged: 2026-05-02*
