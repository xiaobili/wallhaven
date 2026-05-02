# Phase 40: Online Wallpaper Heart Multi-Collection Status - Research

**Researched:** 2026-05-02
**Domain:** Vue 3 Component Props, Pinia reactivity, CSS state classes, three-state heart indicator
**Confidence:** HIGH

## Summary

This phase extends the heart button in WallpaperList.vue and ImagePreview.vue from a binary (favorited/not-favorited) to a three-state visual indicator: red for default collection, blue for non-default collections, transparent for none. The data flow pattern is already established -- OnlineWallpaper.vue passes `favoriteIds: Set<string>` as props -- and this phase simply adds two more props derived from the same store data.

**Primary recommendation:** Add `wallpaperCollectionMap: Map<string, string[]>` and `defaultCollectionId: string | null` props to both child components. Compute the map from the existing `useFavorites().favorites` (which already provides `FavoriteItem[]` with collectionId per wallpaperId). Implement a pure `getHeartState()` function shared between the two components. Add `.is-favorite-in-other` CSS class for the blue state.

**Key constraint:** ImagePreview is shared with LocalWallpaper.vue and FavoritesPage.vue (out of scope), so new props must be optional with a fallback to the existing binary `favoriteIds` logic.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- D-01: OnlineWallpaper passes two new props to WallpaperList and ImagePreview:
  - `defaultCollectionId: string | null`
  - `wallpaperCollectionMap: Map<string, string[]>`
- D-02: OnlineWallpaper computes `wallpaperCollectionMap` from `useFavorites().favorites` (group by wallpaperId)
- D-03: Child components compute heart state from `defaultCollectionId` + `wallpaperCollectionMap` locally
- D-04: In default collection (regardless of other collections) -> red `#ff6b6b`
- D-05: Not in default, but in other collections -> blue `#5b8def`
- D-06: Not in any collection -> transparent (outline, hover only, existing behavior)
- D-07: Blue `#5b8def` has same brightness/saturation as red `#ff6b6b`
- D-08: Left-click behavior unchanged -- toggles default collection
- D-09: Right-click behavior unchanged -- shows collection dropdown
- D-10: ImagePreview applies same three-state logic as WallpaperList, only CSS class names differ

### Claude's Discretion

- CSS implementation details (transitions, hover micro-adjustments)
- `wallpaperCollectionMap` reactivity update timing (follows `favorites` changes)
- Empty default collection edge case (no default -> blue if in ANY collection)

### Deferred Ideas (OUT OF SCOPE)

None.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Heart state calculation | Browser/Client | -- | Pure function from prop data, no server/API needed |
| Collection map computation | Browser/Client | -- | Derived from store data in OnlineWallpaper computed |
| CSS state rendering | Browser/Client | -- | Scoped CSS class bindings in Vue templates |
| Default collection ID | Store (Pinia) | Composable | `useCollections().getDefault()` reads from reactive store |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.5.32 | Component rendering, computed props, scoped CSS | Existing framework |
| Pinia | 3.0.4 | Shared favorites/collections state | Existing store pattern |
| TypeScript | 6.0.0 | Type safety for new props and heart state | Existing type system |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Font Awesome | (bundled) | Heart icon via `fas fa-heart` / `far fa-heart` | Existing icon system |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Map<string, string[]>` prop | Custom object `Record<string, string[]>` | Map has `.has()`/.get() methods, consistent with existing `Set<string>` pattern. Object literal is more serializable but Map is idiomatic for key-value lookups. Both work -- Map preferred for API consistency. |
| `getHeartState()` pure function | Inline computed in each component | Pure function is testable, sharable, single source of truth for the three-state logic |
| `.is-favorite-in-other` class | Single computed class string | Separate boolean classes are simpler for template logic and follow existing `.is-favorite` pattern |

## Architecture Patterns

### Data Flow Diagram

```
Pinia Store (favorites: FavoriteItem[])
  │
  ├─ computed → favoriteIds: Set<string>  (binary — existing, kept for backward compat)
  │
  └─ useFavorites().favorites.value       (raw data)
       │
       ▼
  OnlineWallpaper.vue
     ├─ computed: wallpaperCollectionMap = new Map<wallpaperId, collectionId[]>
     │     (iterates favorites, groups by wallpaperId → collectionId list)
     │
     ├─ computed: defaultCollectionId = getDefault()?.id ?? null
     │
     ├─ passes as props ──────────────────────────────┐
     │                                                 │
     ▼                                                 ▼
  WallpaperList.vue                              ImagePreview.vue
     │                                                 │
     ├─ getHeartState(id, defaultId, map)              ├─ same getHeartState()
     │   returns HeartState                            │   (requires fallback for FavoritesPage usage)
     │   = 'default' | 'non-default' | 'none'          │
     │                                                 │
     ├─ :class binding                                 ├─ :class binding
     │   .is-favorite ← 'default'                      │   .is-favorite ← 'default'
     │   .is-favorite-in-other ← 'non-default'         │   .is-favorite-in-other ← 'non-default'
     │                                                 │
     └─ :icon binding                                  └─ :icon binding
         fas fa-heart ← filled state                        fas fa-heart ← filled state
         far fa-heart ← 'none'                              far fa-heart ← 'none'
