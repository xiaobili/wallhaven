<template>
  <main id="main" @click="emit('close-search-modal')">
    <div id="thumbs" class="thumbs-container">
      <section class="thumb-listing-page" v-for="(sectionItem, i) in pageData.sections" :key="i">
        <header v-if="i !== 0" class="thumb-listing-page-header">
          <h2>Page <span class="thumb-listing-page-num">{{ i + 1 }}</span> / {{ pageData.totalPage }}</h2>
          <a class="icon to-top" href="#top" title="Back to top">
            <i class="far fa-lg fa-chevron-up"></i>
          </a>
        </header>
        <ul>
          <li v-for="(liItem, index) in sectionItem.data" :key="liItem.id">
            <figure class="thumb"
                    :class="['thumb-' + (liItem.id), 'thumb-' + (liItem.purity), 'thumb-' + (liItem.category), { 'selected': isSelected(liItem.id) }]"
                    :data-wallpaper-id="liItem.id" 
                    style="width:300px;height:200px"
                    @click.ctrl.exact.prevent="toggleSelect(liItem.id)"
                    @click.meta.exact.prevent="toggleSelect(liItem.id)">
              <!-- 选择框 -->
              <div class="thumb-checkbox" @click.stop.prevent="toggleSelect(liItem.id)">
                <i class="fas fa-check check-icon" v-if="isSelected(liItem.id)"></i>
              </div>

              <a class="thumb-btn thumb-btn-fav jsAnchor overlay-anchor" title="设为壁纸" @click.stop="emit('set-bg', liItem)">
                <i class="fas fa-fw fa-repeat-alt"></i>
              </a>
              <img alt="loading" loading="lazy" class="lazyload loaded"
                   :data-src="liItem.thumbs.small" :src="liItem.thumbs.small"/>
              <a class="preview" @click.stop="emit('preview', liItem)"></a>
              <div class="thumb-info">
                <span class="wall-res">{{ formatResolution(liItem.resolution) }}</span>
                <a class="jsAnchor overlay-anchor wall-favs">{{ formatFileSize(liItem.file_size) }}</a>
                <span v-if="liItem.file_type === 'image/png'" class="png"><span>PNG</span></span>
                <a class="jsAnchor thumb-tags-toggle tagged" title="下载" @click="emit('download-img', liItem)">
                  <i class="fas fa-fw fa-download"></i>
                </a>
              </div>
            </figure>
          </li>
        </ul>
      </section>
    </div>
    <div class="main-bottom">
      <div class="loading-span" v-show="loading"><i class="fas fa-spinner"></i></div>
      <div class="error-span" v-show="error"><i class="fas fa-times"> <br/>网络异常，请点击右上角刷新按钮重试。</i></div>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { WallpaperItem, TotalPageData } from '@/types'
import { formatResolution, formatFileSize } from '@/utils/helpers'

const props = defineProps<{
  pageData: TotalPageData;
  loading: boolean;
  error: boolean;
  selectedIds?: string[];  // 选中的壁纸ID列表
}>();

const emit = defineEmits<{
  'set-bg': [item: WallpaperItem];
  'preview': [item: WallpaperItem];
  'download-img': [item: WallpaperItem];
  'close-search-modal': [];
  'select-wallpaper': [id: string];  // 切换选择状态
}>();

/**
 * 检查是否已选中
 */
const isSelected = (id: string): boolean => {
  return props.selectedIds?.includes(id) || false
}

/**
 * 切换选择状态
 */
const toggleSelect = (id: string): void => {
  emit('select-wallpaper', id)
}
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
</style>
