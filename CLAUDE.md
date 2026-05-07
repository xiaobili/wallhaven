# Wallhaven 壁纸浏览器 - 项目指导

行为准则，用于减少常见的 LLM 编码错误。可根据项目特定说明进行合并。

**权衡：** 这些准则偏向谨慎而非速度。对于简单的任务，请自行判断。


## 1. 编码前先思考

**不要假设。不要隐藏困惑。明确权衡。**

在实现之前：

- 明确陈述你的假设。如果不确定，请提问。
- 如果存在多种解释，请呈现出来——不要默默地选择其中一个。
- 如果有更简单的方法，请说出来。必要时提出反对意见。
- 如果有不清楚的地方，停下来。指出困惑之处。提问。

## 2. 简洁优先

**用最少的代码解决问题。不做推测性编程。**

- 不添加超出要求的功能。
- 不为单次使用的代码创建抽象。
- 不添加未请求的"灵活性"或"可配置性"。
- 不为不可能发生的场景添加错误处理。
- 如果你写了 200 行代码，而实际上 50 行就够了，那就重写它。

问自己："资深工程师会说这过于复杂吗？"如果是，那就简化它。

## 3. 精准修改

**只修改必须修改的部分。只清理你自己造成的混乱。**

编辑现有代码时：

- 不要"改进"相邻的代码、注释或格式。
- 不要重构没有问题的部分。
- 遵循现有的代码风格，即使你会用不同的方式实现。
- 如果发现无关的死代码，提出来——不要删除它。

当你的更改产生孤儿代码时：

- 移除由你的更改导致的未使用的导入/变量/函数。
- 除非被要求，否则不要移除预先存在的死代码。

检验标准：每一行更改都应该能直接追溯到用户的请求。

## 4. 目标驱动执行

**定义成功标准。循环直到验证完成。**

将任务转化为可验证的目标：

- "添加验证" → "为无效输入编写测试，然后让它们通过"
- "修复 bug" → "编写一个重现该问题的测试，然后让它通过"
- "重构 X" → "确保重构前后测试都能通过"

对于多步骤任务，简要说明计划：

```
1. [步骤] → 验证：[检查项]
2. [步骤] → 验证：[检查项]
3. [步骤] → 验证：[检查项]
```

明确的成功标准让你能够独立循环执行。模糊的标准（"让它工作"）需要不断澄清。

---

**这些准则有效的标志是：** diff 中不必要的更改更少，因过度复杂化而导致的重写更少，澄清性问题出现在实现之前而不是犯错之后。

<!-- gsd:start -->
# GSD 工作流强制执行


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
- **修改前必检查**：任何代码修改前必须运行 `gitnexus_impact` 分析影响范围
- **提交前必验证**：提交前必须运行 `gitnexus_detect_changes` 确认修改范围符合预期

### GitNexus 集成准则

在使用 GSD 工作流的各个阶段，必须主动结合 GitNexus 的能力：

#### 1. 讨论阶段（Discuss Phase）

- **探索代码结构**：使用 `gitnexus_query({query: "概念"})` 查找相关执行流程
- **理解依赖关系**：使用 `gitnexus_context({name: "符号名"})` 了解符号的调用者和被调用者
- **查看执行流程**：读取 `gitnexus://repo/wallhaven/process/{name}` 了解完整执行路径

#### 2. 规划阶段（Plan Phase）

- **评估修改影响**：对计划修改的符号运行 `gitnexus_impact({target: "符号名", direction: "upstream"})`
- **识别高风险修改**：标记影响范围大（HIGH/CRITICAL）的修改点，在计划中特别说明
- **确认模块边界**：使用 `gitnexus_query` 确认修改是否涉及多个功能模块

#### 3. 执行阶段（Execute Phase）

- **修改前必做**：
  ```typescript
  // 任何代码修改前，先运行影响分析
  gitnexus_impact({target: "symbolName", direction: "upstream"})
  ```
- **高风险警告**：如果 impact 返回 HIGH 或 CRITICAL，必须先向用户确认
- **原子提交验证**：每次提交前运行 `gitnexus_detect_changes()` 确认修改范围

#### 4. 验证阶段（Verify Phase）

- **确认修改范围**：使用 `gitnexus_detect_changes()` 验证实际修改与计划一致
- **检查副作用**：确认没有意外影响到其他执行流程
- **回归测试指引**：根据 impact 分析结果，确定需要测试的功能模块

#### 5. 代码审查阶段（Code Review）

- **调用链分析**：使用 `gitnexus_context` 检查修改的符号是否影响关键路径
- **执行流验证**：读取相关的 process 资源，确认修改不会破坏现有流程

## 参考文档

- `.planning/codebase/ARCHITECTURE.md` — 现有架构
- `.planning/codebase/CONCERNS.md` — 技术债务清单
- `.planning/research/SUMMARY.md` — 研究发现摘要
- `.planning/research/PITFALLS.md` — 重构陷阱指南
<!-- gsd:end -->


<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **wallhaven** (2484 symbols, 4177 relationships, 169 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/wallhaven/context` | Codebase overview, check index freshness |
| `gitnexus://repo/wallhaven/clusters` | All functional areas |
| `gitnexus://repo/wallhaven/processes` | All execution flows |
| `gitnexus://repo/wallhaven/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Clients area (107 symbols) | `.claude/skills/generated/clients/SKILL.md` |
| Work in the Services area (57 symbols) | `.claude/skills/generated/services/SKILL.md` |
| Work in the Handlers area (39 symbols) | `.claude/skills/generated/handlers/SKILL.md` |
| Work in the Favorites area (36 symbols) | `.claude/skills/generated/favorites/SKILL.md` |
| Work in the Wallpaper area (28 symbols) | `.claude/skills/generated/wallpaper/SKILL.md` |
| Work in the Repositories area (13 symbols) | `.claude/skills/generated/repositories/SKILL.md` |
| Work in the Errors area (8 symbols) | `.claude/skills/generated/errors/SKILL.md` |
| Work in the Download area (7 symbols) | `.claude/skills/generated/download/SKILL.md` |
| Work in the Main area (6 symbols) | `.claude/skills/generated/main/SKILL.md` |
| Work in the Show area (5 symbols) | `.claude/skills/generated/show/SKILL.md` |
| Work in the Scripts area (5 symbols) | `.claude/skills/generated/scripts/SKILL.md` |
| Work in the Local area (3 symbols) | `.claude/skills/generated/local/SKILL.md` |

<!-- gitnexus:end -->