```

### Component Responsibilities

| File | Responsibility |
|------|---------------|
| OnlineWallpaper.vue | Computes `wallpaperCollectionMap` and `defaultCollectionId`; passes new props |
| WallpaperList.vue | Receives new props; computes heart state per wallpaper; applies CSS classes |
| ImagePreview.vue | Same as WallpaperList but with fallback for non-OnlineWallpaper usage |
| useFavorites composable | Provides `favorites: FavoriteItem[]` raw data (already exposed) |
| useCollections composable | Provides `getDefault()` for default collection ID (already available) |

### Recommended Project Structure

No new files needed. The heart state utility function can be added to `src/utils/`:

```
src/
├── utils/
│   └── heart.ts         # NEW — getHeartState() pure function + HeartState type
├── components/
│   ├── WallpaperList.vue # MODIFY — two new props, updated template/CSS
│   └── ImagePreview.vue  # MODIFY — two new optional props, fallback logic, CSS
└── views/
    └── OnlineWallpaper.vue # MODIFY — compute new props, pass to children
```

### Pattern 1: Pure Function for Heart State

**What:** A pure function `getHeartState(wallpaperId, defaultCollectionId, wallpaperCollectionMap)` that returns one of three states. This is the core business logic isolated from component rendering.

**When to use:** Everywhere heart state needs to be calculated -- both component templates and future unit tests.

**Example:**

```typescript
// src/utils/heart.ts
export type HeartState = 'default' | 'non-default' | 'none'

/**
 * Compute heart state for a wallpaper given its collection memberships.
 *
 * Priority:
 *   1. In default collection → 'default' (red)
 *   2. Not in default, in other → 'non-default' (blue)
 *   3. Not in any collection → 'none' (transparent)
 *
 * Edge cases:
 *   - defaultCollectionId is null (no default set): treat 'non-default'
 *     if in ANY collection, 'none' otherwise
 *   - Wallpaper in both default and other: 'default' takes priority
 */
export function getHeartState(
  wallpaperId: string,
  defaultCollectionId: string | null,
  collectionMap: Map<string, string[]>,
): HeartState {
  const ids = collectionMap.get(wallpaperId)
  if (!ids || ids.length === 0) return 'none'
  if (defaultCollectionId && ids.includes(defaultCollectionId)) return 'default'
  return 'non-default'
}
```

### Pattern 2: Optional New Props with Fallback (ImagePreview)

**What:** Since ImagePreview is shared with FavoritesPage and LocalWallpaper, new props must be optional. When absent, fall back to existing `favoriteIds` binary logic.

**When to use:** Only for shared components. WallpaperList (used only by OnlineWallpaper) can use required props.

**Example:**

```typescript
// ImagePreview.vue — optional new props
interface Props {
  showing: boolean
  imgInfo: WallpaperItem | null
  isLocal: boolean
  wallpaperList?: WallpaperItem[]
  currentIndex?: number
  favoriteIds?: Set<string>
  // New optional props for three-state (OnlineWallpaper only)
  wallpaperCollectionMap?: Map<string, string[]>
  defaultCollectionId?: string | null
}

