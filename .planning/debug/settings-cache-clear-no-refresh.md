---
status: resolved
trigger: "设置页面点击清空缓存后，设置页面数据没有刷新，软件重启后才刷新"
created: "2026-04-29"
updated: "2026-04-29"
---

# Debug Session: settings-cache-clear-no-refresh

## Symptoms

**Expected Behavior**: Clear cache should reload all settings page data

**Actual Behavior**: Cache management section updates correctly, but download directory, API key, and other sections don't update after clearing cache

**Error Messages**: None

**Timeline**: Issue exists consistently

**Reproduction**: Every time - click clear cache button in settings page

## Current Focus

hypothesis: "startEdit() copies from stale store.settings after store is cleared"
test: ""
expecting: ""
next_action: ""
reasoning_checkpoint: null
tdd_checkpoint: null

## Evidence

- timestamp: "2026-04-29"
  finding: "clearCache function in SettingPage.vue calls settingsService.clearStore() to clear electron-store, then calls startEdit() to sync editableSettings from store.settings"

- timestamp: "2026-04-29"
  finding: "startEdit() does Object.assign(editableSettings.value, store.settings) - copies from store.settings to editableSettings"

- timestamp: "2026-04-29"
  finding: "store.settings is NOT refreshed after clearStore() is called - it still contains old values"

- timestamp: "2026-04-29"
  finding: "cacheInfo.thumbnailsCount and cacheInfo.tempFilesCount are explicitly set to 0 after clear (lines 330-331), which is why cache management section updates correctly"

- timestamp: "2026-04-29"
  finding: "load() function in useSettings.ts fetches settings from settingsService.get() and updates store.settings - this is what's missing"

## Eliminated

<!-- No eliminated hypotheses -->

## Resolution

root_cause: "After clearing the store with settingsService.clearStore(), the code calls startEdit() which copies from store.settings to editableSettings. However, store.settings is never refreshed after the store is cleared - it still contains the old stale values. The load() function needs to be called first to reload settings from storage (which will now return default values since the store was cleared)."

fix: "Added await load() before startEdit() in the clearCache function. This ensures: 1) Settings are reloaded from electron-store (now empty/cleared, so defaults are returned), 2) store.settings gets the fresh values, 3) editableSettings is synced from the updated store."

verification: "Manual testing required: 1) Open settings page, 2) Note current settings values, 3) Click clear cache, 4) Verify all sections (download directory, API key, etc.) now show default/empty values immediately without restart"

files_changed:
  - "src/views/SettingPage.vue"
