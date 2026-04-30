# 动画性能优化 — 功能研究

> 研究目标：为 v2.8 里程碑优化 ImagePreview 组件动画性能，确保流畅 60fps 体验

---

## 一、当前实现分析

### 1.1 现有动画类型

| 动画 | 触发条件 | 当前实现 | 性能问题 |
|------|----------|----------|----------|
| **打开预览** | 首次打开 | `blowUpModal` keyframes (scale 0→1) | ✅ 仅 transform，性能良好 |
| **关闭预览** | 关闭时 | `blowUpModalTwo` keyframes (scale 1→0) | ✅ 仅 transform，性能良好 |
| **导航切换** | 左右箭头 | `slide-in-blurred-left/right` | ⚠️ 使用 blur filter，性能瓶颈 |
| **遮罩层** | 打开/关闭 | opacity + visibility transition | ✅ 性能良好 |

### 1.2 性能瓶颈识别

**问题 1：blur filter 导致重绘**

```css
/* 当前实现 - 使用 blur filter */
@keyframes slide-in-blurred-left {
  0% {
    transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    filter: blur(40px);  /* ⚠️ 触发 CPU 重绘，非 GPU 加速 */
    opacity: 0;
  }
  100% {
    transform: translateX(0) scaleY(1) scaleX(1);
    filter: blur(0);
    opacity: 1;
  }
}
```

**问题原因：**
- `filter: blur()` 不在 GPU 加速属性列表中
- 动态 blur 值变化导致每一帧都需要 CPU 重绘
- 在 Electron 中，Chromium 的软件渲染路径会增加额外开销

**问题 2：scaleX/Y 与 translateX 组合**

```css
transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
```

虽然 `transform` 是 GPU 加速属性，但 `scaleX(2.5) scaleY(0.2)` 创建了非均匀缩放，可能增加合成层计算复杂度。

---

## 二、功能分类

### 2.1 Table Stakes（基础必备）

这些是 60fps 动画的核心技术要求，不做就无法达到流畅体验：

| 功能 | 说明 | 复杂度 | 依赖 |
|------|------|--------|------|
| **GPU 加速属性** | 仅使用 `transform` 和 `opacity` 进行动画 | 低 | 无 |
| **will-change 提示** | 提前告知浏览器哪些属性会变化 | 低 | 无 |
| **移除 blur filter** | 用纯 transform 实现等效视觉效果 | 低 | 无 |
| **硬件加速层** | 使用 `transform: translateZ(0)` 强制 GPU 层 | 低 | 无 |

### 2.2 Differentiators（差异化功能）

提升用户体验的增强功能：

| 功能 | 说明 | 复杂度 | 依赖 |
|------|------|--------|------|
| **reduced-motion 支持** | 尊重用户 `prefers-reduced-motion` 设置 | 低 | 无 |
| **动画时长优化** | 根据帧率动态调整动画时长 | 中 | requestAnimationFrame |
| **transform-origin 优化** | 正确设置变换原点提升视觉流畅度 | 低 | 无 |
| **FLIP 动画技术** | First-Last-Invert-Play，减少布局抖动 | 高 | 无 |

### 2.3 Anti-features（应避免的功能）

| 功能 | 为什么是 Anti-feature |
|------|----------------------|
| **JavaScript 驱动动画** | 增加主线程负担，可能阻塞渲染 |
| **width/height 动画** | 触发布局重排，性能极差 |
| **left/top 动画** | 触发布局重排，应使用 transform |
| **margin/padding 动画** | 触发布局重排，性能极差 |
| **box-shadow 动画** | 每帧重绘，昂贵操作 |
| **background-color 动画** | 非硬件加速，应使用 opacity 叠加 |
| **过度使用 will-change** | 内存占用增加，应仅对动画元素使用 |

---

## 三、GPU 加速属性详解

### 3.1 GPU 加速属性列表

以下属性可以通过 GPU 合成层进行硬件加速：

| 属性 | 说明 | 性能评级 |
|------|------|----------|
| `transform` | 2D/3D 变换 | ⭐⭐⭐ 最佳 |
| `opacity` | 透明度 | ⭐⭐⭐ 最佳 |
| `filter` (有限) | 特定情况下部分支持 | ⭐ 不推荐用于动画 |

### 3.2 非 GPU 加速属性（避免动画化）

| 属性 | 替代方案 |
|------|----------|
| `width/height` | 使用 `transform: scale()` |
| `left/top/right/bottom` | 使用 `transform: translate()` |
| `margin/padding` | 使用 `transform: translate()` 或容器动画 |
| `background-color` | 使用伪元素 + `opacity` |
| `box-shadow` | 使用伪元素 + `transform` + `opacity` |
| `filter: blur()` | 无直接替代，考虑移除或静态使用 |

