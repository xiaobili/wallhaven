<template>
  <div>
    <!-- Alert 提示框 -->
    <Alert
      v-if="alert.visible"
      :type="alert.type"
      :message="alert.message"
      :duration="alert.duration"
      @close="hideAlert"
    />

    <!-- 图片预览组件 -->
    <ImagePreview
      v-show="imgShow"
      :showing="imgShow"
      :img-info="previewItem"
      :is-local="true"
      :wallpaper-list="wallpaperList"
      :current-index="previewIndex"
      @close="closePreview"
      @set-bg="setAsWallpaper"
      @navigate="handleNavigate"
    />
    <!-- 主内容区域 -->
    <LocalWallpaperMain
      :local-wallpapers="localWallpapers"
      :loading="loading"
      :download-path="downloadPath"
      @refresh="refreshList"
      @open-folder="openFolder"
      @set-wallpaper="setAsWallpaper"
      @delete-wallpaper="deleteWallpaper"
      @preview="previewWallpaper"
      @image-error="handleImageError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import LocalWallpaperMain from '@/components/LocalWallpaperMain.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import Alert from '@/components/Alert.vue'
import type { WallpaperItem } from '@/types'
import { useSettings, useAlert, useLocalFiles, useWallpaperSetter } from '@/composables'
import type { LocalWallpaper } from '@/components/LocalWallpaperMain.vue'

const { settings } = useSettings()
const { alert, showSuccess, hideAlert,showError } = useAlert()
const { readDirectory, openFolder: openFolderAction, deleteFile } = useLocalFiles()
const { setWallpaper } = useWallpaperSetter()

// 响应式数据
const loading = ref<boolean>(false)
const localWallpapers = ref<LocalWallpaper[]>([])
const previewItem = ref<WallpaperItem | null>(null)

const imgShow = ref<boolean>(false)

// 计算属性
const downloadPath = computed(() => settings.value.downloadPath)

// 将 localWallpapers 转换为 WallpaperItem[] 格式
const wallpaperList = computed<WallpaperItem[]>(() => {
  return localWallpapers.value.map((wp) => ({
    id: wp.name,
    url: getImageUrl(wp.path),
    short_url: getImageUrl(wp.path),
    views: 0,
    favorites: 0,
    source: '',
    purity: 'sfw',
    category: 'general',
    dimension_x: wp.width || 0,
    dimension_y: wp.height || 0,
    resolution: `${wp.width || 0}x${wp.height || 0}`,
    ratio: '',
    file_size: wp.size,
    file_type: getImageType(wp.name),
    created_at: wp.modifiedTime,
    colors: [],
    path: getImageUrl(wp.path),
    thumbs: {
      large: getImageUrl(wp.path),
      original: getImageUrl(wp.path),
      small: getImageUrl(wp.path),
    },
  }))
})

// 当前预览索引
const previewIndex = computed(() => {
  if (!previewItem.value) return -1
  return localWallpapers.value.findIndex(wp => wp.name === previewItem.value?.id)
})

// 方法
const refreshList = async (): Promise<void> => {
  if (!downloadPath.value) {
    console.warn('未设置下载目录')
    return
  }

  loading.value = true

  try {
    const result = await readDirectory(downloadPath.value)

    if (!result.success || !result.data) {
      console.error('读取目录失败:', result.error)
      localWallpapers.value = []
      return
    }

    localWallpapers.value = result.data.map(file => ({
      name: file.name,
      path: file.path,
      thumbnailPath: file.thumbnailPath || '',
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

  await openFolderAction(downloadPath.value)
}

const previewWallpaper = (wallpaper: LocalWallpaper): void => {
  const imageUrl = getImageUrl(wallpaper.path)
  imgShow.value = true

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
  imgShow.value = false
}

const handleNavigate = (direction: 'prev' | 'next'): void => {
  const newIndex = direction === 'prev'
    ? previewIndex.value - 1
    : previewIndex.value + 1

  if (newIndex >= 0 && newIndex < localWallpapers.value.length) {
    const wallpaper = localWallpapers.value[newIndex]
    if (wallpaper) {
      previewWallpaper(wallpaper)
    }
  }
}

/**
 * 从 wallhaven:// 协议 URL 解码原始文件路径
 * @param url - 可能是 wallhaven:// 协议 URL 或普通路径
 * @returns 原始文件路径
 */
const decodeWallhavenUrl = (url: string): string => {
  if (url.startsWith('wallhaven://')) {
    return decodeURIComponent(url.replace(/^wallhaven:\/\//, ''))
  }
  return url
}

const setAsWallpaper = async (wallpaper: LocalWallpaper | WallpaperItem): Promise<void> => {
  // 获取图片路径用于设置壁纸
  // 对于 LocalWallpaper（从列表直接点击），path 字段是原始文件路径
  // 对于 WallpaperItem（从 ImagePreview 传来），path 可能是 wallhaven:// 协议 URL，需要解码
  const pathValue = 'path' in wallpaper ? (wallpaper as LocalWallpaper).path : (wallpaper as WallpaperItem).url
  const imagePath = decodeWallhavenUrl(pathValue)
  console.log('设置壁纸:', imagePath)

  const result = await setWallpaper(imagePath)
  if (result) {
    showSuccess('壁纸设置成功')
  } else {
    showError('壁纸设置失败')
  }
}

const deleteWallpaper = async (wallpaper: LocalWallpaper, index: number): Promise<void> => {
  const confirmed = window.confirm(`确定要删除 "${wallpaper.name}" 吗？此操作不可恢复。`)
  if (!confirmed) {
    return
  }

  const result = await deleteFile(wallpaper.path)

  if (result.success) {
    localWallpapers.value.splice(index, 1)
    showSuccess('文件已删除')
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

onActivated(() => {
  // Refresh list when returning to this page (thumbnails may have been cleared)
  if (downloadPath.value) {
    refreshList()
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100%;
}
</style>
