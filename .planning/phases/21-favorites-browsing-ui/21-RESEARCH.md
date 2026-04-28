# Phase 21: Favorites Browsing UI - Research

**Researched:** 2026-04-28
**Domain:** Vue 3 UI component implementation (wallpaper grid, filtering, download integration)
**Confidence:** HIGH

## Summary

Phase 21 upgrades the existing FavoritesPage skeleton into a fully functional favorites browsing experience. The page already has sidebar-based collection selection and a basic image grid -- the work is completing the grid with proper wallpaper cards (with badges, download, preview, set-as-wallpaper actions), adding a "show all" filter mode, and polishing empty states.

The core technical challenge is minimal: all composables (`useFavorites`, `useCollections`, `useDownload`, `useWallpaperSetter`) are complete, the route and navigation exist, and the card pattern is well-established in `WallpaperList.vue` using the global `list.css` styles. The primary work is creating `FavoriteWallpaperCard.vue` that mirrors the `.thumb` card pattern from `list.css` while adding collection badges, and wiring the card actions into the FavoritesPage.

**Primary recommendation:** Create `FavoriteWallpaperCard.vue` using the established `.thumb` / `.thumb-info` CSS pattern from `list.css`, wire download/preview/set-bg actions through existing composables, add "all favorites" filter mode to FavoritesPage, and add `FavoritesPage` to the KeepAlive include list in `Main.vue`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Reuse WallpaperList card style but do NOT reuse WallpaperList component itself (it couples online search pagination, selection, API logic). Create independent favorites grid with same visual style.
- **D-02:** Favorite wallpaper card structure: heart icon + collection badge top-left, thumbnail center, bottom bar with resolution + download button.
- **D-03:** Collection filtering via sidebar selection (already implemented). Add "all collections" option showing all favorited wallpapers.
- **D-04:** Default sort by added time descending (newest first).
- **D-05:** Collection badge on cards: heart icon + collection count badge at top-left; hover shows collection names tooltip; use `getCollectionsForWallpaper(wallpaperId)`.
- **D-06:** In ImagePreview mode, show collection list in sidebar when viewing from favorites.
- **D-07:** Reuse existing download flow via `useDownload().addTask()`.
- **D-08:** Download button in card bottom info bar, alongside "set as wallpaper" button.
- **D-09:** Empty states: no collections (Phase 19 done), empty collection (Phase 19 done), all-favorites-empty ("go browse online wallpapers").
- **D-10:** Component file structure: new `FavoriteWallpaperCard.vue` in `src/components/favorites/`.
- **D-11:** Add FavoritesPage to Main.vue KeepAlive include list.
- **D-12:** Navigation/routing already complete (Phase 19). Confirm it works.

### Claude's Discretion
- Exact styling details of favorite wallpaper cards
- Empty state text and icons
- Collection badge precise position and style
- "All favorites" option position in sidebar
- Whether to add ImagePreview integration on favorites page
- Whether to support remove/delete from favorites on the favorites page
- Card hover effects and animations

### Deferred Ideas (OUT OF SCOPE)
None explicitly deferred. Future milestone features (search, sort, batch operations) are out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BROW-01 | User can access favorites page from main navigation | Route `/favorites` and nav item already exist in Phase 19. KeepAlive caching needs adding (D-11). |
| BROW-02 | User can view all wallpapers in a selected collection | `filteredFavorites` computed exists; FavoriteWallpaperCard.vue provides proper card display with thumbnail, info, actions (D-01, D-02). |
| BROW-03 | User can filter wallpapers by collection | Sidebar selection already works. Need "all favorites" filter mode (D-03). `useFavorites().getByCollection()` available for per-collection filtering. |
| BROW-04 | User can see which collection(s) a wallpaper belongs to | `useFavorites().getCollectionsForWallpaper()` returns collection names. Badge on card + tooltip on hover (D-05). |
| BROW-05 | User can download favorited wallpapers from the favorites page | Reuse `useDownload().addTask()` + `startDownload()` flow. Download button on card bottom bar (D-07, D-08). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wallpaper grid display | Browser / Client | -- | Pure Vue component rendering FavoriteItem data |
| Collection filtering | Browser / Client | -- | Computed property filtering `favorites` array by `collectionId` |
| Collection badge data | Browser / Client | API / Backend | Badge reads from `useFavorites` (client cache); data originates from electron-store via service layer |
| Download initiation | Browser / Client | API / Backend | UI triggers `useDownload().addTask()`; actual download runs in Electron main process |
| Preview display | Browser / Client | -- | ImagePreview component with navigation within favorites list |
| KeepAlive caching | Browser / Client | -- | Main.vue router-view configuration |
| Empty state display | Browser / Client | -- | Conditional rendering in FavoritesPage template |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.5.32 | UI framework | Project standard, Composition API with `<script setup>` |
| TypeScript | 6.0.0 | Type safety | Project standard, all `.vue` files use `<script setup lang="ts">` |
| Pinia | 3.0.4 | State management | Used by download store; favorites uses own composables pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Font Awesome | (existing) | Icons | Card actions (fa-download, fa-heart, fa-repeat-alt), badges, empty states |
| list.css | (existing) | Card styling | `.thumb`, `.thumb-info` classes for wallpaper cards |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New FavoriteWallpaperCard.vue | Reuse WallpaperList.vue | WallpaperList couples online pagination, search, multi-select; favorites needs different interaction model. Decision D-01 locks this. |
| Inline card CSS in scoped styles | Import list.css | Importing list.css works (WallpaperList does this) but the favorites card has different structure (no sections, no pages). Scoped styles with class name reuse is cleaner. |

