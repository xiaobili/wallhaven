# Stack Additions for Store-to-Composable Migration

> Research Date: 2026-04-27
> Milestone: v2.2 Store-to-Composable Migration
> Target: Migrate views from direct store access to composable-based access

---

## Executive Summary

**No new runtime dependencies required.** The existing stack (Vue 3.5.32 + Pinia 3.0.4 + TypeScript 6.0.0) fully supports the Store-to-Composable migration pattern. The migration is primarily an architectural refactoring that leverages existing capabilities.

---

## 1. What's NOT Needed

| Package | Reason |
|---------|--------|
| No new state management | Pinia 3.0.4 already supports composables consuming stores |
| No new Vue libraries | Vue 3.5.32 Composition API fully supports the pattern |
| No new build tools | Vite 7.3.2 + TypeScript 6.0.0 handle the architecture |
| No runtime validation | TypeScript provides compile-time layer enforcement |

---

## 2. Existing Stack Validation

### 2.1 Already Supporting the Migration

| Component | Version | Capability |
|-----------|---------|------------|
| Vue 3 | 3.5.32 | Composition API with `computed`, reactive refs |
| Pinia | 3.0.4 | Store composition within composables |
| TypeScript | 6.0.0 | Interface definitions for composable returns |
| Vitest | 4.1.4 | Testing composables in isolation |

### 2.2 Current Architecture Pattern (Already Validated)

The existing composables already demonstrate the correct pattern:

```typescript
// useSettings.ts - exemplifies the pattern
import { useWallpaperStore } from '@/stores/wallpaper'
import { settingsService } from '@/services'

export function useSettings(): UseSettingsReturn {
  const store = useWallpaperStore()  // Composable consumes store
  // ... business logic
  return {
    settings: computed(() => store.settings),
    // ... methods
  }
}
```

---

## 3. Layer Boundary Enforcement

### 3.1 Recommended: ESLint `no-restricted-imports`

**Rationale:** Native ESLint rule, zero dependencies, sufficient for this migration scope.

```javascript
// eslint.config.js (flat config) or .eslintrc.cjs
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/stores/*'],
        importNames: ['useWallpaperStore', 'useDownloadStore'],
        message: 'Views must import stores via composables, not directly. Use useWallpaperList, useDownload, or useSettings instead.'
      }]
    }]
  }
}
```

### 3.2 Alternative: eslint-plugin-boundaries (Optional Future Enhancement)

If stricter layer enforcement is needed in the future:

| Package | Version | Purpose |
|---------|---------|---------|
| eslint-plugin-boundaries | ^5.0.0 | Element type tagging and import rules |

**Why NOT added now:**
- Migration scope is limited to 4 view files
- TypeScript + code review provides sufficient enforcement
- Zero-cost `no-restricted-imports` rule handles the core requirement
- Can be added later if architectural drift becomes an issue

### 3.3 TypeScript Path Enforcement

The existing `tsconfig.app.json` paths support the architecture:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

No changes needed — paths already enable clean imports.

---

## 4. Integration Points

### 4.1 Views → Composables (Primary Migration Target)

**Current State (to migrate):**
```typescript
// OnlineWallpaper.vue - CURRENT (anti-pattern)
import { useWallpaperStore } from '@/stores/wallpaper'
const wallpaperStore = useWallpaperStore()  // Direct store access
```

**Target State:**
```typescript
// OnlineWallpaper.vue - TARGET (correct pattern)
import { useWallpaperList, useSettings } from '@/composables'
const { wallpapers, loading, error } = useWallpaperList()
const { settings } = useSettings()
// No direct store import
```

### 4.2 Composables → Stores (Already Validated)

Existing composables correctly consume stores:

| Composable | Store Dependency |
|------------|------------------|
| useWallpaperList | useWallpaperStore |
| useDownload | useDownloadStore |
| useSettings | useWallpaperStore |

### 4.3 Composables → Services (Already Validated)

Existing composables correctly consume services:

| Composable | Service Dependency |
|------------|-------------------|
| useWallpaperList | wallpaperService |
| useDownload | downloadService |
| useSettings | settingsService |

---

## 5. Migration Scope Analysis

### 5.1 Files Requiring Store-to-Composable Migration

| File | Current Store Import | Target Composable |
|------|---------------------|-------------------|
| OnlineWallpaper.vue | useWallpaperStore | useWallpaperList, useSettings |
| LocalWallpaper.vue | useWallpaperStore | useSettings (settings only) |
| DownloadWallpaper.vue | useDownloadStore | useDownload (already using) |
| SettingPage.vue | useWallpaperStore | useSettings |

### 5.2 Store Access Patterns to Abstract

| Store Property | Composable Getter |
|----------------|-------------------|
| `store.totalPageData` | `wallpapers` (useWallpaperList) |
| `store.loading` | `loading` (useWallpaperList) |
| `store.error` | `error` (useWallpaperList) |
| `store.settings` | `settings` (useSettings) |
| `store.queryParams` | `queryParams` (useWallpaperList) |

---

## 6. Implementation Approach

### 6.1 Phase 1: Extend Existing Composables (No New Dependencies)

1. **useWallpaperList**: Add `settings` computed if needed, or views use both composables
2. **useDownload**: Already complete — verify DownloadWallpaper.vue uses it exclusively
3. **useSettings**: Already complete — verify SettingPage.vue uses it

### 6.2 Phase 2: Migrate Views

Replace direct store imports with composable returns:

```typescript
// Before
const wallpaperStore = useWallpaperStore()
const loading = computed(() => wallpaperStore.loading)

// After
const { loading } = useWallpaperList()
```

### 6.3 Phase 3: Add ESLint Rule (Optional)

Add `no-restricted-imports` rule to prevent regression.

---

## 7. Testing Strategy (Existing Stack)

### 7.1 Vitest Configuration (Already Supports)

```typescript
// vitest.config.ts - already configured
{
  environment: 'jsdom',
  // Composables can be tested in isolation
}
```

### 7.2 Composable Testing Pattern

```typescript
// useWallpaperList.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { useWallpaperList } from '@/composables'

describe('useWallpaperList', () => {
  it('returns wallpapers computed from store', () => {
    const { wallpapers, loading, fetch } = useWallpaperList()
    // Test composable behavior
  })
})
```

---

## 8. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking reactivity | Use `computed(() => store.value)` pattern (already validated) |
| Store method exposure | Only expose methods that belong to composable's responsibility |
| Circular dependencies | Composables import stores, never reverse (TypeScript enforces) |
| Feature creep | Migration scope limited to store-to-composable, no new features |

---

## 9. Decision Summary

| Decision | Rationale |
|----------|-----------|
| No new runtime packages | Existing Vue 3 + Pinia + TypeScript fully supports the pattern |
| No eslint-plugin-boundaries | Overkill for 4-file migration; `no-restricted-imports` sufficient |
| Extend existing composables | useWallpaperList, useDownload, useSettings already validated |
| TypeScript as enforcement | Compile-time type checking prevents architectural drift |

---

## 10. What NOT to Add

| Package/Tool | Reason |
|--------------|--------|
| eslint-plugin-boundaries | Overkill for 4-file scope; native ESLint rule sufficient |
| VueUse store composables | Custom composables already implemented and validated |
| MobX/Zustand | Pinia 3.0.4 already integrated and working |
| Runtime type validators (zod) | TypeScript provides compile-time safety |

---

*Research Date: 2026-04-27*
*Milestone: v2.2 Store-to-Composable Migration*
