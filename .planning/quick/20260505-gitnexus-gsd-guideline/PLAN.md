---
created: 2026-05-05
task_type: quick
---

# 任务：将 GSD 与 GitNexus 结合使用的准则写入 CLAUDE.md

## 目标

在 GSD 工作流部分添加明确的准则，指导在使用 GSD 过程中如何主动结合 GitNexus 的能力。

## 背景

当前 CLAUDE.md 中 GSD 工作流部分只是简单提到"该项目知识图谱由gitnexus提供，工作流使用过程中注意结合gitnexus"，但没有具体的操作指南。GitNexus 部分虽然有详细的使用说明，但与 GSD 工作流的结合不够明确。

## 计划

### 1. 在 GSD 工作流部分添加"GitNexus 集成准则"小节

位置：在"关键规则"和"参考文档"之间

内容要点：
- 讨论阶段：使用 GitNexus 探索代码结构
- 规划阶段：使用 GitNexus 分析影响范围
- 执行阶段：修改前运行 impact 分析，提交前运行 detect_changes
- 验证阶段：确认修改范围符合预期

### 2. 更新"关键规则"部分

添加：
- **修改前必检查**：任何代码修改前必须运行 gitnexus_impact
- **提交前必验证**：提交前必须运行 gitnexus_detect_changes

### 3. 保持现有内容不变

不修改 GitNexus 部分的详细说明，只在 GSD 部分添加集成指南。

## 预期结果

开发者在执行 GSD 工作流的每个阶段时，都能清楚地知道应该使用哪些 GitNexus 工具来辅助决策和验证。