**Installation:**
No new packages required. All dependencies are already installed.

## Architecture Patterns

### System Architecture Diagram

```
FavoritesPage.vue
    |
    +---> CollectionSidebar.vue (existing, emit 'select')
    |         |
    |         +---> CollectionItem.vue (existing)
    |         +---> "All Favorites" option (new)
    |
    +---> [Empty States] (conditional rendering)
    |         |
    |         +---> No collection selected
    |         +---> Empty collection
    |         +---> All favorites empty
    |
    +---> favorites-grid (CSS grid)
              |
              +---> FavoriteWallpaperCard.vue (NEW, one per FavoriteItem)
                        |
                        +---> Collection badge (heart + count, tooltip)
                        +---> Thumbnail image (lazy loaded)
                        +---> Bottom info bar (resolution + actions)
                        |       +---> Download button -> useDownload().addTask()
                        |       +---> Set wallpaper button -> useWallpaperSetter()
                        +---> Click -> ImagePreview (optional, at discretion)

useFavorites() -----> provides: favorites, filteredFavorites, getCollectionsForWallpaper()
useDownload()  -----> provides: addTask(), startDownload()
useWallpaperSetter() -> provides: setWallpaper()
```

### Recommended Project Structure
```
src/
├── views/
│   └── FavoritesPage.vue           # MODIFY: upgrade grid, add preview/download, "all" filter
├── components/
│   └── favorites/
│       ├── CollectionSidebar.vue    # MODIFY: add "all favorites" option
│       ├── CollectionItem.vue       # EXISTING (no change)
│       ├── FavoriteWallpaperCard.vue # NEW: wallpaper card for favorites page
│       ├── CreateCollectionModal.vue # EXISTING (no change)
│       ├── RenameCollectionModal.vue # EXISTING (no change)
│       └── CollectionDropdown.vue   # EXISTING (no change)
├── Main.vue                         # MODIFY: add 'FavoritesPage' to KeepAlive include
```

### Pattern 1: Wallpaper Card with Collection Badge
**What:** A card component that displays a favorited wallpaper with thumbnail, collection badge, and action buttons.
**When to use:** Every favorited wallpaper item in the grid.
**Example:**
```vue
<!-- FavoriteWallpaperCard.vue - following .thumb pattern from list.css -->
<figure class="thumb" style="width:300px;height:200px">
  <!-- Collection badge -->
  <div class="favorite-badge" :title="collectionNames">
    <i class="fas fa-heart" />
    <span v-if="collectionCount > 1" class="badge-count">{{ collectionCount }}</span>
  </div>
  <!-- Thumbnail -->
  <a class="thumb-img-link" @click.prevent="emit('preview', wallpaperData)">
    <img :src="wallpaperData.thumbs?.small || wallpaperData.path" :alt="wallpaperId" />
  </a>
  <!-- Bottom info bar -->
  <figcaption class="thumb-info">
    <span class="wall-res">{{ formatResolution(wallpaperData.resolution) }}</span>
    <a class="thumb-tags-toggle tagged" title="下载" @click="emit('download', wallpaperData)">
      <i class="fas fa-fw fa-download" />
    </a>
  </figcaption>
</figure>
```

