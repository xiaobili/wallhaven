# Phase 20: Favorites Operations UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 20-favorites-operations-ui
**Areas discussed:** Auto mode — all areas auto-selected
**Mode:** --auto (autonomous)

---

## Auto Mode Decisions

All gray areas were resolved using recommended defaults in autonomous mode.

### Favorite Button Placement (FAV-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Card top-left corner | Symmetric with existing buttons | ✓ |
| Card top-right corner | Near the "set as wallpaper" button | |
| Card bottom overlay | On hover, show favorite button | |

**Auto-selected:** Card top-left corner (consistent with checkbox pattern)

### Collection Selector Type (FAV-01, FAV-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown menu | Lightweight, appears near button | ✓ |
| Modal dialog | Full-screen overlay | |
| Popover card | More detailed selection UI | |

**Auto-selected:** Dropdown menu (lightweight, quick operation)

### Remove Operation Location (FAV-03)

| Option | Description | Selected |
|--------|-------------|----------|
| "×" button in dropdown | On selected collection items | ✓ |
| Separate remove button | Dedicated remove action | |
| Long-press context menu | Hidden by default | |

**Auto-selected:** "×" button in dropdown (intuitive, inline)

### Move Operation UI (FAV-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Right-click in dropdown | "Move here" option | ✓ |
| Dedicated move button | Separate button for moving | |
| Drag and drop | Drag collection item to reorder | |

**Auto-selected:** Right-click in dropdown (low-frequency operation)

### Favorite Indicator Style (FAV-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Corner dot/badge | Small visual indicator | ✓ |
| Border highlight | Outline the card | |
| Overlay icon | Show heart icon on card | |

**Auto-selected:** Corner dot/badge (subtle, informative)

---

## Claude's Discretion

- Dropdown menu exact styling and animations
- Favorite button precise position and size
- Badge styling details
- Keyboard shortcut support (e.g., `F` key for quick favorite)
- Whether to add favorite functionality to LocalWallpaper

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Discussion completed: 2026-04-28 (auto mode)*
