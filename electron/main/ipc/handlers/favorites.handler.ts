 
/**
 * Favorites & Collections IPC Handlers
 *
 * 11 dedicated IPC channels for favorites and collections operations on SQLite.
 * Replaces the generic store-get/store-set IPC path for favorites data.
 */

import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import { getDatabase, withTransaction } from '../../database'
import { logHandler } from './base'

export function registerFavoritesHandlers(): void {
  // ===========================================================================
  // Collections
  // ===========================================================================

  /**
   * Get all collections, ordered by sort_order then creation time.
   * If no collections exist, auto-creates a default collection (D-07).
   */
  ipcMain.handle('favorites-get-collections', () => {
    try {
      const db = getDatabase()
      const rows = db
        .prepare(
          `SELECT id, name, is_default, sort_order, created_at, updated_at
           FROM collections
           ORDER BY sort_order ASC, created_at ASC`,
        )
        .all()

      // Auto-create default collection when collections table is empty (D-07)
      if (rows.length === 0) {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        db.prepare(
          'INSERT INTO collections (id, name, is_default, sort_order, created_at, updated_at) VALUES (?, ?, 1, 0, ?, ?)',
        ).run(id, '收藏', now, now)

        return {
          success: true,
          data: [
            {
              id,
              name: '收藏',
              isDefault: true,
              sortOrder: 0,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }
      }

      const mappedCollections = rows.map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: r.id,
          name: r.name,
          isDefault: r.is_default === 1,
          sortOrder: r.sort_order,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }
      })
      return { success: true, data: mappedCollections }
    } catch (error: any) {
      logHandler('favorites-get-collections', `Error: ${error.message}`, 'error')
      return {
        success: false,
        error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
      }
    }
  })

  /**
   * Create a new collection with the given name.
   * Validates name uniqueness before insert.
   */
  ipcMain.handle(
    'favorites-create-collection',
    (_event, params: { name: string }) => {
      try {
        const db = getDatabase()
        const { name } = params

        // Check name not already taken
        const existing = db
          .prepare('SELECT 1 as "exists" FROM collections WHERE name = ? LIMIT 1')
          .get(name)
        if (existing) {
          return {
            success: false,
            error: { code: 'COLLECTION_NAME_EXISTS', message: '收藏夹名称已存在' },
          }
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        db.prepare(
          'INSERT INTO collections (id, name, is_default, sort_order, created_at, updated_at) VALUES (?, ?, 0, 0, ?, ?)',
        ).run(id, name, now, now)

        return {
          success: true,
          data: {
            id,
            name,
            isDefault: false,
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
          },
        }
      } catch (error: any) {
        logHandler('favorites-create-collection', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Rename a collection.
   * Validates collection exists and new name is not taken by another collection.
   */
  ipcMain.handle(
    'favorites-rename-collection',
    (_event, params: { id: string; name: string }) => {
      try {
        const db = getDatabase()
        const { id, name } = params

        // Check collection exists
        const collection = db
          .prepare('SELECT id FROM collections WHERE id = ? LIMIT 1')
          .get(id)
        if (!collection) {
          return {
            success: false,
            error: { code: 'COLLECTION_NOT_FOUND', message: '收藏夹不存在' },
          }
        }

        // Check new name not taken by another collection
        const nameExists = db
          .prepare(
            'SELECT 1 as "exists" FROM collections WHERE name = ? AND id != ? LIMIT 1',
          )
          .get(name, id)
        if (nameExists) {
          return {
            success: false,
            error: { code: 'COLLECTION_NAME_EXISTS', message: '收藏夹名称已存在' },
          }
        }

        const now = new Date().toISOString()
        db.prepare('UPDATE collections SET name = ?, updated_at = ? WHERE id = ?').run(
          name,
          now,
          id,
        )

        // Read back full row after update
        const updated = db
          .prepare('SELECT * FROM collections WHERE id = ?')
          .get(id)
        if (!updated) {
          return {
            success: false,
            error: { code: 'COLLECTION_NOT_FOUND', message: '收藏夹不存在' },
          }
        }
        const r = updated as Record<string, unknown>
        return {
          success: true,
          data: {
            id: r.id,
            name: r.name,
            isDefault: r.is_default === 1,
            sortOrder: r.sort_order,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          },
        }
      } catch (error: any) {
        logHandler('favorites-rename-collection', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Delete a collection and all its favorites via CASCADE.
   * Rejects deletion of the default collection.
   */
  ipcMain.handle(
    'favorites-delete-collection',
    (_event, params: { id: string }) => {
      try {
        const db = getDatabase()
        const { id } = params

        // Check collection exists and is not default
        const row = db
          .prepare(
            'SELECT is_default FROM collections WHERE id = ? LIMIT 1',
          )
          .get(id)
        if (!row) {
          return {
            success: false,
            error: { code: 'COLLECTION_NOT_FOUND', message: '收藏夹不存在' },
          }
        }
        const r = row as Record<string, unknown>
        if (r.is_default === 1) {
          return {
            success: false,
            error: {
              code: 'COLLECTION_IS_DEFAULT',
              message: '无法删除默认收藏夹',
            },
          }
        }

        // CASCADE will delete related favorites rows
        db.prepare('DELETE FROM collections WHERE id = ?').run(id)
        return { success: true }
      } catch (error: any) {
        logHandler('favorites-delete-collection', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Set a collection as the default collection.
   * Uses withTransaction to atomically unset the old default and set the new one.
   */
  ipcMain.handle(
    'favorites-set-default-collection',
    (_event, params: { id: string }) => {
      try {
        const db = getDatabase()
        const { id } = params

        // Check collection exists
        const row = db
          .prepare('SELECT id FROM collections WHERE id = ? LIMIT 1')
          .get(id)
        if (!row) {
          return {
            success: false,
            error: { code: 'COLLECTION_NOT_FOUND', message: '收藏夹不存在' },
          }
        }

        const now = new Date().toISOString()
        withTransaction(() => {
          db.prepare(
            'UPDATE collections SET is_default = 0, updated_at = ? WHERE is_default = 1',
          ).run(now)
          db.prepare(
            'UPDATE collections SET is_default = 1, updated_at = ? WHERE id = ?',
          ).run(now, id)
        })

        // Read back updated collection
        const updated = db
          .prepare('SELECT * FROM collections WHERE id = ?')
          .get(id)
        if (!updated) {
          return {
            success: false,
            error: { code: 'COLLECTION_NOT_FOUND', message: '收藏夹不存在' },
          }
        }
        const r = updated as Record<string, unknown>
        return {
          success: true,
          data: {
            id: r.id,
            name: r.name,
            isDefault: true,
            sortOrder: r.sort_order,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          },
        }
      } catch (error: any) {
        logHandler('favorites-set-default-collection', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  // ===========================================================================
  // Favorites
  // ===========================================================================

  /**
   * Get favorites, optionally filtered by collection ID.
   * Returns all favorites if no collectionId provided.
   */
  ipcMain.handle(
    'favorites-get-by-collection',
    (_event, params: { collectionId?: string }) => {
      try {
        const db = getDatabase()
        const { collectionId } = params

        let rows: Record<string, unknown>[]
        if (collectionId) {
          rows = db
            .prepare(
              'SELECT collection_id, wallpaper_id, wallpaper_data, added_at FROM favorites WHERE collection_id = ? ORDER BY added_at DESC',
            )
            .all(collectionId) as Record<string, unknown>[]
        } else {
          rows = db
            .prepare(
              'SELECT collection_id, wallpaper_id, wallpaper_data, added_at FROM favorites ORDER BY added_at DESC',
            )
            .all() as Record<string, unknown>[]
        }

        const mappedFavorites = rows.map((row) => ({
          collectionId: row.collection_id,
          wallpaperId: row.wallpaper_id,
          wallpaperData: JSON.parse(row.wallpaper_data as string),
          addedAt: row.added_at,
        }))
        return { success: true, data: mappedFavorites }
      } catch (error: any) {
        logHandler('favorites-get-by-collection', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Add a wallpaper to a collection.
   * Validates collection exists and prevents duplicate entries.
   */
  ipcMain.handle(
    'favorites-add',
    (
      _event,
      params: {
        wallpaperId: string
        collectionId: string
        wallpaperData: any
      },
    ) => {
      try {
        const db = getDatabase()
        const { wallpaperId, collectionId, wallpaperData } = params

        // Check collection exists
        const collection = db
          .prepare('SELECT 1 as id FROM collections WHERE id = ? LIMIT 1')
          .get(collectionId)
        if (!collection) {
          return {
            success: false,
            error: { code: 'COLLECTION_NOT_FOUND', message: '收藏夹不存在' },
          }
        }

        // Check not already in collection
        const existing = db
          .prepare(
            'SELECT 1 as "exists" FROM favorites WHERE collection_id = ? AND wallpaper_id = ? LIMIT 1',
          )
          .get(collectionId, wallpaperId)
        if (existing) {
          return {
            success: false,
            error: { code: 'FAVORITE_ALREADY_EXISTS', message: '该壁纸已在收藏夹中' },
          }
        }

        const addedAt = new Date().toISOString()
        db.prepare(
          'INSERT INTO favorites (collection_id, wallpaper_id, wallpaper_data, added_at) VALUES (?, ?, ?, ?)',
        ).run(collectionId, wallpaperId, JSON.stringify(wallpaperData), addedAt)

        return {
          success: true,
          data: {
            collectionId,
            wallpaperId,
            wallpaperData,
            addedAt,
          },
        }
      } catch (error: any) {
        logHandler('favorites-add', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Remove a wallpaper from a collection.
   * Returns FAVORITE_NOT_FOUND if the favorite entry does not exist.
   */
  ipcMain.handle(
    'favorites-remove',
    (_event, params: { wallpaperId: string; collectionId: string }) => {
      try {
        const db = getDatabase()
        const { wallpaperId, collectionId } = params

        const result = db
          .prepare(
            'DELETE FROM favorites WHERE wallpaper_id = ? AND collection_id = ?',
          )
          .run(wallpaperId, collectionId)

        if (result.changes === 0) {
          return {
            success: false,
            error: { code: 'FAVORITE_NOT_FOUND', message: '收藏项不存在' },
          }
        }
        return { success: true }
      } catch (error: any) {
        logHandler('favorites-remove', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Move a favorite from one collection to another.
   * Validates collection existence, source favorite existence, and checks
   * the target collection does not already contain the wallpaper.
   */
  ipcMain.handle(
    'favorites-move',
    (
      _event,
      params: {
        wallpaperId: string
        fromCollectionId: string
        toCollectionId: string
      },
    ) => {
      try {
        const db = getDatabase()
        const { wallpaperId, fromCollectionId, toCollectionId } = params

        // Check target collection exists
        const targetCollection = db
          .prepare('SELECT 1 as id FROM collections WHERE id = ? LIMIT 1')
          .get(toCollectionId)
        if (!targetCollection) {
          return {
            success: false,
            error: { code: 'COLLECTION_NOT_FOUND', message: '目标收藏夹不存在' },
          }
        }

        // Check source favorite exists and get wallpaper_data for return value
        const sourceFavorite = db
          .prepare(
            'SELECT wallpaper_data FROM favorites WHERE wallpaper_id = ? AND collection_id = ? LIMIT 1',
          )
          .get(wallpaperId, fromCollectionId)
        if (!sourceFavorite) {
          return {
            success: false,
            error: { code: 'FAVORITE_NOT_FOUND', message: '收藏项不存在' },
          }
        }

        // Check not already in target collection
        const alreadyExists = db
          .prepare(
            'SELECT 1 as "exists" FROM favorites WHERE wallpaper_id = ? AND collection_id = ? LIMIT 1',
          )
          .get(wallpaperId, toCollectionId)
        if (alreadyExists) {
          return {
            success: false,
            error: { code: 'FAVORITE_ALREADY_EXISTS', message: '该壁纸已在目标收藏夹中' },
          }
        }

        const now = new Date().toISOString()
        db.prepare(
          'UPDATE favorites SET collection_id = ?, added_at = ? WHERE wallpaper_id = ? AND collection_id = ?',
        ).run(toCollectionId, now, wallpaperId, fromCollectionId)

        const sf = sourceFavorite as Record<string, unknown>
        return {
          success: true,
          data: {
            collectionId: toCollectionId,
            wallpaperId,
            wallpaperData: JSON.parse(sf.wallpaper_data as string),
            addedAt: now,
          },
        }
      } catch (error: any) {
        logHandler('favorites-move', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Check if a wallpaper exists in any collection (boolean).
   * Uses SELECT 1 ... LIMIT 1 for O(1) existence check (D-05).
   */
  ipcMain.handle(
    'favorites-is-favorite',
    (_event, params: { wallpaperId: string }) => {
      try {
        const db = getDatabase()
        const { wallpaperId } = params

        const row = db
          .prepare(
            'SELECT 1 as "exists" FROM favorites WHERE wallpaper_id = ? LIMIT 1',
          )
          .get(wallpaperId)
        return { success: true, data: !!row }
      } catch (error: any) {
        logHandler('favorites-is-favorite', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * Get all collections that contain a specific wallpaper.
   * Uses INNER JOIN on collections and favorites tables.
   */
  ipcMain.handle(
    'favorites-get-collections-for-wallpaper',
    (_event, params: { wallpaperId: string }) => {
      try {
        const db = getDatabase()
        const { wallpaperId } = params

        const rows = db
          .prepare(
            `SELECT c.id, c.name, c.is_default, c.sort_order, c.created_at, c.updated_at
             FROM collections c
             INNER JOIN favorites f ON f.collection_id = c.id
             WHERE f.wallpaper_id = ?
             ORDER BY c.sort_order ASC, c.created_at ASC`,
          )
          .all(wallpaperId) as Record<string, unknown>[]

        const mappedCollections = rows.map((row) => ({
          id: row.id,
          name: row.name,
          isDefault: row.is_default === 1,
          sortOrder: row.sort_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
        return { success: true, data: mappedCollections }
      } catch (error: any) {
        logHandler(
          'favorites-get-collections-for-wallpaper',
          `Error: ${error.message}`,
          'error',
        )
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * 分页获取收藏
   * - 传入 collectionId 时按收藏夹过滤
   * - 不传时返回全部收藏（去重）
   */
  ipcMain.handle(
    'favorites-get-paginated',
    (_event, params: { collectionId?: string; limit: number; offset: number }) => {
      try {
        const db = getDatabase()
        const { collectionId, limit, offset } = params

        let rows: Record<string, unknown>[]
        let countRow: Record<string, unknown>

        if (collectionId) {
          // 按收藏夹查询
          rows = db
            .prepare(
              `SELECT collection_id, wallpaper_id, wallpaper_data, added_at
               FROM favorites
               WHERE collection_id = ?
               ORDER BY added_at DESC
               LIMIT ? OFFSET ?`,
            )
            .all(collectionId, limit, offset) as Record<string, unknown>[]

          countRow = db
            .prepare('SELECT COUNT(*) as total FROM favorites WHERE collection_id = ?')
            .get(collectionId) as Record<string, unknown>
        } else {
          // 全部收藏：去重查询
          rows = db
            .prepare(
              `SELECT wallpaper_id, wallpaper_data, MAX(added_at) as added_at
               FROM favorites
               GROUP BY wallpaper_id
               ORDER BY added_at DESC
               LIMIT ? OFFSET ?`,
            )
            .all(limit, offset) as Record<string, unknown>[]

          countRow = db
            .prepare('SELECT COUNT(DISTINCT wallpaper_id) as total FROM favorites')
            .get() as Record<string, unknown>
        }

        const total = (countRow?.total as number) ?? 0
        const hasMore = offset + rows.length < total

        const items = rows.map((row) => ({
          collectionId: row.collection_id ?? null,
          wallpaperId: row.wallpaper_id,
          wallpaperData: JSON.parse(row.wallpaper_data as string),
          addedAt: row.added_at,
        }))

        return { success: true, data: { items, total, hasMore } }
      } catch (error: any) {
        logHandler('favorites-get-paginated', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )

  /**
   * 获取所有收藏夹计数
   * - _total: 全部收藏的唯一壁纸数（去重）
   * - [collectionId]: 各收藏夹的壁纸数
   */
  ipcMain.handle('favorites-get-counts', () => {
    try {
      const db = getDatabase()

      // 全部收藏去重计数
      const totalRow = db
        .prepare('SELECT COUNT(DISTINCT wallpaper_id) as total FROM favorites')
        .get() as Record<string, unknown> | undefined

      // 各收藏夹计数
      const collectionRows = db
        .prepare(
          `SELECT collection_id, COUNT(*) as count
           FROM favorites
           GROUP BY collection_id`,
        )
        .all() as Record<string, unknown>[]

      // 构建结果
      const result: Record<string, number> = {
        _total: (totalRow?.total as number) ?? 0,
      }

      for (const row of collectionRows) {
        result[row.collection_id as string] = row.count as number
      }

      return { success: true, data: result }
    } catch (error: any) {
      logHandler('favorites-get-counts', `Error: ${error.message}`, 'error')
      return {
        success: false,
        error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
      }
    }
  })

  /**
   * 批量获取收藏状态映射
   * - 0: 未收藏
   * - 1: 收藏到默认收藏夹（优先）
   * - 2: 仅收藏到其他收藏夹
   */
  ipcMain.handle(
    'favorites-get-status-map',
    (_event, params: { wallpaperIds: string[] }) => {
      try {
        const db = getDatabase()
        const { wallpaperIds } = params

        // 空数组处理
        if (wallpaperIds.length === 0) {
          return { success: true, data: {} }
        }

        // 构建参数占位符
        const placeholders = wallpaperIds.map(() => '?').join(',')

        // 查询收藏状态
        // MAX(CASE WHEN c.is_default = 1 THEN 1 ELSE 2 END) 确保默认收藏夹优先
        const rows = db
          .prepare(
            `SELECT f.wallpaper_id,
               MAX(CASE WHEN c.is_default = 1 THEN 1 ELSE 2 END) as status
             FROM favorites f
             INNER JOIN collections c ON f.collection_id = c.id
             WHERE f.wallpaper_id IN (${placeholders})
             GROUP BY f.wallpaper_id`,
          )
          .all(...wallpaperIds) as Record<string, unknown>[]

        // 构建结果映射，初始化所有 ID 为未收藏
        const statusMap: Record<string, 0 | 1 | 2> = {}
        for (const id of wallpaperIds) {
          statusMap[id] = 0
        }

        // 更新收藏状态
        for (const row of rows) {
          statusMap[row.wallpaper_id as string] = row.status as 1 | 2
        }

        return { success: true, data: statusMap }
      } catch (error: any) {
        logHandler('favorites-get-status-map', `Error: ${error.message}`, 'error')
        return {
          success: false,
          error: { code: 'FAVORITES_STORAGE_ERROR', message: error.message },
        }
      }
    },
  )
}
