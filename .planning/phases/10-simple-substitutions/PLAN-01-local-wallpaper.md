# PLAN-01: LocalWallpaper.vue Store Migration

---
wave: 1
depends_on: []
files_modified:
  - src/views/LocalWallpaper.vue
requirements_addressed:
  - SMIG-01
autonomous: true
---

## Goal

Remove direct `useWallpaperStore` import from LocalWallpaper.vue and replace with `useSettings()` composable to get `downloadPath`, enforcing the View → Composable → Store layered architecture.

## Context

LocalWallpaper.vue currently imports `useWallpaperStore` directly to access `wallpaperStore.settings.downloadPath`. The `useSettings()` composable already exists and provides the same data via `settings.value.downloadPath`. This is a simple 1:1 substitution with no behavior changes.

**Current code (lines 121-139):**
```typescript
import { useWallpaperStore } from '@/stores/wallpaper'
// ...
const wallpaperStore = useWallpaperStore()
// ...
const downloadPath = computed(() => wallpaperStore.settings.downloadPath)
```

**Target code:**
```typescript
import { useSettings, useAlert } from '@/composables'
// ...
const { settings } = useSettings()
// ...
const downloadPath = computed(() => settings.value.downloadPath)
```

---

## Tasks

### Task 1: Update imports and remove store reference

<read_first>
- src/views/LocalWallpaper.vue (file being modified)
- src/composables/settings/useSettings.ts (reference for composable interface)
- src/composables/index.ts (verify export exists)
</read_first>

<action>
1. In `src/views/LocalWallpaper.vue`, locate line 123:
   ```typescript
   import { useWallpaperStore } from '@/stores/wallpaper'
   ```
   DELETE this entire line.

2. Locate line 128:
   ```typescript
   import { useAlert } from '@/composables'
   ```
   REPLACE with:
   ```typescript
   import { useSettings, useAlert } from '@/composables'
   ```

3. Locate line 130:
   ```typescript
   const wallpaperStore = useWallpaperStore()
   ```
   DELETE this entire line.

4. After the modified import line and before line with `const { alert, ... }`, ADD:
   ```typescript
   const { settings } = useSettings()
   ```

5. Locate line 139:
   ```typescript
   const downloadPath = computed(() => wallpaperStore.settings.downloadPath)
   ```
   REPLACE with:
   ```typescript
   const downloadPath = computed(() => settings.value.downloadPath)
   ```
</action>

<acceptance_criteria>
- `grep -n "useWallpaperStore" src/views/LocalWallpaper.vue` returns no matches
- `grep -n "import { useSettings, useAlert }" src/views/LocalWallpaper.vue` returns exactly one match
- `grep -n "const { settings } = useSettings()" src/views/LocalWallpaper.vue` returns exactly one match
- `grep -n "settings.value.downloadPath" src/views/LocalWallpaper.vue` returns exactly one match
- `grep -n "wallpaperStore" src/views/LocalWallpaper.vue` returns no matches
</acceptance_criteria>

---

## Verification

### Automated Checks

```bash
# 1. No store imports
! grep -n "useWallpaperStore" src/views/LocalWallpaper.vue

# 2. Composable imports present
grep -n "useSettings" src/views/LocalWallpaper.vue

# 3. TypeScript compiles
npm run typecheck

# 4. No linting errors
npm run lint
```

### Manual Verification

1. Start the app: `npm run dev`
2. Navigate to Local Wallpaper page (本地列表)
3. Verify the folder path is displayed correctly in the toolbar
4. Verify the wallpaper list loads from the configured download directory
5. Verify refresh button works correctly
6. Verify "Open Folder" button works correctly
7. Verify setting wallpaper works correctly
8. Verify deleting wallpaper works correctly

---

## Rollback

If issues are found:
1. Revert `src/views/LocalWallpaper.vue` to original state
2. Original imports and code are documented in CONTEXT.md

---

## Notes

- The `useSettings()` composable returns `settings: ComputedRef<AppSettings>`, so `.value` is required in script section
- Template does not need changes - `downloadPath` is used via computed which auto-unwraps
- This is a pure refactoring - no behavior changes