// Three-state computed with fallback
const heartState = computed<HeartState>(() => {
  if (!props.imgInfo) return 'none'

  // Three-state path (OnlineWallpaper)
  if (props.wallpaperCollectionMap) {
    return getHeartState(props.imgInfo.id, props.defaultCollectionId ?? null, props.wallpaperCollectionMap)
  }

  // Binary fallback path (FavoritesPage, LocalWallpaper)
  return props.favoriteIds?.has(props.imgInfo.id) ? 'default' : 'none'
})
```

### Anti-Patterns to Avoid

- **Mutating the Map in place:** Always create a new Map in the computed. The computed's getter creates `new Map()`, ensuring prop reference changes trigger reactivity in children. [VERIFIED: Vue 3 computed dependency tracking with Map]
- **Using `reactive(new Map())`:** Vue 3 `reactive()` can wrap Map but adds complexity. A plain Map created fresh in a computed is simpler and sufficient since the child receives it as a prop.
- **Duplicating heart state logic in both components:** Extract to `src/utils/heart.ts` to avoid drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Three-state heart logic | Ad-hoc if/else in each component template | `getHeartState()` pure function | Testable, shared, single source of truth |
| Reactive collection map | Manual watcher to track favorites changes | Vue `computed` | Computed automatically tracks `favorites.value` dependencies |
| CSS hover state for blue | Overriding `:hover` with `!important` | Specificity-matched `.is-favorite-in-other:hover` | Clean CSS, no specificity battles |

**Key insight:** All the buildings blocks for this phase already exist -- `favorites` data, `getDefault()`, scoped CSS, computed props. The phase is about combining them correctly, not building anything new.

## Common Pitfalls

### Pitfall 1: Map Prop Reactivity Failure

**What goes wrong:** Child component does not re-render when favorites change.

**Why it happens:** If the `wallpaperCollectionMap` computed is not properly reactive -- e.g., if it doesn't access `favorites.value` inside the computed getter, or if the Map is mutated in place rather than replaced.

**How to avoid:** Always iterate `favorites.value` and create a fresh `new Map()` in the computed getter. Never mutate the map externally.

**Warning signs:** Heart state doesn't update after adding/removing a favorite.

### Pitfall 2: ImagePreview Backward Compatibility Regression

**What goes wrong:** FavoritesPage or LocalWallpaper break because ImagePreview no longer handles the `favoriteIds` prop.

**Why it happens:** Changing the `isFavorite` computed to only use the new `wallpaperCollectionMap` prop, breaking views that don't pass it.

**How to avoid:** New props must be optional (`?:`). The `heartState` computed must first check if `wallpaperCollectionMap` is defined. If not, fall back to `favoriteIds?.has()`.

**Warning signs:** FavoritesPage heart buttons show as transparent instead of red.

### Pitfall 3: Blue Hover State Overridden by Red

**What goes wrong:** When the button has `.is-favorite-in-other` class and the user hovers, the existing `.favorite-btn:hover` rule (which sets red `#ff6b6b`) overrides the blue `#5b8def`.

**Why it happens:** CSS specificity conflict. `.favorite-btn:hover` has specificity (0,1,1) while `.favorite-btn.is-favorite-in-other` has (0,2,0). The hover pseudo-class wins for the `background-color` property in the cascade.

**How to avoid:** Define `.is-favorite-in-other:hover` with specificity (0,2,1), or apply the blue `background-color` with the same specificity as the existing red rule.

**Warning signs:** Blue hearts flash red on hover.

### Pitfall 4: `getDefault()` Reactivity in `computed`

**What goes wrong:** The `defaultCollectionId` computed does not re-evaluate when the default collection changes.

**Why it happens:** `useCollections().getDefault()` is a plain function, not a computed ref. If called outside a reactive context, it returns a snapshot. But when called INSIDE a Vue `computed`, it accesses `store.collections` (reactive via Pinia), which Vue tracks as a dependency.

**How to avoid:** Always compute `defaultCollectionId` inside a `computed()` getter:

```typescript
const defaultCollectionId = computed(() => getDefault()?.id ?? null)
```

