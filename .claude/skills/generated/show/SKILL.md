---
name: show
description: "Skill for the Show area of wallhaven. 5 symbols across 1 files."
---

# Show

5 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how showAlert, showSuccess, showError work
- Modifying show-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/core/useAlert.ts` | showAlert, showSuccess, showError, showWarning, showInfo |

## Entry Points

Start here when exploring this area:

- **`showAlert`** (Function) — `src/composables/core/useAlert.ts:72`
- **`showSuccess`** (Function) — `src/composables/core/useAlert.ts:96`
- **`showError`** (Function) — `src/composables/core/useAlert.ts:107`
- **`showWarning`** (Function) — `src/composables/core/useAlert.ts:117`
- **`showInfo`** (Function) — `src/composables/core/useAlert.ts:127`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `showAlert` | Function | `src/composables/core/useAlert.ts` | 72 |
| `showSuccess` | Function | `src/composables/core/useAlert.ts` | 96 |
| `showError` | Function | `src/composables/core/useAlert.ts` | 107 |
| `showWarning` | Function | `src/composables/core/useAlert.ts` | 117 |
| `showInfo` | Function | `src/composables/core/useAlert.ts` | 127 |

## How to Explore

1. `gitnexus_context({name: "showAlert"})` — see callers and callees
2. `gitnexus_query({query: "show"})` — find related execution flows
3. Read key files listed above for implementation details
