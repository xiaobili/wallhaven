# PLAN-02: DownloadWallpaper.vue Store Migration

---
wave: 1
depends_on: []
files_modified:
  - src/views/DownloadWallpaper.vue
requirements_addressed:
  - SMIG-02
autonomous: true
---

## Goal

Remove direct `useDownloadStore` import from DownloadWallpaper.vue and replace with `useDownload()` composable to get download list states, enforcing the View → Composable → Store layered architecture.

## Context

DownloadWallpaper.vue currently imports `useDownloadStore` directly to access `downloadingList` and `finishedList`. The `useDownload()` composable already exists and provides these same lists as computed refs. This is a simple substitution with renaming to match existing template variable names.

**Current code (lines 99-121):**
```typescript
import { useDownloadStore } from '@/stores/modules/download'
import { useDownload, useAlert } from '@/composables'
// ...
const downloadStore = useDownloadStore()
// ...
const downloadList = computed(() => downloadStore.downloadingList)
const downloadFinishedList = computed(() => downloadStore.finishedList)
```

**Target code:**
```typescript
import { useDownload, useAlert } from '@/composables'
// ...
const {
  downloadingList: downloadList,
  finishedList: downloadFinishedList,
  loadHistory,
  removeFinished,
  pauseDownload,
  cancelDownload,
  resumeDownload
} = useDownload()
```

---

## Tasks

### Task 1: Remove store import and update composable usage

<read_first>
- src/views/DownloadWallpaper.vue (file being modified)
- src/composables/download/useDownload.ts (reference for composable interface)
- src/composables/index.ts (verify export exists)
</read_first>

<action>
1. In `src/views/DownloadWallpaper.vue`, locate line 101:
   ```typescript
   import { useDownloadStore } from '@/stores/modules/download'
   ```
   DELETE this entire line.

2. Locate lines 106-107:
   ```typescript
   // Pinia Store
   const downloadStore = useDownloadStore()
   ```
   DELETE both lines (the comment and the store initialization).

3. Locate lines 109-116:
   ```typescript
   // Composables - 使用 useDownload 提供的方法来执行实际的下载操作
   const {
     loadHistory,
     removeFinished,
     pauseDownload,    // 来自 useDownload，会调用服务层
     cancelDownload,   // 来自 useDownload，会调用服务层
     resumeDownload    // 来自 useDownload，会调用服务层
   } = useDownload()
   ```
   REPLACE with:
   ```typescript
   // Composables
   const {
     downloadingList: downloadList,
     finishedList: downloadFinishedList,
     loadHistory,
     removeFinished,
     pauseDownload,
     cancelDownload,
     resumeDownload
   } = useDownload()
   ```

4. Locate lines 119-121:
   ```typescript
   // 从store获取数据（使用computed保持响应式）
   const downloadList = computed(() => downloadStore.downloadingList)
   const downloadFinishedList = computed(() => downloadStore.finishedList)
   ```
   DELETE all three lines (the comment and both computed declarations).

5. The resulting code section (lines 99-122) should now look like:
   ```typescript
   import { computed, onMounted, onUnmounted } from 'vue'
   import { useDownload, useAlert } from '@/composables'
   import { formatFileSize, formatResolution, formatSpeed, formatTime } from '@/utils/helpers'
   import Alert from '@/components/Alert.vue'

   // Composables
   const {
     downloadingList: downloadList,
     finishedList: downloadFinishedList,
     loadHistory,
     removeFinished,
     pauseDownload,
     cancelDownload,
     resumeDownload
   } = useDownload()
   const { alert, showSuccess, showError, showInfo, showWarning, hideAlert } = useAlert()
   ```
</action>

<acceptance_criteria>
- `grep -n "useDownloadStore" src/views/DownloadWallpaper.vue` returns no matches
- `grep -n "downloadStore" src/views/DownloadWallpaper.vue` returns no matches
- `grep -n "downloadingList: downloadList" src/views/DownloadWallpaper.vue` returns exactly one match
- `grep -n "finishedList: downloadFinishedList" src/views/DownloadWallpaper.vue` returns exactly one match
- `grep -n "const downloadList = computed" src/views/DownloadWallpaper.vue` returns no matches
- Template still uses `downloadList` and `downloadFinishedList` (unchanged)
</acceptance_criteria>

---

## Verification

### Automated Checks

```bash
# 1. No store imports
! grep -n "useDownloadStore" src/views/DownloadWallpaper.vue

# 2. No store references
! grep -n "downloadStore" src/views/DownloadWallpaper.vue

# 3. Composable destructuring with aliases present
grep -n "downloadingList: downloadList" src/views/DownloadWallpaper.vue
grep -n "finishedList: downloadFinishedList" src/views/DownloadWallpaper.vue

# 4. TypeScript compiles
npm run typecheck

# 5. No linting errors
npm run lint
```

### Manual Verification

1. Start the app: `npm run dev`
2. Navigate to Download Center page (下载中心)
3. Verify "下载中" (downloading) section displays active downloads correctly
4. Verify "已完成" (finished) section displays finished downloads correctly
5. Test pause download functionality (if any active download)
6. Test resume download functionality (if any paused download)
7. Test cancel download functionality
8. Test delete finished record functionality
9. Test "Open in folder" functionality for finished downloads

---

## Rollback

If issues are found:
1. Revert `src/views/DownloadWallpaper.vue` to original state
2. Original imports and code are documented in CONTEXT.md

---

## Notes

- Using destructuring with aliases (`downloadingList: downloadList`) to match existing template variable names without template changes
- The `useDownload()` composable returns computed refs directly, so no additional `computed()` wrapper is needed
- Template code remains unchanged - it still uses `downloadList` and `downloadFinishedList`
- This is a pure refactoring - no behavior changes
- The methods `loadHistory`, `removeFinished`, `pauseDownload`, `cancelDownload`, `resumeDownload` are already being used from `useDownload()` composable, only the list states needed to be moved