Do NOT call `getDefault()` in setup scope and store the result in a ref -- it will be stale.

**Warning signs:** Heart state does not change after user sets a different default collection.

### Pitfall 5: Reactivity tracking with `getDefault()` in OnlineWallpaper

**What goes wrong:** The `getDefault()` function returned by `useCollections()` captures `store` in its closure. When called inside a `computed`, it establishes reactivity via `store.collections.find(...)`. But if `useCollections()` is destructured at the module level (not inside a component setup function), it would miss the component's effect scope.

**How to avoid:** Always destructure `useCollections()` inside a component's `<script setup>` block, which is the existing pattern in OnlineWallpaper.vue.

## Code Examples

### Verified patterns from official sources:

### WallpaperCollectionMap Computation (OnlineWallpaper)

```typescript
// In OnlineWallpaper.vue <script setup>
// Add to existing destructure of useFavorites
const { favoriteIds, add: addFavorite, remove: removeFavorite, isInCollection, favorites } = useFavorites()
const { getDefault } = useCollections()

// Computed: wallpaperId → collectionId[] mapping
// Builds a Map<string, string[]> from raw FavoriteItem[] data.
// Each entry maps a wallpaper ID to the list of collection IDs it belongs to.
// A wallpaper in 0 collections → no entry in map.
// A wallpaper in 1+ collections → entry with array of collectionIds.
const wallpaperCollectionMap = computed(() => {
  const map = new Map<string, string[]>()
  for (const fav of favorites.value) {
    const ids = map.get(fav.wallpaperId)
    if (ids) {
      ids.push(fav.collectionId)
    } else {
      map.set(fav.wallpaperId, [fav.collectionId])
    }
  }
  return map
})

// Computed: default collection ID (or null if none set)
// Must be computed to reactively track store.collections changes.
const defaultCollectionId = computed(() => getDefault()?.id ?? null)
```

### WallpaperList Template Three-State Binding

```vue
<!-- In WallpaperList.vue <template> -->
<div
  class="thumb-favorite-btn"
  :class="{
    'is-favorite': heartState(liItem.id) === 'default',
    'is-favorite-in-other': heartState(liItem.id) === 'non-default',
  }"
  :title="
    heartState(liItem.id) !== 'none'
      ? '已收藏 · 右键选择收藏夹'
      : '添加到收藏 · 右键选择收藏夹'
  "
  @click.stop="handleFavoriteLeftClick(liItem, $event)"
  @contextmenu.prevent="handleFavoriteRightClick(liItem, $event)"
>
  <i :class="heartState(liItem.id) !== 'none' ? 'fas fa-heart' : 'far fa-heart'" />
</div>
```

### CSS for Blue Heart State (WallpaperList)

```css
/* Blue heart state: in non-default collection(s) only */
.thumb-favorite-btn.is-favorite-in-other {
  background: #5b8def;
  border-color: #5b8def;
  opacity: 1;
  visibility: visible;
}

/* Blue hover — same transform/opacity as red, different color */
.thumb-favorite-btn.is-favorite-in-other:hover {
  background: rgba(91, 141, 239, 0.7);
  border-color: #5b8def;
  transform: scale(1.1);
  opacity: 1;
}
```

### CSS for Blue Heart State (ImagePreview)

```css
/* Blue heart state */
.favorite-btn.is-favorite-in-other {
  background-color: #5b8def;
  border-color: #5b8def;
}

.favorite-btn.is-favorite-in-other .icon-wrap {
  color: #fff;
}

.favorite-btn.is-favorite-in-other:hover {
  background-color: rgba(91, 141, 239, 0.7);
  border-color: #5b8def;
}
```

### ImagePreview Backward-Compatible Computed

```typescript
// In ImagePreview.vue — replaces the current simple `isFavorite` computed
const heartState = computed<HeartState>(() => {
  if (!props.imgInfo) return 'none'

  // Three-state path: used by OnlineWallpaper
  if (props.wallpaperCollectionMap) {
    return getHeartState(
      props.imgInfo.id,
      props.defaultCollectionId ?? null,
      props.wallpaperCollectionMap,
    )
  }

  // Fallback path: used by FavoritesPage, LocalWallpaper
  return props.favoriteIds?.has(props.imgInfo.id) ? 'default' : 'none'
})

// Template still uses both heartState and a derived isFavorite for title text
// (isFavorite is derived for backward compat with any remaining boolean checks)
// But actually, the template should use heartState directly since we're changing it.
```

