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
                    :class="'thumb-' + (liItem.id) + ' thumb-' + (liItem.purity) + ' thumb-' + (liItem.category)"
                    :data-wallpaper-id="liItem.id" style="width:300px;height:200px">
              <a class="thumb-btn thumb-btn-fav jsAnchor overlay-anchor" title="设为壁纸" @click="emit('set-bg', liItem)">
                <i class="fas fa-fw fa-repeat-alt"></i>
              </a>
              <img alt="loading" loading="lazy" class="lazyload loaded"
                   :data-src="liItem.thumbs.small" :src="liItem.thumbs.small"/>
              <a class="preview" @click="emit('preview', liItem)"></a>
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
import type { WallpaperItem ,TotalPageData } from '@/types'
import { formatResolution, formatFileSize } from '@/utils/helpers'

const props = defineProps<{
  pageData: TotalPageData;
  loading: boolean;
  error: boolean;
}>();


const emit = defineEmits<{
  'set-bg': [item: WallpaperItem];
  'preview': [item: WallpaperItem];
  'download-img': [item: WallpaperItem];
  'close-search-modal': [];
}>();

</script>

<style scoped>
@import url("@/static/css/list.css");

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

.main-bottom i {
  font-size: 30px;
  line-height: 1.2;
  font-weight: normal !important;
}

#main::-webkit-scrollbar {
  display: none;
}
</style>