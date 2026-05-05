# Pitfalls Research

**Domain:** Vue 3 虚拟列表实现
**Researched:** 2026-05-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: 忘记设置 key-field 属性

**What goes wrong:**
RecycleScroller 无法正确识别列表项，导致组件复用错误，出现数据错乱或渲染异常。

**Why it happens:**
开发者认为虚拟列表会自动使用数组索引作为 key，但 vue-virtual-scroller 需要显式的 key-field。

**How to avoid:**
始终为 RecycleScroller 设置 `key-field` 属性，指向数据的唯一标识字段。

**Warning signs:**
- 滚动时卡片内容错乱
- 选中的壁纸突然变成另一个
- hover 效果出现在错误的卡片上

**Phase to address:**
Phase 1（虚拟列表集成）

---

### Pitfall 2: 未处理动态高度的壁纸卡片

**What goes wrong:**
如果壁纸卡片高度不固定（如不同分辨率），RecycleScroller 的固定高度设置会导致滚动跳动或空白区域。

**Why it happens:**
开发者假设所有壁纸卡片高度相同，但实际上壁纸可能有不同的宽高比。

**How to avoid:**
1. 使用 DynamicScroller 替代 RecycleScroller
2. 或者为壁纸卡片设置固定高度容器

**Warning signs:**
- 滚动时出现空白区域
- 卡片位置跳动
- 滚动条大小不稳定

**Phase to address:**
Phase 1（虚拟列表集成）

---

### Pitfall 3: 无限滚动触发时机不当

**What goes wrong:**
滚动检测触发太早或太晚，导致用户体验不佳或重复加载。

**Why it happens:**
IntersectionObserver 的 threshold 设置不合理，或者在 loading 状态下仍然触发加载。

**How to avoid:**
1. 设置合理的 threshold（如 0.1）
2. 在 loading 状态下禁止触发新加载
3. 检测 hasMore 状态，避免无意义的请求

**Warning signs:**
- 还没滚动到底就加载
- 同时发起多个相同的请求
- 已经没有更多数据时还在请求

**Phase to address:**
Phase 1（无限滚动实现）

---

### Pitfall 4: 多选功能在虚拟列表中失效

**What goes wrong:**
用户选中的壁纸在滚动后取消选中，或者无法正确选中。

**Why it happens:**
虚拟列表会销毁不可见的组件，导致组件内部的状态丢失。选中状态应该存储在 Store 中，而不是组件内部。

**How to avoid:**
1. 将选中状态存储在 Pinia Store 中
2. WallpaperCard 通过 props 接收选中状态
3. 通过 emit 触发 Store 的 toggleSelect action

**Warning signs:**
- 滚动后选中的壁纸消失
- 批量操作失败
- 选中数量不一致

**Phase to address:**
Phase 2（多选功能兼容）

---

### Pitfall 5: hover 交互性能问题

**What goes wrong:**
鼠标 hover 在卡片上时出现延迟或卡顿，影响用户体验。

**Why it happens:**
虚拟列表重新渲染时，hover 状态丢失并重新计算，导致闪烁或延迟。

**How to avoid:**
1. 使用 CSS :hover 而不是 JS 事件处理 hover
2. 如果需要 JS 处理 hover，确保状态存储在父组件或 Store 中

**Warning signs:**
- hover 效果延迟
- hover 效果闪烁
- 快速移动鼠标时卡顿

**Phase to address:**
Phase 2（hover 交互兼容）

---

### Pitfall 6: 滚动位置记忆失败

**What goes wrong:**
用户期望刷新页面后回到原来的滚动位置，但虚拟列表总是从顶部开始。

**Why it happens:**
虚拟列表的状态完全基于内存，刷新页面后状态丢失。

**How to avoid:**
本次里程碑不实现此功能。如需实现，需要：
1. 在 URL 或 localStorage 中保存滚动位置
2. 页面加载时恢复滚动位置

**Warning signs:**
- 用户抱怨刷新后丢失浏览进度
- 用户需要重新滚动到之前的位置

**Phase to address:**
明确排除在本次里程碑之外

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 直接在 View 层实现滚动逻辑 | 快速实现 | 难以复用和测试 | 永远不 |
| 使用固定高度假设所有卡片 | 简化实现 | 动态高度时失效 | 卡片高度固定时 |
| 不检查 loading 状态 | 减少代码 | 重复请求浪费资源 | 永远不 |
| 不设置 key-field | 减少配置 | 组件复用错误 | 永远不 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| vue-virtual-scroller | 忘记导入 CSS | 在 main.ts 中导入 CSS 文件 |
| useIntersectionObserver | threshold 设置为 1 | 设置为 0.1 或更小的值 |
| Wallhaven API | 不处理分页结束 | 检查返回数据长度，设置 hasMore = false |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Store 中存储过多数据 | 内存占用高，响应慢 | 限制最大存储数量 | 10000+ 张壁纸 |
| buffer 设置过小 | 快速滚动时出现空白 | 设置合理的 buffer（如 200） | 快速滚动时 |
| 不使用虚拟列表 | DOM 节点过多，卡顿 | 使用 RecycleScroller | 100+ 张壁纸 |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| XSS（用户输入） | 恶意脚本执行 | 使用 Vue 模板自动转义 |

**Note:** 本项目主要是客户端应用，安全风险较低。

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 没有加载提示 | 用户不知道是否在加载 | 显示 loading spinner |
| 没有错误提示 | 用户不知道加载失败 | 显示错误提示和重试按钮 |
| 滚动不流畅 | 用户感到卡顿 | 使用虚拟列表优化 |
| 多选反馈不明显 | 用户不知道已选中 | 显示选中数量和批量操作按钮 |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **虚拟列表渲染:** Often missing key-field 配置 — 验证滚动时卡片不错乱
- [ ] **无限滚动:** Often missing loading 状态检查 — 验证不会重复加载
- [ ] **多选功能:** Often missing Store 状态管理 — 验证滚动后选中状态保持
- [ ] **hover 交互:** Often missing 性能优化 — 验证快速 hover 不卡顿
- [ ] **错误处理:** Often missing 加载失败提示 — 验证网络错误时有提示

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| key-field 缺失 | LOW | 添加 key-field 属性 |
| 动态高度问题 | MEDIUM | 切换到 DynamicScroller 或固定高度 |
| 多选状态丢失 | MEDIUM | 重构为 Store 管理选中状态 |
| 滚动位置丢失 | HIGH | 实现 URL 或 localStorage 保存 |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| key-field 缺失 | Phase 1 | 测试滚动时卡片不错乱 |
| 动态高度问题 | Phase 1 | 测试不同分辨率的壁纸 |
| 无限滚动触发不当 | Phase 1 | 测试加载时机和状态 |
| 多选功能失效 | Phase 2 | 测试滚动后选中状态保持 |
| hover 交互性能 | Phase 2 | 测试快速 hover 不卡顿 |
| 滚动位置记忆 | N/A | 本次里程碑不实现 |

## Sources

- vue-virtual-scroller GitHub Issues — 常见问题和解决方案
- VueUse 文档 — IntersectionObserver 最佳实践
- Vue 3 官方文档 — 性能优化建议

---
*Pitfalls research for: Vue 3 虚拟列表实现*
*Researched: 2026-05-06*
