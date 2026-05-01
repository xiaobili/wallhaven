<template>
  <main id="main" class="local-wallpaper-page">
    <!-- 工具栏 -->
    <div class="local-toolbar framed">
      <div class="toolbar-left">
        <span v-if="downloadPath" class="folder-path">
          <i class="fas fa-folder-open" />
          {{ downloadPath }}
        </span>
        <span v-else class="folder-path empty">
          <i class="fas fa-exclamation-circle" />
          未设置下载目录，请前往 <router-link to="/setting">设置</router-link> 页面配置
        </span>
      </div>
      <div class="toolbar-right">
        <button class="button" :disabled="loading" @click="$emit('refresh')">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }" />
          刷新
        </button>
        <button v-if="downloadPath" class="button" @click="$emit('open-folder')">
          <i class="fas fa-folder-open" />
          打开文件夹
        </button>
      </div>
    </div>

    <!-- 壁纸列表 -->
    <div v-if="localWallpapers.length > 0" id="thumbs" class="thumbs-container">
      <section class="thumb-listing-page">
        <header class="thumb-listing-page-header">
          <h2>
            本地壁纸
            <span class="thumb-listing-page-num">{{ localWallpapers.length }}</span>
            张
          </h2>
          <a class="icon to-top" href="#top" title="返回顶部">
            <i class="far fa-lg fa-chevron-up" />
          </a>
        </header>
        <ul class="local-wallpaper-grid">
          <li v-for="(wallpaper, index) in localWallpapers" :key="index">
            <figure class="thumb thumb-local" :style="{ width: '300px', height: '200px' }">
              <!-- 操作按钮 -->
              <a
                class="thumb-btn thumb-btn-set jsAnchor overlay-anchor"
                title="设为桌面壁纸"
                @click="$emit('set-wallpaper', wallpaper)"
              >
                <i class="fas fa-fw fa-desktop" />
              </a>
              <a
                class="thumb-btn thumb-btn-delete jsAnchor overlay-anchor"
                title="删除文件"
                @click="$emit('delete-wallpaper', wallpaper, index)"
              >
                <i class="fas fa-fw fa-trash" />
              </a>

              <!-- 图片预览 - 优先使用缩略图 -->
              <img
                alt="本地壁纸"
                loading="lazy"
                class="lazyload loaded"
                :src="getImageUrl(wallpaper.thumbnailPath || wallpaper.path)"
                @click="$emit('preview', wallpaper)"
                @error="$emit('image-error', index)"
              />

              <!-- 点击预览区域 -->
              <a class="preview" @click="$emit('preview', wallpaper)" />

              <!-- 底部信息 -->
              <div class="thumb-info">
                <span class="wall-name" :title="wallpaper.name">{{ wallpaper.name }}</span>
                <span class="wall-res">{{ formatFileSize(wallpaper.size) }}</span>
                <span class="wall-date">{{ formatDate(wallpaper.modifiedTime) }}</span>
              </div>
            </figure>
          </li>
        </ul>
      </section>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-images" />
      </div>
      <h3>{{ emptyMessage }}</h3>
      <p v-if="!downloadPath">请先在设置页面配置下载目录</p>
      <button v-if="downloadPath && !loading" class="button green" @click="$emit('refresh')">
        <i class="fas fa-sync-alt" />
        重新加载
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-show="loading" class="main-bottom">
      <div class="loading-span">
        <i class="fas fa-spinner fa-spin" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatFileSize } from '@/utils/helpers'

// 本地壁纸接口
export interface LocalWallpaper {
  name: string
  path: string
  thumbnailPath?: string
  size: number
  modifiedTime: string
  width?: number
  height?: number
}

// Props
interface Props {
  localWallpapers: LocalWallpaper[]
  loading: boolean
  downloadPath: string
}

const props = withDefaults(defineProps<Props>(), {
  localWallpapers: () => [],
  loading: false,
  downloadPath: '',
})

// Emits
defineEmits<{
  refresh: []
  'open-folder': []
  'set-wallpaper': [wallpaper: LocalWallpaper]
  'delete-wallpaper': [wallpaper: LocalWallpaper, index: number]
  preview: [wallpaper: LocalWallpaper]
  'image-error': [index: number]
}>()

