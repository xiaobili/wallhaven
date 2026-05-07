---
name: local
description: "Skill for the Local area of wallhaven. 3 symbols across 2 files."
---

# Local

3 symbols | 2 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how readDirectory, goToPage, readDirectory work
- Modifying local-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/local/useLocalFiles.ts` | goToPage, readDirectory |
| `src/services/settings.service.ts` | readDirectory |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `goToPage` | Function | `src/composables/local/useLocalFiles.ts` | 94 |
| `readDirectory` | Function | `src/composables/local/useLocalFiles.ts` | 135 |
| `readDirectory` | Method | `src/services/settings.service.ts` | 131 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GoToPage → ReadDirectory` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "readDirectory"})` — see callers and callees
2. `gitnexus_query({query: "local"})` — find related execution flows
3. Read key files listed above for implementation details
