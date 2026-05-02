<template>
  <main
    id="main"
    @click="emit('close-search-modal')"
  >
    <div
      id="thumbs"
      class="thumbs-container"
    >
      <section
        v-for="(sectionItem, i) in pageData.sections"
        :key="i"
        class="thumb-listing-page"
      >
        <header class="thumb-listing-page-header">
          <h2>
            Page <span class="thumb-listing-page-num">{{ i + 1 }}</span> / {{ pageData.totalPage }}
          </h2>
          <span
            class="select-all-trigger"
            @click.stop="toggleSelectAll(sectionItem.data, i)"
          >
            <span
              class="select-all-box"
              :class="{
                checked: getSelectState(sectionItem.data) === 'all',
                indeterminate: getSelectState(sectionItem.data) === 'some',
              }"
            >
              <i
                v-if="getSelectState(sectionItem.data) === 'all'"
                class="fas fa-check"
              />
              <i
                v-else-if="getSelectState(sectionItem.data) === 'some'"
                class="fas fa-minus"
              />
            </span>
            <span class="select-all-label">{{
              getSelectState(sectionItem.data) === 'all' ? '取消全选' : '全选'
            }}</span>
          </span>
          <a
            class="icon to-top"
            href="#top"
            title="Back to top"
            @click.prevent="scrollToTop"
          >
            <i class="far fa-lg fa-chevron-up" />
          </a>
        </header>
        <ul>
          <li
            v-for="liItem in sectionItem.data"
            :key="liItem.id"
          >
            <figure
              class="thumb"
              :class="[
                'thumb-' + liItem.id,
                'thumb-' + liItem.purity,
                'thumb-' + liItem.category,
                { selected: isSelected(liItem.id) },
              ]"
              :data-wallpaper-id="liItem.id"
              style="width: 300px; height: 200px"
              @click.ctrl.exact.prevent="toggleSelect(liItem.id)"
              @click.meta.exact.prevent="toggleSelect(liItem.id)"
            >
              <!-- 收藏状态指示器 -->
              <!-- <div
                v-if="isFavorite(liItem.id)"
                class="favorite-indicator"
                title="已收藏"
              >
                <i class="fas fa-heart" />
              </div> -->

              <!-- 选择框 -->
              <div
                class="thumb-checkbox"
                @click.stop.prevent="toggleSelect(liItem.id)"
              >
                <i
                  v-if="isSelected(liItem.id)"
                  class="fas fa-check check-icon"
                />
              </div>

              <!-- 收藏按钮 - 三态颜色 (per D-04, D-05, D-06) -->
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

              <a
                class="thumb-btn thumb-btn-fav jsAnchor overlay-anchor"
                title="设为壁纸"
                @click.stop="emit('set-bg', liItem)"
              >
                <i class="fas fa-fw fa-repeat-alt" />
              </a>
              <!-- 使用 IntersectionObserver 优化的懒加载 -->
              <img
                alt="loading"
                loading="lazy"
                class="lazyload loaded"
                :data-src="liItem.thumbs.small"
                :src="liItem.thumbs.small"
                decoding="async"
                fetchpriority="low"
              >
              <a
                class="preview"
                @click.stop="emit('preview', liItem)"
              />
              <div class="thumb-info">
                <span class="wall-res">{{ formatResolution(liItem.resolution) }}</span>
                <a class="jsAnchor overlay-anchor wall-favs">{{
                  formatFileSize(liItem.file_size)
                }}</a>
                <span
                  v-if="liItem.file_type === 'image/png'"
                  class="png"
                ><span>PNG</span></span>
                <a
                  class="jsAnchor thumb-tags-toggle tagged"
                  title="下载"
                  @click="emit('download-img', liItem)"
                >
                  <i class="fas fa-fw fa-download" />
                </a>
              </div>
            </figure>
          </li>
        </ul>
      </section>
    </div>
    <div class="main-bottom">
      <div
        v-show="loading"
        class="loading-span"
      >
        <i class="fas fa-spinner" />
      </div>
      <div
        v-show="error"
        class="error-span"
      >
        <i class="fas fa-times"> <br>网络异常，请点击右上角刷新按钮重试。</i>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { WallpaperItem, TotalPageData } from '@/types'
