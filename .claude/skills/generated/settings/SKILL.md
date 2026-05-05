---
name: settings
description: "Skill for the Settings area of wallhaven. 4 symbols across 1 files."
---

# Settings

4 symbols | 1 files | Cohesion: 60%

## When to Use

- Working with code in `src/`
- Understanding how useSettings, load, reset work
- Modifying settings-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/settings/useSettings.ts` | useSettings, load, reset, getDefaults |

## Entry Points

Start here when exploring this area:

- **`useSettings`** (Function) — `src/composables/settings/useSettings.ts:57`
- **`load`** (Function) — `src/composables/settings/useSettings.ts:66`
- **`reset`** (Function) — `src/composables/settings/useSettings.ts:104`
- **`getDefaults`** (Function) — `src/composables/settings/useSettings.ts:123`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `useSettings` | Function | `src/composables/settings/useSettings.ts` | 57 |
| `load` | Function | `src/composables/settings/useSettings.ts` | 66 |
| `reset` | Function | `src/composables/settings/useSettings.ts` | 104 |
| `getDefaults` | Function | `src/composables/settings/useSettings.ts` | 123 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Reset → ShowAlert` | cross_community | 3 |
| `InitializeApp → UseAlert` | cross_community | 3 |
| `InitializeApp → GetDefaults` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Wallpaper | 2 calls |
| Favorites | 1 calls |

## How to Explore

1. `gitnexus_context({name: "useSettings"})` — see callers and callees
2. `gitnexus_query({query: "settings"})` — find related execution flows
3. Read key files listed above for implementation details
