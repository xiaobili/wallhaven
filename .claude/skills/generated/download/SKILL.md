---
name: download
description: "Skill for the Download area of wallhaven. 7 symbols across 3 files."
---

# Download

7 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how loadHistory, loadDownloadHistory, generateId work
- Modifying download-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/stores/modules/download/index.ts` | loadDownloadHistory, generateId, addDownloadTask, updateProgress, completeDownload |
| `src/services/download.service.ts` | getFinishedRecords |
| `src/composables/download/useDownload.ts` | loadHistory |

## Entry Points

Start here when exploring this area:

- **`loadHistory`** (Function) — `src/composables/download/useDownload.ts:417`
- **`loadDownloadHistory`** (Function) — `src/stores/modules/download/index.ts:36`
- **`generateId`** (Function) — `src/stores/modules/download/index.ts:29`
- **`addDownloadTask`** (Function) — `src/stores/modules/download/index.ts:46`
- **`updateProgress`** (Function) — `src/stores/modules/download/index.ts:66`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `loadHistory` | Function | `src/composables/download/useDownload.ts` | 417 |
| `loadDownloadHistory` | Function | `src/stores/modules/download/index.ts` | 36 |
| `generateId` | Function | `src/stores/modules/download/index.ts` | 29 |
| `addDownloadTask` | Function | `src/stores/modules/download/index.ts` | 46 |
| `updateProgress` | Function | `src/stores/modules/download/index.ts` | 66 |
| `completeDownload` | Function | `src/stores/modules/download/index.ts` | 85 |
| `getFinishedRecords` | Method | `src/services/download.service.ts` | 225 |

## How to Explore

1. `gitnexus_context({name: "loadHistory"})` — see callers and callees
2. `gitnexus_query({query: "download"})` — find related execution flows
3. Read key files listed above for implementation details
