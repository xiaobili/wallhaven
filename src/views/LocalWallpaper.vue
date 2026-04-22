<template>
  <main id="main" class="local-wallpaper-page">
    <!-- 工具栏 -->
    <div class="local-toolbar framed">
      <div class="toolbar-left">
        <span class="folder-path" v-if="downloadPath">
          <i class="fas fa-folder-open"></i>
          {{ downloadPath }}
        </span>
        <span class="folder-path empty" v-else>
          <i class="fas fa-exclamation-circle"></i>
          未设置下载目录，请前往 <router-link to="/setting">设置</router-link> 页面配置
        </span>
      </div>
      <div class="toolbar-right">
        <button class="button" @click="refreshList" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          刷新
        </button>
        <button class="button" @click="openFolder" v-if="downloadPath">
          <i class="fas fa-folder-open"></i>
          打开文件夹
        </button>
      </div>
    </div>

    <!-- 壁纸列表 -->
    <div id="thumbs" class="thumbs-container" v-if="localWallpapers.length > 0">
      <section class="thumb-listing-page">
        <header class="thumb-listing-page-header">
          <h2>
            本地壁纸 
            <span class="thumb-listing-page-num">{{ localWallpapers.length }}</span> 
            张
          </h2>
          <a class="icon to-top" href="#top" title="返回顶部">
            <i class="far fa-lg fa-chevron-up"></i>
          </a>
        </header>
        <ul class="local-wallpaper-grid">
          <li v-for="(wallpaper, index) in localWallpapers" :key="index">
            <figure class="thumb thumb-local"
                    :style="{ width: '300px', height: '200px' }">
              <!-- 操作按钮 -->
              <a class="thumb-btn thumb-btn-set jsAnchor overlay-anchor" 
                 title="设为桌面壁纸" 
                 @click="setAsWallpaper(wallpaper)">
                <i class="fas fa-fw fa-desktop"></i>
              </a>
              <a class="thumb-btn thumb-btn-delete jsAnchor overlay-anchor" 
                 title="删除文件" 
                 @click="deleteWallpaper(wallpaper, index)">
                <i class="fas fa-fw fa-trash"></i>
              </a>
              
              <!-- 图片预览 -->
              <img alt="本地壁纸" 
                   loading="lazy" 
                   class="lazyload loaded"
                   :src="getImageUrl(wallpaper.path)"
                   @click="previewWallpaper(wallpaper)"
                   @error="handleImageError(index)"/>
              
              <!-- 点击预览区域 -->
              <a class="preview" @click="previewWallpaper(wallpaper)"></a>
              
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
    <div class="empty-state" v-else>
      <div class="empty-icon">
        <i class="fas fa-images"></i>
      </div>
      <h3>{{ emptyMessage }}</h3>
      <p v-if="!downloadPath">请先在设置页面配置下载目录</p>
      <button class="button green" v-if="downloadPath && !loading" @click="refreshList">
        <i class="fas fa-sync-alt"></i>
        重新加载
      </button>
    </div>

    <!-- 加载状态 -->
    <div class="main-bottom" v-show="loading">
      <div class="loading-span">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
    </div>

    <!-- 图片预览组件 -->
    <ImagePreview
      v-if="previewItem"
      :showing="!!previewItem"
      :img-info="previewItem"
      @close="closePreview"
      @download-img="() => {}"
      @set-bg="setAsWallpaper"
      @preview="() => {}"
    />
  </main>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import ImagePreview from '@/components/ImagePreview.vue'
import type { WallpaperItem } from '@/types'
import { formatFileSize } from '@/utils/helpers'

// Pinia Store
const wallpaperStore = useWallpaperStore()

// 响应式数据
const loading = ref<boolean>(false)
const localWallpapers = ref<LocalWallpaper[]>([])
const previewItem = ref<WallpaperItem | null>(null)

// 计算属性
const downloadPath = computed(() => wallpaperStore.settings.downloadPath)

const emptyMessage = computed(() => {
  if (!downloadPath.value) {
    return '未设置下载目录'
  }
  if (loading.value) {
    return '加载中...'
  }
  return '暂无本地壁纸'
})

// 本地壁纸接口
interface LocalWallpaper {
  name: string
  path: string
  size: number
  modifiedTime: string
  width?: number
  height?: number
}