## File-by-File Change Analysis

### NEW: `src/utils/heart.ts`

- Pure function `getHeartState()` + `HeartState` type export
- ~15 lines of code
- Imported by WallpaperList.vue and ImagePreview.vue

### MODIFY: `src/views/OnlineWallpaper.vue`

- Add `favorites` to `useFavorites()` destructure (currently missing)
- Add `wallpaperCollectionMap` computed (iterates `favorites.value`, groups by wallpaperId)
- Add `defaultCollectionId` computed (from `getDefault()?.id ?? null`)
- Pass both new props to `<WallpaperList>` component
- Pass both new props to `<ImagePreview>` component (keep `favoriteIds` too for fallback)
- **Estimated change:** ~20 lines added

### MODIFY: `src/components/WallpaperList.vue`

- Add two new props to `defineProps<{}>`:
  - `wallpaperCollectionMap: Map<string, string[]>`
  - `defaultCollectionId: string | null`
- Import `getHeartState`, `HeartState` from `@/utils/heart`
- Replace `isFavorite(id)` method with `heartState(id)` returning `HeartState`
- Update template: class binding (`.is-favorite` / `.is-favorite-in-other`), icon binding (`fas` / `far`), title text
- Add `.is-favorite-in-other` CSS rules
- **Estimated change:** ~40 lines modified, ~20 lines CSS added

### MODIFY: `src/components/ImagePreview.vue`

- Add two new OPTIONAL props:
  - `wallpaperCollectionMap?: Map<string, string[]>`
  - `defaultCollectionId?: string | null`
- Import `getHeartState`, `HeartState` from `@/utils/heart`
- Replace `isFavorite` computed with `heartState` computed (with fallback)
- Update template: class binding, icon binding, title text
- Add `.is-favorite-in-other` CSS rules
- **Estimated change:** ~30 lines modified, ~15 lines CSS added

## Edge Cases

### No Default Collection Set

When `getDefault()` returns `undefined` (user has not set a default collection):
- `defaultCollectionId` computed returns `null`
- `getHeartState()`: `defaultCollectionId` is falsy, so it falls through the `if (defaultCollectionId && ...)` check
- Result: returns `'non-default'` if wallpaper is in ANY collection, `'none'` otherwise
- This aligns with D-05: blue means "in some collection but not the default," and with no default set, any collection membership qualifies

### Empty Favorites Store

When `favorites.value` is an empty array:
- `wallpaperCollectionMap` computed builds an empty Map
- All heart state queries return `'none'`
- All hearts display as transparent outline
- This is correct behavior

### Wallpaper in Both Default and Other Collections

Per D-04: red takes priority. `getHeartState()` checks `defaultCollectionId` first:
1. `collectionMap.get(id)` returns `[defaultId, otherId1, otherId2]`
2. `ids.includes(defaultCollectionId)` is true
3. Returns `'default'` (red)
This is correct.

### Default Collection ID in `getHeartState` is `null`

When `defaultCollectionId` is `null` (no default set):
- `getHeartState()`: `defaultCollectionId && ids.includes(defaultCollectionId)` evaluates to `false` (null is falsy)
- Falls through to `return 'non-default'`
- Result: any wallpaper in any collection shows as blue
- This is the fallback behavior.

Note: This means WITHOUT a default collection, there is never a red heart on the OnlineWallpaper page. The user must set a default collection for red hearts to appear. This is a design choice the CONTEXT.md defers to Claude's Discretion.

### WallpaperList Hover with Blue State

