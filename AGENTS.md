<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **wallhaven** (1910 symbols, 3506 relationships, 151 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
| Work in the Clients area (56 symbols) | `.claude/skills/generated/clients/SKILL.md` |
| Work in the Services area (47 symbols) | `.claude/skills/generated/services/SKILL.md` |
| Work in the Wallpaper area (43 symbols) | `.claude/skills/generated/wallpaper/SKILL.md` |
| Work in the Handlers area (38 symbols) | `.claude/skills/generated/handlers/SKILL.md` |
| Work in the Favorites area (31 symbols) | `.claude/skills/generated/favorites/SKILL.md` |
| Work in the Download area (17 symbols) | `.claude/skills/generated/download/SKILL.md` |
| Work in the Errors area (8 symbols) | `.claude/skills/generated/errors/SKILL.md` |
| Work in the Main area (6 symbols) | `.claude/skills/generated/main/SKILL.md` |
| Work in the Scripts area (5 symbols) | `.claude/skills/generated/scripts/SKILL.md` |
| Work in the Settings area (4 symbols) | `.claude/skills/generated/settings/SKILL.md` |

<!-- gitnexus:end -->