// 方法
const refreshList = async (): Promise<void> => {
  if (!downloadPath.value) {
    console.warn('未设置下载目录')
    return
  }

  loading.value = true
  
  try {
    // 调用 Electron IPC 读取文件夹中的图片文件
    const result = await window.electronAPI.readDirectory(downloadPath.value)
    
    if (result.error) {
      console.error('读取目录失败:', result.error)
      localWallpapers.value = []
      return
    }
    
    // 转换为本地壁纸格式
    localWallpapers.value = result.files.map(file => ({
      name: file.name,
      path: file.path,
      size: file.size,
      modifiedTime: new Date(file.modifiedAt).toISOString(),
      width: file.width,
      height: file.height
    }))
    
    console.log(`已加载 ${localWallpapers.value.length} 张本地壁纸`)
  } catch (error) {
    console.error('读取本地壁纸失败:', error)
    localWallpapers.value = []
  } finally {
    loading.value = false
  }
}

const openFolder = async (): Promise<void> => {
  if (!downloadPath.value) return
  
  try {
    const result = await window.electronAPI.openFolder(downloadPath.value)
    if (!result.success) {
      console.error('打开文件夹失败:', result.error)
    }
  } catch (error) {
    console.error('打开文件夹错误:', error)
  }
}

const previewWallpaper = (wallpaper: LocalWallpaper): void => {
  // 转换文件路径为 wallhaven:// 协议
  const imageUrl = getImageUrl(wallpaper.path)
  
  // 转换为 WallpaperItem 格式用于预览
  previewItem.value = {
    id: wallpaper.name,
    url: imageUrl,
    short_url: imageUrl,
    views: 0,
    favorites: 0,
    source: '',
    purity: 'sfw',
    category: 'general',
    dimension_x: wallpaper.width || 0,
    dimension_y: wallpaper.height || 0,
    resolution: `${wallpaper.width || 0}x${wallpaper.height || 0}`,
    ratio: '',
    file_size: wallpaper.size,
    file_type: getImageType(wallpaper.name),
    created_at: wallpaper.modifiedTime,
    colors: [],
    path: imageUrl,
    thumbs: {
      large: imageUrl,
      original: imageUrl,
      small: imageUrl,
    },
  }
}

const closePreview = (): void => {
  previewItem.value = null
}

const setAsWallpaper = async (wallpaper: LocalWallpaper | WallpaperItem): Promise<void> => {
  try {
    const imagePath = 'path' in wallpaper ? (wallpaper as LocalWallpaper).path : (wallpaper as WallpaperItem).url
    
    const result = await window.electronAPI.setWallpaper(imagePath)
    
    if (result.success) {
      alert('✅ 壁纸设置成功！')
    } else {
      alert('❌ 设置壁纸失败: ' + (result.error || '未知错误'))
    }
  } catch (error: any) {
    console.error('设置壁纸错误:', error)
    alert('设置壁纸失败: ' + error.message)
  }
}

const deleteWallpaper = async (wallpaper: LocalWallpaper, index: number): Promise<void> => {
  if (!confirm(`确定要删除 "${wallpaper.name}" 吗？此操作不可恢复。`)) {
    return
  }
  
  try {
    const result = await window.electronAPI.deleteFile(wallpaper.path)
    
    if (result.success) {
      // 从列表中移除
      localWallpapers.value.splice(index, 1)
      alert('✅ 文件已删除')
    } else {
      alert('❌ 删除失败: ' + (result.error || '未知错误'))
    }
  } catch (error: any) {
    console.error('删除文件错误:', error)
    alert('删除失败: ' + error.message)
  }
}

const handleImageError = (index: number): void => {
  const wallpaper = localWallpapers.value[index]
  if (wallpaper) {
    console.warn('图片加载失败:', wallpaper.name, wallpaper.path)
  }
}

/**
 * 将本地文件路径转换为 wallhaven:// 协议 URL
 */
const getImageUrl = (filePath: string): string => {
  // 如果已经是 http/https 协议，直接返回
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }
  
  // 转换本地路径为 wallhaven:// URL
  try {
    // 编码特殊字符
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

const getImageType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  }
  return typeMap[ext || ''] || 'image/jpeg'
}

// 生命周期
onMounted(() => {
  if (downloadPath.value) {
    refreshList()
  }
})
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
  overflow: hidden;
  background-color: #1a1a1a;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.33);
  transition: transform 0.25s, box-shadow 0.25s;
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
  opacity: 0;
  transition: opacity 0.25s, background-color 0.25s;
  z-index: 10;
}

.thumb-local:hover .thumb-btn {
  opacity: 1;
}

.thumb-btn:hover {
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
}

.thumb-btn-set {
  left: 8px;
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
