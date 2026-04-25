# Wallhaven 壁纸浏览器 - 项目指导

> 架构重构项目 | Electron + Vue 3 + TypeScript

## 项目概述

这是一个**纯架构重构项目**，目标是优化代码架构、增强可读性和鲁棒性。

### 核心约束

- ✅ **保持不变**：用户操作逻辑、界面布局、UI 显示、功能行为
- ✅ **仅变更**：代码内部架构、类型定义、错误处理、代码组织

**核心价值**：外观行为零感知，内部架构大升级

## 技术栈

- Electron v41.2.2
- Vue 3.5.32 (Composition API)
- TypeScript 6.0.0
- Pinia 3.0.4
- Vite 7.3.2 / electron-vite 5.0.0

## 项目结构

```
.planning/
├── PROJECT.md        # 项目上下文
├── REQUIREMENTS.md   # 需求清单
├── ROADMAP.md        # 执行路线图
├── STATE.md          # 当前状态
├── config.json       # 工作流配置
├── codebase/         # 代码库分析
└── research/         # 研究报告
```

## 重构路线图

| 阶段 | 名称 | 需求 | 状态 |
|------|------|------|------|
| 1 | 基础设施与类型安全 | 6 项 | ⏸️ 待开始 |
| 2 | 数据层抽象 | 6 项 | ⏸️ 待开始 |
| 3 | 业务层与组合层 | 7 项 | ⏸️ 待开始 |
| 4 | IPC 模块化重构 | 10 项 | ⏸️ 待开始 |
| 5 | 表现层重构与清理 | 9 项 | ⏸️ 待开始 |

## 工作流命令

```bash
# 查看项目进度
/gsd-progress

# 开始阶段讨论
/gsd-discuss-phase 1

# 直接规划阶段
/gsd-plan-phase 1

# 执行当前阶段
/gsd-execute-phase
```

## GSD 工作流强制执行

此项目使用 GSD (Get Shit Done) 工作流管理。以下规则必须遵守：

### 阶段执行流程

1. **讨论阶段** (`/gsd-discuss-phase N`) — 收集上下文，澄清方法
2. **规划阶段** (`/gsd-plan-phase N`) — 创建详细执行计划
3. **执行阶段** (`/gsd-execute-phase`) — 原子提交，偏差处理
4. **验证阶段** (`/gsd-verify-work`) — 目标达成验证

### 代码审查检查点

- 每个阶段完成后运行 `/gsd-code-review`
- 发现问题后运行 `/gsd-code-review-fix`

### 关键规则

- **不跳过阶段**：必须按顺序完成讨论→规划→执行→验证
- **原子提交**：每个逻辑变更独立提交
- **保持约束**：不改变任何用户操作逻辑、界面布局、UI 显示

## 参考文档

- `.planning/codebase/ARCHITECTURE.md` — 现有架构
- `.planning/codebase/CONCERNS.md` — 技术债务清单
- `.planning/research/SUMMARY.md` — 研究发现摘要
- `.planning/research/PITFALLS.md` — 重构陷阱指南

---
*创建时间：2025-04-25*
