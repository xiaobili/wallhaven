/**
 * Heart state types for three-state favorite indicator.
 *
 * - 'default': wallpaper is in the default collection → red (#ff6b6b)
 * - 'non-default': wallpaper is in non-default collection(s) but NOT the default → blue (#5b8def)
 * - 'none': wallpaper is not in any collection → transparent (outline, hover only)
 */
export type HeartState = 'default' | 'non-default' | 'none'

/**
 * Compute heart visual state for a wallpaper based on collection membership.
 *
 * Priority:
 *   1. In default collection → 'default' (per D-04)
 *   2. Not in default, in other collection(s) → 'non-default' (per D-05)
 *   3. Not in any collection → 'none' (per D-06)
 *
 * Edge cases:
 *   - defaultCollectionId is null (no default set): treat as 'non-default'
 *     if wallpaper is in ANY collection, 'none' otherwise
 *   - Wallpaper in both default and other: 'default' takes priority per D-04
 *
 * @param wallpaperId - The wallpaper ID to check
 * @param defaultCollectionId - The default collection ID (null if none set)
 * @param collectionMap - Map of wallpaperId → collectionId[] from OnlineWallpaper
 * @returns HeartState for the given wallpaper
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