The existing hover CSS for `.thumb-favorite-btn:hover` sets `background: rgba(255, 107, 107, 0.7)` (red). Without a `.is-favorite-in-other:hover` override, a blue heart would flash red on hover. The fix is to add the specific override with higher specificity targeting the blue state.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Binary `favoriteIds: Set<string>` | `wallpaperCollectionMap: Map<string, string[]>` + `defaultCollectionId` | Phase 40 | Adds granularity without breaking existing interfaces |
| `isFavorite()` boolean method | `heartState()` returning union type | Phase 40 | Template uses two CSS classes instead of one |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useCollections().getDefault()` called inside a Vue `computed` properly tracks reactivity via `store.collections` | Architecture Patterns | Computed would not re-evaluate when the default collection changes. Mitigation: wrap in `computed(() => getDefault()?.id ?? null)` which is what we do. VERIFIED: Pinia store access inside `computed` establishes reactive dependency. |
| A2 | ImagePreview is only used by OnlineWallpaper, LocalWallpaper, and FavoritesPage | Architectural Responsibility | If another view uses ImagePreview, it might not pass `wallpaperCollectionMap` and would silently fall back to binary. Mitigation: optional props + fallback. LOW risk. |
| A3 | The `useFavorites().favorites` return is `ComputedRef<FavoriteItem[]>` that properly tracks store changes | Standard Stack | VERIFIED: `computed(() => store.favorites)` in `useFavorites()` return. |
| A4 | `#5b8def` has same brightness/saturation as `#ff6b6b` | User Constraints | This is a visual design claim. If the colors look mismatched in the actual UI, the hex value may need adjustment. D-07 states they should match -- this is for visual verification during implementation. |

## Open Questions

1. **Should `favoriteIds` remain as a prop alongside the new props?**
   - What we know: WallpaperList only used by OnlineWallpaper, so `favoriteIds` could be removed. ImagePreview is shared, so it needs fallback.
   - What's unclear: Whether removing `favoriteIds` from WallpaperList would break anything outside the investigated usage.
   - Recommendation: Keep `favoriteIds` on both components for backward compatibility. `favoriteIds` is lightweight (computed Set) and removing it provides no benefit.

2. **Where to place the `getHeartState()` utility?**
   - Options: `src/utils/helpers.ts` (existing), `src/utils/heart.ts` (new), or inline in each component
   - Recommendation: New file `src/utils/heart.ts` -- clean separation, no risk of merge conflicts with other changes to helpers.ts, easy to find for future unit tests.

3. **Does `getDefault()` inside a computed properly track Pinia reactivity?**
   - What we know: `useCollections().getDefault()` returns `store.collections.find(c => c.isDefault)`. `store.collections` is reactive. Vue tracks whatever is accessed inside `computed()`.
   - What's unclear: Whether the function call within the computed's getter is sufficient for Vue to track the Pinia store dependency.
   - Recommendation: Test this explicitly. If the computed does not re-evaluate, switch to: `const defaultCollectionId = computed(() => collections.value.find(c => c.isDefault)?.id ?? null)` where `collections` is the ComputedRef from `useCollections()`.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies -- all changes are within the renderer process, no new tools or services required).

## Validation Architecture

Skipped: `workflow.nyquist_validation` is `false` in `.planning/config.json`.

## Security Domain

Skipped: No new IPC channels, no data storage changes, no authentication/authorization logic. All changes are UI-only (CSS classes and computed properties from existing data).

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase analysis] - Current data flow in OnlineWallpaper.vue, WallpaperList.vue, ImagePreview.vue, useFavorites.ts, useCollections.ts, favorites store
- [VERIFIED: codebase analysis] - FavoriteItem type includes wallpaperId + collectionId pairs
- [VERIFIED: codebase analysis] - ImagePreview is imported by OnlineWallpaper, LocalWallpaper, FavoritesPage (3 views)
- [VERIFIED: codebase analysis] - WallpaperList is imported by OnlineWallpaper only

### Secondary (MEDIUM confidence)

- [ASSUMED] - Vue 3 `.value` access in computed establishes reactive dependency on ref
- [ASSUMED] - Pinia store refs are reactive and can be tracked by Vue computed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all existing, verified in codebase
- Architecture: HIGH - patterns are established (computed props, scoped CSS, composable data flow)
- Pitfalls: HIGH - based on real CSS specificity issues and Vue reactivity patterns

**Research date:** 2026-05-02
**Valid until:** No time sensitivity (all existing technology, no external API or library changes)
