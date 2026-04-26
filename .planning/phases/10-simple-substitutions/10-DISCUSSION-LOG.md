# Phase 10: Simple Substitutions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 10-simple-substitutions
**Mode:** --auto (fully autonomous)
**Areas discussed:** LocalWallpaper migration, DownloadWallpaper migration, Template variable naming

---

## Mode: --auto

This discussion was executed in `--auto` mode. All decisions were auto-selected based on:
- Existing composable interfaces (useSettings, useDownload)
- Minimal code change principle
- Template compatibility preservation

---

## LocalWallpaper.vue Migration (SMIG-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Direct store replacement | Replace `useWallpaperStore` with `useSettings()` for `downloadPath` | ✓ |
| Create new composable | Create `useLocalWallpaper` composable wrapping all local wallpaper logic | |

**Auto-selected:** Direct store replacement
**Rationale:** useSettings() already exposes settings computed ref with downloadPath; no new composable needed

---

## DownloadWallpaper.vue Migration (SMIG-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Direct composable usage | Use `useDownload()` return values directly | ✓ |
| Keep store with wrapper | Keep store, add composable wrapper for future migration | |

**Auto-selected:** Direct composable usage
**Rationale:** useDownload() already returns downloadingList and finishedList as computed refs; store import is redundant

---

## Template Variable Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Alias on destructuring | `{ downloadingList: downloadList }` to match template | ✓ |
| Rename template variables | Change template from `downloadList` to `downloadingList` | |

**Auto-selected:** Alias on destructuring
**Rationale:** Minimal change principle - template changes are riskier than import aliasing

---

## Claude's Discretion

- Verification of migration completeness
- Ensuring computed reactivity works correctly
- Checking for any missed store references

---

## Deferred Ideas

None — discussion stayed strictly within phase scope.

---

*Phase: 10-simple-substitutions*
*Discussion completed: 2026-04-27*