### Pattern 2: "All Favorites" Filter Mode
**What:** A special filter mode that shows wallpapers from all collections, with deduplication (a wallpaper can be in multiple collections).
**When to use:** When user selects "All Favorites" in sidebar.
**Example:**
```typescript
// In FavoritesPage.vue
const selectedCollectionId = ref<string | null>(null) // null = "all favorites"

const filteredFavorites = computed(() => {
  if (!selectedCollectionId.value) {
    // "All favorites" mode - deduplicate by wallpaperId
    const seen = new Set<string>()
    return favorites.value
      .slice() // copy before sort
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .filter(f => {
        if (seen.has(f.wallpaperId)) return false
        seen.add(f.wallpaperId)
        return true
      })
  }
  return favorites.value
    .filter(f => f.collectionId === selectedCollectionId.value)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
})
```

### Pattern 3: Download from Favorites Page
**What:** Initiate download using the existing composable flow.
**When to use:** User clicks download button on a favorite wallpaper card.
**Example:**
```typescript
// In FavoritesPage.vue - mirrors OnlineWallpaper.vue download flow
const handleDownload = async (wallpaperData: WallpaperItem): Promise<void> => {
  if (isDownloading(wallpaperData.id)) {
    showWarning('该壁纸已在下载队列中')
    return
  }
  let ext = '.jpg'
  const match = wallpaperData.path?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
  if (match) ext = match[0]
  const filename = `wallhaven-${wallpaperData.id}${ext}`
  const taskId = addTask({
    url: wallpaperData.path,
    filename,
    small: wallpaperData.thumbs?.small || '',
    resolution: wallpaperData.resolution,
    size: Number(wallpaperData.file_size) || 0,
    wallpaperId: wallpaperData.id
  })
  await startDownload(taskId)
  showSuccess('已添加到下载队列')
}
```

### Anti-Patterns to Avoid
- **Reusing WallpaperList.vue directly:** It couples online search (pagination, API, sections, multi-select). Decision D-01 explicitly forbids this.
- **Not deduplicating in "all favorites" mode:** A wallpaper can be in multiple collections; showing it once per collection in "all" view would be confusing.
- **Fetching collection names on every render:** `getCollectionsForWallpaper()` filters the in-memory array every call. For the badge, compute once per card and cache in the card's setup, not on every hover.
- **Forgetting KeepAlive:** Without caching, navigating away from favorites and back will reload all data and lose scroll position.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Download flow | Custom download logic | `useDownload().addTask()` + `startDownload()` | Handles queue, progress, pause/resume, error handling |
| Set wallpaper | Custom electronAPI call | `useWallpaperSetter().setWallpaper()` | Handles download-then-set flow, error cases |
| Collection membership query | Manual array filtering in template | `useFavorites().getCollectionsForWallpaper()` | Already implemented with cached collections |
| Alert/notification | Custom toast system | `useAlert().showSuccess/showError/showWarning()` | Unified alert system used throughout app |
| File size/resolution display | Custom formatting | `formatResolution()` / `formatFileSize()` from `@/utils/helpers` | Already used in WallpaperList |

**Key insight:** This phase is primarily a presentation layer build. All business logic (favorites CRUD, collection management, download, persistence) is complete from Phases 16-20. The work is wiring UI components to existing composables.

## Common Pitfalls

### Pitfall 1: Missing WallpaperData Fields in Favorites
**What goes wrong:** `FavoriteItem.wallpaperData` stores a snapshot of `WallpaperItem` at add time. If the data format changes or fields are missing from older entries, card rendering breaks.
**Why it happens:** The `wallpaperData` is a frozen snapshot; `thumbs` might be undefined for very old entries or manually added items.
**How to avoid:** Always use fallback: `wallpaperData.thumbs?.small || wallpaperData.path`. The existing skeleton already does this for the simple image display.
**Warning signs:** Broken image icons in the grid; console errors about undefined properties.

### Pitfall 2: KeepAlive Component Name Mismatch
**What goes wrong:** KeepAlive `include` uses component `name`, which must match the component's explicit `name` option. If `FavoritesPage.vue` doesn't define a `name` option, KeepAlive won't cache it even if the string is in the include list.
**Why it happens:** Vue 3 `<script setup>` components don't automatically infer a name from the filename. The `name` must be explicitly set.
**How to avoid:** Either (1) add `defineOptions({ name: 'FavoritesPage' })` inside `<script setup>`, or (2) use a separate `<script>` block with `export default { name: 'FavoritesPage' }`. The existing cached components (`OnlineWallpaper`, `LocalWallpaper`, `DownloadWallpaper`) likely already handle this.
**Warning signs:** Page reloads data on every navigation; scroll position resets.