// 计算属性
const emptyMessage = computed(() => {
  if (!props.downloadPath) {
    return '未设置下载目录'
  }
  if (props.loading) {
    return '加载中...'
  }
  return '暂无本地壁纸'
})

// 工具方法
const getImageUrl = (filePath: string): string => {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }
  try {
    const encodedPath = encodeURIComponent(filePath)
    return `wallhaven://${encodedPath}`
  } catch (error) {
    console.error('转换文件路径失败:', error, filePath)
    return filePath
  }
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return dateString
  }
}
</script>

<style scoped>
@import url('@/static/css/list.css');

.local-wallpaper-page {
  min-height: calc(100vh - 60px);
}

/* 工具栏样式 */
.local-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8em 1em;
  margin: 1em auto;
  max-width: 1920px;
}

.toolbar-left {
  flex: 1;
  overflow: hidden;
}

.folder-path {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  color: #85aaaf;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-path i {
  color: #0cd;
}

.folder-path.empty {
  color: #999;
}

.folder-path a {
  color: #0cd;
  text-decoration: underline;
}

.toolbar-right {
  display: flex;
  gap: 0.5em;
  flex-shrink: 0;
}

.toolbar-right .button {
  margin: 0;
  padding: 0.4em 1em;
  font-size: 0.9em;
}

.toolbar-right .button i {
  margin-right: 0.3em;
}

/* 壁纸网格样式 */
.local-wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5em;
  padding: 1em;
  list-style: none;
}

.local-wallpaper-grid li {
  margin: 0;
}

/* 本地壁纸缩略图样式 */
.thumb-local {
  position: relative;
  border-radius: 3px;
  overflow: visible;
  background-color: #1a1a1a;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.33);
  transition:
    transform 0.25s,
    box-shadow 0.25s;
}

.thumb-local:hover {
  transform: translateY(-3px);
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.5);
}

.thumb-local img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  display: block;
}

/* 操作按钮 */
.thumb-btn {
  position: absolute;
  top: 8px;
  width: 32px;
  height: 32px;
  line-height: 32px;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  color: #ddd;
  font-size: 14px;
  opacity: 0.6;
  transition:
    opacity 0.25s,
    background-color 0.25s,
    transform 0.25s;
  z-index: 130;
  cursor: pointer;
}

.thumb-local:hover .thumb-btn {
  opacity: 1;
  transform: scale(1.1);
}

.thumb-btn:hover {
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
}

.thumb-btn-set {
  left: -8px;
}

.thumb-btn-set:hover {
  background-color: rgba(0, 204, 221, 0.9);
}

.thumb-btn-delete {
  right: 8px;
}

.thumb-btn-delete:hover {
  background-color: rgba(221, 51, 51, 0.9);
}

/* 底部信息 */
.thumb-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5em 0.8em;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
}

.wall-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #ddd;
  margin-right: 0.5em;
}

.wall-res {
  color: #aaa;
  margin-right: 0.5em;
  white-space: nowrap;
}

.wall-date {
  color: #999;
  font-size: 0.8em;
  white-space: nowrap;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 4em 2em;
  color: #999;
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 1em;
  color: #444;
}

.empty-state h3 {
  font-size: 1.5em;
  color: #8cc;
  margin-bottom: 0.5em;
}

.empty-state p {
  margin-bottom: 1.5em;
  color: #777;
}

.empty-state .button {
  margin: 0 auto;
}

/* 加载状态 */
.main-bottom {
  height: 50px;
  text-align: center;
  padding: 1em 0;
}

.loading-span {
  display: inline-block;
  width: 30px;
  height: 30px;
}

.fa-spinner {
  font-size: 30px;
  color: #0cd;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .local-toolbar {
    flex-direction: column;
    gap: 1em;
    align-items: stretch;
  }

  .toolbar-right {
    justify-content: center;
  }

  .local-wallpaper-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1em;
    padding: 0.5em;
  }
}

@media (max-width: 480px) {
  .local-wallpaper-grid {
    grid-template-columns: 1fr;
  }
}
</style>