### 3.3 强制 GPU 层创建

```css
/* 方法 1: translateZ(0) */
.gpu-layer {
  transform: translateZ(0);
}

/* 方法 2: will-change */
.animated-element {
  will-change: transform, opacity;
}

/* 方法 3: backface-visibility (已在项目中使用) */
.hidden-backface {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
```

**注意：** `will-change` 应谨慎使用，仅在需要时添加，动画结束后移除，否则会持续占用 GPU 内存。

---

## 四、blur filter 替代方案

### 4.1 方案对比

| 方案 | 视觉效果 | 性能 | 复杂度 | 推荐度 |
|------|----------|------|--------|--------|
| **移除 blur 效果** | 无模糊 | ⭐⭐⭐ 最佳 | 低 | ✅ 推荐 |
| **纯 transform 缩放** | 轻微模糊感 | ⭐⭐⭐ 最佳 | 低 | ✅ 推荐 |
| **静态 blur + scale 动画** | 保持模糊感 | ⭐⭐ 良好 | 中 | ⚠️ 可选 |
| **JS 驱动 blur** | 完全模糊 | ⭐ 差 | 高 | ❌ 不推荐 |
| **Canvas/SVG 模糊** | 完全模糊 | ⭐⭐ 一般 | 高 | ❌ 过度设计 |

### 4.2 推荐方案：纯 transform 缩放动画

**优化后的动画（移除 blur）：**

```css
@keyframes slide-in-optimized {
  0% {
    transform: translateX(-100px) scale(0.95);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}
```

**视觉效果对比：**
- 原效果：translateX(-1000px) + scaleX(2.5) scaleY(0.2) + blur(40px)
- 优化后：translateX(-100px) + scale(0.95)
- 视觉差异：轻微，模糊效果被移除但整体流畅度大幅提升

### 4.3 备选方案：静态 blur + 动画分离

如果需要保留模糊感，可以将模糊作为静态效果：

```css
/* 入场动画 - blur 是静态的 */
.slide-enter-from {
  transform: translateX(-100px);
  opacity: 0;
  filter: blur(10px);  /* 静态模糊，不动画化 */
}
.slide-enter-to {
  transform: translateX(0);
  opacity: 1;
  filter: blur(0);
}
```

**注意：** 即使 blur 值是静态的，元素仍然需要重绘，只是避免了 blur 值变化的重绘开销。

---

## 五、帧时序优化

### 5.1 理想帧时间

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **帧时间** | 16.67ms | 1000ms / 60fps |
| **JS 执行** | < 10ms | 留出渲染时间 |
| **样式计算** | < 2ms | CSS 选择器匹配 |
| **布局** | < 2ms | 重排计算 |
| **绘制** | < 2ms | 光栅化 |

### 5.2 动画时长建议

| 场景 | 推荐时长 | 理由 |
|------|----------|------|
| **快速反馈** | 100-200ms | 按钮点击、hover |
| **页面过渡** | 200-300ms | 当前项目使用 300ms ✅ |
| **复杂动画** | 300-500ms | 模态框打开/关闭 |
| **情绪化动画** | 500ms+ | 品牌展示、加载 |

### 5.3 缓动函数选择

| 缓动函数 | 使用场景 | CSS |
|----------|----------|-----|
| **ease-out** | 入场动画 | `cubic-bezier(0, 0, 0.2, 1)` |
| **ease-in** | 出场动画 | `cubic-bezier(0.4, 0, 1, 1)` |
| **ease-in-out** | 状态切换 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| **custom** | 品牌动画 | `cubic-bezier(0.165, 0.84, 0.44, 1)` ✅ 当前使用 |

---

## 六、Reduced Motion 支持

### 6.1 无障碍要求

根据 WCAG 2.1 标准：
- 用户应能禁用动画
- 动画不应导致前庭障碍用户感到不适
- 尊重 `prefers-reduced-motion` 系统设置

### 6.2 实现方式

**CSS 媒体查询：**

```css
/* 默认动画 */
.animated-element {
  transition: transform 0.3s ease-out;
}

/* 尊重 reduced-motion 设置 */
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    transition: none;  /* 或使用 opacity 渐变替代 */
  }
  
  /* 关键动画仍保留（如反馈指示） */
  .essential-animation {
    transition: opacity 0.1s;  /* 最小化动画 */
  }
}
```

**JavaScript 检测：**

```typescript
// 检测用户偏好
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 根据偏好调整动画
const animationDuration = prefersReducedMotion ? 0 : 300
```

### 6.3 Vue 组件集成

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const reducedMotion = ref(false)

