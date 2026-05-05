---
status: complete
created: 2026-05-05
completed: 2026-05-05
---

# Quick Task 完成：GitNexus 与 GSD 集成准则

## 任务描述

在 CLAUDE.md 的 GSD 工作流部分添加明确的准则，指导在使用 GSD 过程中如何主动结合 GitNexus 的能力。

## 完成内容

### 1. 更新"关键规则"部分

添加了两条新规则：
- **修改前必检查**：任何代码修改前必须运行 `gitnexus_impact` 分析影响范围
- **提交前必验证**：提交前必须运行 `gitnexus_detect_changes` 确认修改范围符合预期

### 2. 新增"GitNexus 集成准则"小节

详细说明了在 GSD 工作流的五个阶段如何使用 GitNexus：

#### 讨论阶段
- 使用 `gitnexus_query` 探索代码结构
- 使用 `gitnexus_context` 理解依赖关系
- 查看 process 资源了解执行流程

#### 规划阶段
- 使用 `gitnexus_impact` 评估修改影响
- 识别高风险修改点
- 确认模块边界

#### 执行阶段
- 修改前运行影响分析
- 高风险警告处理
- 提交前验证修改范围

#### 验证阶段
- 确认修改范围与计划一致
- 检查副作用
- 确定回归测试范围

#### 代码审查阶段
- 调用链分析
- 执行流验证

## 影响范围

- 仅修改文档文件 `CLAUDE.md`
- 不影响任何代码逻辑
- 不改变现有 GitNexus 配置

## 验证

- ✅ 文件语法正确
- ✅ Markdown 格式规范
- ✅ 与现有 GitNexus 部分内容协调一致
- ✅ 准则清晰、可操作
