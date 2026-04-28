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
        <header
          v-if="i !== 0"
          class="thumb-listing-page-header"
        >
          <h2>Page <span class="thumb-listing-page-num">{{ i + 1 }}</span> / {{ pageData.totalPage }}</h2>
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
            v-for="(liItem) in sectionItem.data"
            :key="liItem.id"
          >
            <figure
              class="thumb"
              :class="['thumb-' + (liItem.id), 'thumb-' + (liItem.purity), 'thumb-' + (liItem.category), { 'selected': isSelected(liItem.id) }]"
              :data-wallpaper-id="liItem.id"
              style="width:300px;height:200px"
              @click.ctrl.exact.prevent="toggleSelect(liItem.id)"
              @click.meta.exact.prevent="toggleSelect(liItem.id)"
            >
              <!-- 收藏状态指示器 -->
              <div
                v-if="isFavorite(liItem.id)"
                class="favorite-indicator"
                title="已收藏"
              >
                <i class="fas fa-heart" />
              </div>

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

              <!-- 收藏按钮 -->
              <div
                class="thumb-favorite-btn"
                :class="{ 'is-favorite': isFavorite(liItem.id) }"
                :title="isFavorite(liItem.id) ? '已收藏' : '添加到收藏'"
                @click.stop="emit('toggle-favorite', liItem, $event)"
              >
                <i :class="isFavorite(liItem.id) ? 'fas fa-heart' : 'far fa-heart'" />
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
                <a class="jsAnchor overlay-anchor wall-favs">{{ formatFileSize(liItem.file_size) }}</a>
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
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  pageData: TotalPageData;
  loading: boolean;
  error: boolean;
  selectedIds?: string[];  // 选中的壁纸ID列表
  favoriteIds?: Set<string>;  // 收藏的壁纸ID集合
}>();

const emit = defineEmits<{
  'set-bg': [item: WallpaperItem];
  'preview': [item: WallpaperItem];
  'download-img': [item: WallpaperItem];
  'close-search-modal': [];
  'select-wallpaper': [id: string];  // 切换选择状态
  'toggle-favorite': [item: WallpaperItem, event: MouseEvent];  // 切换收藏状态
}>();

/**
 * 检查是否已选中
 */
const isSelected = (id: string): boolean => {
  return props.selectedIds?.includes(id) || false
}

/**
 * 检查是否已收藏
 */
const isFavorite = (id: string): boolean => {
  return props.favoriteIds?.has(id) || false
}

/**
 * 切换选择状态
 */
const toggleSelect = (id: string): void => {
  emit('select-wallpaper', id)
}

/**
 * 滚动到顶部
 */
const scrollToTop = (): void => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth' // 平滑滚动效果
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
        threshold: 0.01
      }
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
@import url("@/static/css/list.css");

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