import { formatResolution, formatFileSize } from '@/utils/helpers'
import { getHeartState } from '@/utils/heart'
import type { HeartState } from '@/utils/heart'
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  pageData: TotalPageData
  loading: boolean
  error: boolean
  selectedIds?: string[] // 选中的壁纸ID列表
  favoriteIds?: Set<string> // 收藏的壁纸ID集合
  // New props for three-state heart (per D-01)
  wallpaperCollectionMap: Map<string, string[]>
  defaultCollectionId: string | null
}>()

const emit = defineEmits<{
  'set-bg': [item: WallpaperItem]
  preview: [item: WallpaperItem]
  'download-img': [item: WallpaperItem]
  'close-search-modal': []
  'select-wallpaper': [id: string] // 切换选择状态
  'select-all': [payload: { sectionIndex: number; ids: string[]; selected: boolean }]
  'toggle-favorite': [item: WallpaperItem, event: MouseEvent] // left click - quick add
  'show-favorite-dropdown': [item: WallpaperItem, event: MouseEvent] // right click - show dropdown
}>()

/**
 * 检查是否已选中
 */
const isSelected = (id: string): boolean => {
  return props.selectedIds?.includes(id) || false
}

/**
 * Compute heart visual state for a wallpaper.
 * Returns 'default' (red), 'non-default' (blue), or 'none' (transparent outline).
 * Uses the shared getHeartState pure function from @/utils/heart.
 */
const heartState = (id: string): HeartState => {
  return getHeartState(id, props.defaultCollectionId, props.wallpaperCollectionMap)
}

/**
 * 处理收藏按钮左键点击 - 快速添加/移除默认收藏夹
 */
const handleFavoriteLeftClick = (item: WallpaperItem, event: MouseEvent): void => {
  emit('toggle-favorite', item, event)
}

/**
 * 处理收藏按钮右键点击 - 显示收藏夹下拉菜单
 */
const handleFavoriteRightClick = (item: WallpaperItem, event: MouseEvent): void => {
  event.preventDefault()
  emit('show-favorite-dropdown', item, event)
}

/**
 * 切换选择状态
 */
const toggleSelect = (id: string): void => {
  emit('select-wallpaper', id)
}

type SelectState = 'none' | 'some' | 'all'

/**
 * Compute the selection state for a section's wallpapers:
 * 'none' = no wallpapers selected, 'all' = every wallpaper selected, 'some' = mixed
 */
const getSelectState = (sectionData: WallpaperItem[]): SelectState => {
  if (!props.selectedIds || props.selectedIds.length === 0) return 'none'
  const selectedCount = sectionData.filter((item) => props.selectedIds!.includes(item.id)).length
  if (selectedCount === 0) return 'none'
  if (selectedCount === sectionData.length) return 'all'
  return 'some'
}

/**
 * Toggle select-all for a section: if all are selected, deselect all; otherwise select all.
 * Emits to parent with section index, all wallpaper IDs, and the target selection state.
 */
const toggleSelectAll = (sectionData: WallpaperItem[], sectionIndex: number): void => {
  const state = getSelectState(sectionData)
  const selectAll = state !== 'all' // toggle: if all selected → deselect; otherwise → select
  const ids = sectionData.map((item) => item.id)
  emit('select-all', { sectionIndex, ids, selected: selectAll })
}

/**
 * 滚动到顶部
 */
const scrollToTop = (): void => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth', // 平滑滚动效果
  })
}

/**
 * 使用 IntersectionObserver 优化图片懒加载
 */
let observer: IntersectionObserver | null = null