### Pitfall 3: Duplicate Wallpapers in "All Favorites" View
**What goes wrong:** Since `FavoriteItem` is a per-collection entry (wallpaperId + collectionId), a wallpaper in 3 collections appears 3 times in "all" view.
**Why it happens:** `favorites` is a flat list of `FavoriteItem` records, not unique wallpapers. The current `filteredFavorites` only filters by `collectionId`, so "all" without deduplication shows duplicates.
**How to avoid:** In "all" mode, deduplicate by `wallpaperId` using a `Set`, keeping only the first (or most recent) entry per wallpaper.
**Warning signs:** Same wallpaper appears multiple times in the grid.

### Pitfall 4: ImagePreview Navigation from Favorites
**What goes wrong:** ImagePreview expects a `wallpaperList: WallpaperItem[]` and `currentIndex` for prev/next navigation. If the favorites page passes the filtered list but doesn't update it when the filter changes while preview is open, navigation shows stale data.
**Why it happens:** The filtered list is a computed property; if the user changes collection while preview is open, the list changes but the preview component still references the old list.
**How to avoid:** Either close preview on filter change, or pass a snapshot of the current list to ImagePreview rather than the reactive computed.
**Warning signs:** Navigation in preview skips items or shows wrong wallpapers after filter change.

### Pitfall 5: Sidebar "All Favorites" Count Calculation
**What goes wrong:** Showing count next to "All Favorites" as `favorites.length` overcounts (includes duplicates across collections). Showing unique count requires deduplication on every render.
**Why it happens:** `favorites` array has one entry per (wallpaperId, collectionId) pair.
**How to avoid:** Compute unique count: `new Set(favorites.value.map(f => f.wallpaperId)).size`. Use a computed property so it only recalculates when favorites change.
**Warning signs:** Count doesn't match number of visible cards in "all" view.

## Code Examples

### FavoriteWallpaperCard.vue Props and Events
```typescript
// Source: Verified from existing codebase patterns (WallpaperList.vue, ImagePreview.vue)
interface Props {
  favorite: FavoriteItem
  collectionNames: string[]  // pre-computed list of collection names this wallpaper belongs to
}

const emit = defineEmits<{
  'preview': [wallpaperData: WallpaperItem]
  'download': [wallpaperData: WallpaperItem]
  'set-bg': [wallpaperData: WallpaperItem]
}>()
```

### Adding "All Favorites" to CollectionSidebar
```vue
<!-- Source: Verified from existing CollectionSidebar.vue structure -->
<div class="collection-list">
  <!-- "All Favorites" option at top -->
  <div
    class="collection-item"
    :class="{ active: !selectedCollectionId }"
    @click="emit('select', null)"
  >
    <div class="collection-icon">
      <i class="fas fa-heart" />
    </div>
    <div class="collection-info">
      <span class="collection-name">全部收藏</span>
      <span class="collection-count">{{ uniqueWallpaperCount }} 张</span>
    </div>
  </div>
  <!-- Existing collection items -->
  <CollectionItem
    v-for="collection in collections"
    :key="collection.id"
    :collection="collection"
    :count="getCollectionCount(collection.id)"
    :is-active="selectedId === collection.id"
    @select="handleSelect"
    @rename="handleRename"
    @delete="handleDelete"
  />
</div>
```

### KeepAlive Configuration in Main.vue
```vue
<!-- Source: Verified from Main.vue line 71 -->
<!-- Current: -->
<KeepAlive :include="['OnlineWallpaper', 'LocalWallpaper', 'DownloadWallpaper']">
<!-- After Phase 21: -->
<KeepAlive :include="['OnlineWallpaper', 'LocalWallpaper', 'DownloadWallpaper', 'FavoritesPage']">
```

