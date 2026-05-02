# Plan 39-01 Summary: FavoriteWallpaperCard badge interaction

**Phase:** 39-favorites-heart-status-and-unfavorite
**Plan:** 01
**Wave:** 1

## Changes Made

### Modified: `src/components/favorites/FavoriteWallpaperCard.vue`

1. **Added `unfavorite` to `defineEmits`** (line 46) — New emit type `unfavorite: [wallpaperId: string]`
2. **Made badge clickable** (line 4) — Added `@click.stop="emit('unfavorite', props.favorite.wallpaperId)"` to `.favorite-badge`
3. **Changed hover tooltip** (line 4) — `:title` now shows "点击取消收藏" instead of collection names
4. **CSS: pointer cursor** (line 163) — Changed `cursor: default` to `cursor: pointer` on `.favorite-badge`
5. **CSS: hover effect** (lines 166-168) — Added `.favorite-badge:hover` with `opacity: 0.8`

## Verification

- ✅ `unfavorite` in defineEmits + template: 2 matches
- ✅ `@click.stop` on `.favorite-badge`: present
- ✅ Badge title shows "点击取消收藏": present
- ✅ CSS cursor: pointer on badge: present
- ✅ `.favorite-badge:hover` rule: present
- ✅ `cursor: default` removed from `.favorite-badge`
- ✅ TypeScript type check: pass (no errors)

## Acceptance Criteria Met

| Criteria | Status |
|----------|--------|
| Badge emits `unfavorite` with wallpaperId on click | ✅ |
| Badge does NOT trigger preview overlay (stopPropagation) | ✅ |
| Hover shows "点击取消收藏" | ✅ |
| Cursor changes to pointer on badge hover | ✅ |
| All existing card functionality unchanged | ✅ |

## Threat Model Coverage

- T-39-01 (Spoofing): Accepted — parent validates operation
- T-39-02 (Tampering): Mitigated via `@click.stop`
