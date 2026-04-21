<template>
  <div>
    <PageHeader title="在线壁纸" />

    <ImagePreview
      :showing="imgShow"
      :img-info="imgInfo"
      @preview="preview"
      @download-img="downloadImg"
      @set-bg="setBg"
      @close="closePreview"
    />

    <SearchBar
      ref="searchBarRef"
      :api-key="apiKey"
      :desktop-info="desktopInfo"
      :saving="saving"
      @change-params="handleChangeParams"
      @save-params="saveParams"
      @reset-select="resetSelect"
    />

    <!-- 使用壁纸列表组件 -->
    <WallpaperList
      :page-data="wallpaperStore.totalPageData"
      :loading="wallpaperStore.loading"
      :error="wallpaperStore.error"
      @set-bg="setBg"
      @preview="preview"
      @download-img="downloadImg"
      @close-search-modal="closeSearchModal"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import WallpaperList from '@/components/WallpaperList.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import type { WallpaperItem, GetParams } from '@/types'
import { throttle } from '@/utils/helpers'

// Pinia Store
const wallpaperStore = useWallpaperStore()

// Refs
const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)
const apiKey = ref<string>('')
const desktopInfo = ref<string>('')
const saving = ref<boolean>(false)
const imgInfo = ref<WallpaperItem | null>(null)
const imgShow = ref<boolean>(false)

// Lifecycle hooks
onMounted(() => {
  // 使用节流优化滚动事件
  window.addEventListener('scroll', throttledScrollEvent)
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('scroll', throttledScrollEvent)
})

// Methods
const handleChangeParams = (customParams: GetParams | null): void => {
  wallpaperStore.fetchWallpapers(customParams)
}

const saveParams = (): void => {
  console.log('saveParams 被调用')
  // TODO: 实现保存参数功能
}

const resetSelect = (): void => {
  console.log('resetSelect 被调用')
  // TODO: 实现重置选择功能
}

const closeSearchModal = (): void => {
  // 调用 SearchBar 组件暴露的 closeModal 方法
  if (searchBarRef.value) {
    searchBarRef.value.closeModal()
  }
}

const preview = (imgItem: WallpaperItem): void => {
  imgInfo.value = imgItem
  imgShow.value = true
}

const setBg = (imgItem: WallpaperItem): void => {
  console.log('设置壁纸:', imgItem.id)
  // TODO: 实现设置壁纸功能
}

const downloadImg = (imgItem: WallpaperItem): void => {
  console.log('下载图片:', imgItem.id)
  // TODO: 实现下载图片功能
}

const closePreview = (): void => {
  imgShow.value = false
  imgInfo.value = null
}

/**
 * 滚轮滚动加载（使用节流优化）
 */
const scrollEvent = (): void => {
  // 如果正在加载，则不执行
  if (wallpaperStore.loading) return

  // 如果已经加载完所有页面且有数据，则不执行
  const { currentPage, totalPage } = wallpaperStore.totalPageData
  if (totalPage > 0 && currentPage >= totalPage) return

  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
  const clientHeight = document.documentElement.clientHeight

  // 距离底部200px时触发加载（增加阈值以应对快速滚动）
  if (scrollTop + clientHeight >= scrollHeight - 200) {
    wallpaperStore.loadMoreWallpapers()
  }
}

// 使用节流函数包装滚动事件（200ms间隔，更快响应）
const throttledScrollEvent = throttle(scrollEvent, 200)
</script>

<style scoped></style>