### Download Integration Pattern (from OnlineWallpaper.vue)
```typescript
// Source: VERIFIED from OnlineWallpaper.vue lines 430-453
const addToDownloadQueue = async (imgItem: WallpaperItem): Promise<void> => {
  if (isDownloading(imgItem.id)) {
    throw new Error('该壁纸已在下载队列中')
  }
  let ext = '.jpg'
  if (imgItem.path) {
    const match = imgItem.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    if (match) ext = match[0]
  }
  const filename = `wallhaven-${imgItem.id}${ext}`
  const taskId = addTask({
    url: imgItem.path,
    filename,
    small: imgItem.thumbs.small,
    resolution: imgItem.resolution,
    size: Number(imgItem.file_size) || 0,
    wallpaperId: imgItem.id
  })
  await startDownload(taskId)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple `favorite-item` divs with img tags | Full wallpaper cards with actions, badges | Phase 21 | Proper browsing experience with download/preview |
| No "all favorites" view | "All Favorites" with deduplication | Phase 21 | Users can browse all favorited wallpapers without picking a collection |
| FavoritesPage not cached | KeepAlive caching | Phase 21 | No data reload on page switch |

**Deprecated/outdated:**
- The current `favorite-item` CSS class and simple `<img>` rendering in FavoritesPage will be replaced by `FavoriteWallpaperCard.vue` using the `.thumb` pattern.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `FavoritesPage.vue` already has or can accept `defineOptions({ name: 'FavoritesPage' })` for KeepAlive | KeepAlive | If the component name doesn't match, caching silently fails |
| A2 | `useWallpaperSetter` composable exists and works for set-as-wallpaper from favorites context | Download | If it requires online-specific state, set-bg won't work from favorites |
| A3 | `FavoriteItem.wallpaperData` always contains `thumbs.small` or `path` for thumbnail display | Card | If old entries lack thumbs, images break (mitigated by fallback pattern) |
| A4 | CollectionSidebar emit signature can be extended to emit `null` for "all favorites" selection | Filtering | If sidebar doesn't support null emit, need to change its interface |

**If this table is empty:** All claims in this research were verified or cited -- no user confirmation needed.

## Open Questions

1. **Should the favorites page support wallpaper removal from collection?**
   - What we know: Phase 20 implemented removal via CollectionDropdown. CONTEXT.md puts this at Claude's discretion.
   - What's unclear: Whether adding a remove button on the favorites page card is desired, or if users should only manage via the online page.
   - Recommendation: Implement a small remove icon on the card (visible on hover) that removes from the currently selected collection. This aligns with the browsing workflow -- user sees a wallpaper in a collection and wants to remove it without going to the online page.

2. **Should ImagePreview be integrated on the favorites page?**
   - What we know: CONTEXT.md puts this at Claude's discretion. The infrastructure exists (ImagePreview component, navigation props).
   - What's unclear: Whether preview navigation should work across the filtered favorites list.
   - Recommendation: Yes, integrate ImagePreview. It is a natural user expectation when clicking a wallpaper. Pass `filteredFavorites.map(f => f.wallpaperData)` as the wallpaper list.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified -- all changes are code/config-only within the existing Electron + Vue project)

## Validation Architecture

> nyquist_validation is explicitly set to `false` in `.planning/config.json`. Section skipped.

## Security Domain

> No authentication, session management, access control, or cryptography concerns for this phase. All operations are local-only within the Electron app. Section skipped.

## Sources

### Primary (HIGH confidence)
- Codebase review: `src/views/FavoritesPage.vue` -- current skeleton structure and CSS
- Codebase review: `src/components/WallpaperList.vue` -- card pattern, props, events, CSS imports
- Codebase review: `src/composables/favorites/useFavorites.ts` -- available methods (favorites, favoriteIds, getCollectionsForWallpaper, getByCollection)
- Codebase review: `src/composables/download/useDownload.ts` -- addTask/startDownload API
- Codebase review: `src/Main.vue` -- KeepAlive include list
- Codebase review: `src/router/index.ts` -- route definition for `/favorites`
- Codebase review: `src/types/favorite.ts` -- FavoriteItem, Collection interfaces
- Codebase review: `src/components/favorites/CollectionSidebar.vue` -- current sidebar structure and events

### Secondary (MEDIUM confidence)
- Codebase review: `src/views/OnlineWallpaper.vue` -- download/preview/set-bg wiring patterns
- Codebase review: `src/components/ImagePreview.vue` -- preview component props and events
- Codebase review: `src/static/css/list.css` -- `.thumb` card styling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, verified by codebase read
- Architecture: HIGH - patterns established by existing WallpaperList and OnlineWallpaper; this phase reuses them
- Pitfalls: HIGH - all pitfalls identified from direct code analysis of existing patterns

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (stable -- no external dependencies, patterns are project-internal)
