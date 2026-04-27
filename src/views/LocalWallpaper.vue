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

    <!-- 图片预览组件 -->
    <ImagePreview
      :showing="imgShow"
      :img-info="previewItem"
      @close="closePreview"
      @download-img="() => {}"
      @set-bg="setAsWallpaper"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LocalWallpaperMain from '@/components/LocalWallpaperMain.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import Alert from '@/components/Alert.vue'
import type { WallpaperItem } from '@/types'
import { useSettings, useAlert, useLocalFiles, useWallpaperSetter } from '@/composables'
import type { LocalWallpaper } from '@/components/LocalWallpaperMain.vue'

const { settings } = useSettings()
const { alert, showSuccess, hideAlert } = useAlert()
const { readDirectory, openFolder: openFolderAction, deleteFile } = useLocalFiles()
const { setWallpaper } = useWallpaperSetter()

// 响应式数据
const loading = ref<boolean>(false)
const localWallpapers = ref<LocalWallpaper[]>([])
const previewItem = ref<WallpaperItem | null>(null)

const imgShow = ref<boolean>(false)

// 计算属性
const downloadPath = computed(() => settings.value.downloadPath)

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
  const imagePath = 'path' in wallpaper ? (wallpaper as LocalWallpaper).path : (wallpaper as WallpaperItem).url

  await setWallpaper(imagePath)
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
</script>

<style scoped>
.page-container {
  min-height: 100%;
}
</style>