onMounted(() => {
  // 创建 IntersectionObserver 实例
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            // 图片已经在视口中，浏览器会自动加载
            observer?.unobserve(img)
          }
        })
      },
      {
        rootMargin: '200px', // 提前200px开始加载
        threshold: 0.01,
      },
    )

    // 观察所有懒加载图片
    const images = document.querySelectorAll('img[loading="lazy"]')
    images.forEach((img) => observer?.observe(img))
  }
})

onUnmounted(() => {
  // 清理 Observer
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<style scoped>
@import url('@/static/css/list.css');

/* 选中状态样式 */
.thumb.selected {
  outline: 3px solid #667eea;
  outline-offset: -3px;
}

/* 选择框样式 - 默认隐藏，悬停或选中时显示 */
.thumb-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 150;
  transition: all 0.2s ease;
  opacity: 0;
  visibility: hidden;
}

/* 悬停时显示 */
.thumb:hover .thumb-checkbox {
  opacity: 0.7;
  visibility: visible;
}

.thumb-checkbox:hover {
  background: rgba(102, 126, 234, 0.7);
  border-color: white;
  transform: scale(1.1);
  opacity: 1;
}

/* 选中时始终显示 */
.thumb.selected .thumb-checkbox {
  background: #667eea;
  border-color: #667eea;
  opacity: 1;
  visibility: visible;
}

.check-icon {
  color: white;
  font-size: 14px;
  animation: checkPop 0.2s ease;
}

@keyframes checkPop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Select-all trigger in section headers */
.select-all-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  margin-left: 16px;
  user-select: none;
  -ms-flex-order: 15;
  order: 15;
}

.select-all-box {
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: white;
  font-size: 12px;
}

.select-all-trigger:hover .select-all-box {
  background: rgba(102, 126, 234, 0.7);
  border-color: white;
  transform: scale(1.1);
}

.select-all-box.checked {
  background: #667eea;
  border-color: #667eea;
}

.select-all-box.indeterminate {
  background: rgba(102, 126, 234, 0.5);
  border-color: #667eea;
}

.select-all-label {
  font-size: 13px;
  color: #ccc;
  white-space: nowrap;
}

.select-all-trigger:hover .select-all-label {
  color: white;
}

.main-bottom {
  height: 30px;
  text-align: center;
}

.loading-span {
  width: 30px;
  height: 30px;
  margin: 0 auto;
}

.error-span i {
  font-size: 18px !important;
}

.fa-spinner {
  animation: spin 0.8s infinite linear;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 收藏按钮样式 */
.thumb-favorite-btn {
  position: absolute;
  top: 8px;
  left: 40px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 150;
  transition: all 0.2s ease;
  opacity: 0;
  visibility: hidden;
  color: #fff;
}

.thumb:hover .thumb-favorite-btn {
  opacity: 0.7;
  visibility: visible;
}

.thumb-favorite-btn:hover {
  background: rgba(255, 107, 107, 0.7);
  border-color: #ff6b6b;
  transform: scale(1.1);
  opacity: 1;
}

.thumb-favorite-btn.is-favorite {
  background: #ff6b6b;
  border-color: #ff6b6b;
  opacity: 1;
  visibility: visible;
}

/* Blue heart state: in non-default collection(s) only */
.thumb-favorite-btn.is-favorite-in-other {
  background: #5b8def;
  border-color: #5b8def;
  opacity: 1;
  visibility: visible;
}

/* Blue hover — same transform/opacity as red, but blue color.
   Must override .thumb-favorite-btn:hover (specificity 0,1,1) with
   (0,2,1) to prevent red flash on hover per RESEARCH.md Pitfall 3. */
.thumb-favorite-btn.is-favorite-in-other:hover {
  background: rgba(91, 141, 239, 0.7);
  border-color: #5b8def;
  transform: scale(1.1);
  opacity: 1;
}

/* 收藏指示器样式 */
.favorite-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 8px;
  height: 8px;
  background: #ff6b6b;
  border-radius: 50%;
  z-index: 160;
  pointer-events: none;
}
</style>
