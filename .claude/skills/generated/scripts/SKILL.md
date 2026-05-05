---
name: scripts
description: "Skill for the Scripts area of wallhaven. 5 symbols across 1 files."
---

# Scripts

5 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `scripts/`
- Understanding how generateWindowsIcon, generateMacOSIcon, generateLinuxIcon work
- Modifying scripts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/generate-icons.js` | generateWindowsIcon, generateMacOSIcon, generateLinuxIcon, generatePreviewSizes, main |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `generateWindowsIcon` | Function | `scripts/generate-icons.js` | 34 |
| `generateMacOSIcon` | Function | `scripts/generate-icons.js` | 67 |
| `generateLinuxIcon` | Function | `scripts/generate-icons.js` | 105 |
| `generatePreviewSizes` | Function | `scripts/generate-icons.js` | 123 |
| `main` | Function | `scripts/generate-icons.js` | 147 |

## How to Explore

1. `gitnexus_context({name: "generateWindowsIcon"})` — see callers and callees
2. `gitnexus_query({query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