const checkReducedMotion = () => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

onMounted(() => {
  checkReducedMotion()
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', checkReducedMotion)
})

onUnmounted(() => {
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .removeEventListener('change', checkReducedMotion)
})
</script>

<template>
  <Transition :name="reducedMotion ? 'fade' : 'slide'">
    <!-- content -->
  </Transition>
</template>
```

---

## 七、优化实施计划

### 7.1 优化后动画代码

**导航切换动画（替代现有 blur 动画）：**

```css
/* 向左导航 - 新图片从左侧进入 */
@keyframes slide-left-optimized {
  0% {
    transform: translateX(-50px) scale(0.98);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* 向右导航 - 新图片从右侧进入 */
@keyframes slide-right-optimized {
  0% {
    transform: translateX(50px) scale(0.98);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* Vue Transition 类 */
.slide-left-enter-active {
  animation: slide-left-optimized 0.3s cubic-bezier(0.23, 1, 0.32, 1) both;
  will-change: transform, opacity;
}

.slide-left-leave-active {
  animation: slide-right-optimized 0.3s cubic-bezier(0.23, 1, 0.32, 1) reverse both;
  will-change: transform, opacity;
}

.slide-right-enter-active {
  animation: slide-right-optimized 0.3s cubic-bezier(0.23, 1, 0.32, 1) both;
  will-change: transform, opacity;
}

.slide-right-leave-active {
  animation: slide-left-optimized 0.3s cubic-bezier(0.23, 1, 0.32, 1) reverse both;
  will-change: transform, opacity;
}

/* Reduced Motion 支持 */
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
  
  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

### 7.2 打开/关闭动画（保持现有，添加优化）

```css
/* 现有 blowUpModal 优化 - 添加 will-change */
@keyframes blowUpModal {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}

.mask .img-view .img-class.initial-anim {
  animation: blowUpModal 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
  will-change: transform;  /* 添加 GPU 提示 */
}
```

---

## 八、性能验证方法

### 8.1 Chrome DevTools 性能分析

**步骤：**
1. 打开 DevTools (F12)
2. 切换到 Performance 面板
3. 点击 Record，执行动画操作
4. 停止录制，分析结果

**关键指标：**
| 指标 | 目标 | 说明 |
|------|------|------|
| FPS | ≥ 60 | 绿色条表示达标 |
| Frame Time | ≤ 16.67ms | 无红色标记 |
| Main Thread | < 50% | 无长任务 |
| GPU Memory | 稳定 | 无内存泄漏 |

### 8.2 Electron 特定优化

```javascript
// main.ts - 启用硬件加速
app.disableHardwareAcceleration(false)  // 默认启用

// 可选：指定 GPU 进程优先级
app.commandLine.appendSwitch('gpu-rather-than-dxgi', 'true')
```

### 8.3 性能基准

**优化前预期：**
- blur 动画帧率：30-45fps
- 帧时间：22-33ms
- 主线程占用：高

**优化后目标：**
- transform 动画帧率：60fps
- 帧时间：≤ 16.67ms
- 主线程占用：低

---

## 九、依赖关系

### 9.1 现有功能依赖

| 现有功能 | 优化依赖方式 |
|----------|-------------|
| Vue Transition | 继续使用，仅修改 CSS |
| 动画方向感知 | 继续使用 slideDirection ref |
| mode="out-in" | 继续使用，确保流畅切换 |

### 9.2 无需新增依赖

本次优化纯粹为 CSS 改进，不需要：
- 新的 npm 包
- 新的 Vue 插件
- 新的 IPC 通道
- 新的配置文件

---

## 十、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 视觉效果变化 | 高 | 低 | scale 替代 blur 仍有良好视觉效果 |
| 动画时间感变化 | 中 | 低 | 微调 translateX 距离补偿 |
| 老旧 GPU 兼容性 | 低 | 中 | 已使用 backface-visibility: hidden |
| reduced-motion 检测失败 | 低 | 低 | 降级为默认动画，不影响功能 |

---

## 十一、结论

**核心优化策略：**
1. 移除 `filter: blur()` 动画，改用纯 `transform` + `opacity`
2. 添加 `will-change` 提示浏览器优化
3. 支持 `prefers-reduced-motion` 无障碍
4. 减少动画距离，提升响应感

**预期效果：**
- 帧率从 30-45fps 提升至稳定 60fps
- 用户视觉体验无明显变化
- 代码复杂度降低（移除复杂的 scaleX/Y 组合）

**实施复杂度：⭐ 低**
- 仅需修改 CSS
- 无 JavaScript 改动
- 无破坏性变更

---

*创建时间：2026-04-30*
*研究范围：v2.8 动画性能优化*
