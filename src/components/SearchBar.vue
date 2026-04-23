<template>
  <form id="searchbar" class="expanded" @click.stop="closeModal">
    <!-- 关键词搜索 -->
    <div @click.stop="" id="search-keyword" class="framed searchbar-dropdown">
      <input
        type="text"
        name="keyword"
        placeholder="搜索关键词（英文）"
        v-model="localParams.keyword"
      />
    </div>

    <!-- 分类选择 -->
    <div @click.stop="" id="search-category-checks" class="framed">
      <input
        type="checkbox"
        v-model="localParams.categories"
        name="general"
        value="general"
        id="search-general"
      />
      <label for="search-general">普通</label>

      <input
        type="checkbox"
        v-model="localParams.categories"
        name="anime"
        value="anime"
        id="search-anime"
      />
      <label for="search-anime">动漫</label>

      <input
        type="checkbox"
        v-model="localParams.categories"
        name="people"
        value="people"
        id="search-people"
      />
      <label for="search-people">人物</label>
    </div>

    <!-- AI画作过滤 -->
    <div @click.stop="" id="search-aiart-checks" class="framed">
      <input
        type="checkbox"
        v-model="localParams.aiArt"
        value="true"
        name="ai_art_filter"
        id="search-ai"
      />
      <label for="search-ai">AI画作</label>
    </div>

    <!-- 纯度筛选 -->
    <div @click.stop="" id="search-purity-checks" class="framed">
      <input type="checkbox" v-model="localParams.purity" name="sfw" value="sfw" id="search-sfw" />
      <label class="purity sfw" for="search-sfw" title="正经图">SFW</label>

      <input
        type="checkbox"
        v-model="localParams.purity"
        name="sketchy"
        value="sketchy"
        id="search-sketchy"
      />
      <label class="purity sketchy" for="search-sketchy" title="带点颜色">Sketchy</label>

      <input
        v-show="apiKey !== ''"
        type="checkbox"
        v-model="localParams.purity"
        name="nsfw"
        value="nsfw"
        id="search-nsfw"
      />
      <label v-show="apiKey !== ''" class="purity nsfw" for="search-nsfw" title="开车图"
        >NSFW</label
      >
    </div>

    <!-- 分辨率选择 -->
    <div @click.stop="" id="search-resolutions" class="framed searchbar-dropdown">
      <a
        class="jsAnchor dropdown-toggle"
        :class="localParams.selector === 1 ? 'extended' : 'collapsed'"
        @click="changeSelector(1)"
        >{{ localParams.resolution == '' ? '分辨率' : localParams.resolution }}</a
      >
      <div class="dropdown" :class="localParams.selector === 1 ? 'extended' : 'collapsed'">
        <div>
          <div class="framed">
            <input
              type="radio"
              v-model="localParams.respickerLimitation"
              name="searchbar-respicker-limitation"
              id="searchbar-respicker-atleast"
              value="atleast"
            />
            <label for="searchbar-respicker-atleast"> <i class="far fa-plus"></i> 至少 </label>

            <input
              type="radio"
              v-model="localParams.respickerLimitation"
              name="searchbar-respicker-limitation"
              id="searchbar-respicker-exactly"
              value="exactly"
            />
            <label for="searchbar-respicker-exactly">
              <i class="far fa-dot-circle"></i> 精确的
            </label>
          </div>

          <div class="respicker">
            <p v-show="desktopInfo !== ''" class="respicker-native-info">
              你的屏幕分辨率：<strong
                ><em>{{ desktopInfo }}</em></strong
              >.
            </p>

            <table class="label-table">
              <thead>
                <tr>
                  <th>Ultrawide</th>
                  <th>16:9</th>
                  <th>16:10</th>
                  <th>4:3</th>
                  <th>5:4</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, i) in resolutionsArray" :key="i">
                  <td v-for="(rln, x) in line.item" :key="x">
                    <input
                      v-if="localParams.respickerLimitation !== 'atleast'"
                      type="checkbox"
                      name="respicker-resolution"
                      :id="'searchbar-respicker-' + rln"
                      :value="rln"
                      v-model="localParams.resolutions"
                    />
                    <input
                      v-if="localParams.respickerLimitation === 'atleast'"
                      type="radio"
                      name="respicker-resolution"
                      :id="'searchbar-respicker-' + rln"
                      :value="rln"
                      v-model="localParams.resolution"
                      @click="handleCancleSelect(rln)"
                    />
                    <label :for="'searchbar-respicker-' + rln" original-title="Dual 1080p">{{
                      formatMulti(rln)
                    }}</label>
                  </td>
                </tr>
              </tbody>
            </table>

            <hr />

            <div class="respicker-custom oneline framed">
              <label for="searchbar-respicker-custom-width">自定义分辨率</label>
              <input
                type="text"
                pattern="[0-9]{0,5}"
                v-model="localParams.respickerCustomWidth"
                name="respicker-custom-width"
                id="searchbar-respicker-custom-width"
                placeholder="Width"
                maxlength="5"
              />
              <label class="respicker-custom-separator">
                <i class="far fa-times"></i>
              </label>
              <input
                type="text"
                pattern="[0-9]{0,5}"
                v-model="localParams.respickerCustomHeight"
                name="respicker-custom-height"
                id="searchbar-respicker-custom-height"
                placeholder="Height"
                maxlength="5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 比例选择 -->
    <div @click.stop="" id="search-ratios" class="framed searchbar-dropdown">
      <a
        class="jsAnchor dropdown-toggle"
        :class="localParams.selector === 2 ? 'extended' : 'collapsed'"
        @click="changeSelector(2)"
        style="min-width: 5em"
        >比例</a
      >
      <div class="dropdown" :class="localParams.selector === 2 ? 'extended' : 'collapsed'">
        <div style="padding: 0.5em 1em">
          <div class="respicker">
            <table class="label-table">
              <thead>
                <tr>
                  <th>宽屏</th>
                  <th>超宽屏</th>
                  <th>竖屏</th>
                  <th>方屏</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="2">
                    <input
                      type="checkbox"
                      name="ratio"
                      v-model="localParams.ratios"
                      value="landscape"
                      class="ratio"
                      id="searchbar-ratio-landscape"
                    />
                    <label for="searchbar-ratio-landscape"> 全部横屏 </label>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      name="ratio"
                      v-model="localParams.ratios"
                      value="portrait"
                      class="ratio"
                      id="searchbar-ratio-portrait"
                    />
                    <label for="searchbar-ratio-portrait">全部竖屏</label>
                  </td>
                </tr>
                <tr v-for="(line, i) in ratiosArray" :key="i">
                  <td v-for="(ra, x) in line.item" :key="x">
                    <input
                      v-if="ra !== ''"
                      v-model="localParams.ratios"
                      type="checkbox"
                      name="ratio"
                      :value="ra"
                      class="ratio"
                      :id="'searchbar-ratio-' + ra"
                    />
                    <label :for="'searchbar-ratio-' + ra">{{ formatMulti(ra) }}</label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 颜色选择 -->
    <div @click.stop="" id="search-colors" class="framed searchbar-dropdown">
      <a
        class="jsAnchor dropdown-toggle"
        :class="localParams.selector === 3 ? 'extended' : 'collapsed'"
        @click="changeSelector(3)"
        style="border-radius: 3px"
        :style="localParams.color !== 'none' ? 'background-color: #' + localParams.color + ';' : ''"
        >颜色</a
      >
      <div class="dropdown" :class="localParams.selector === 3 ? 'extended' : 'collapsed'">
        <div style="padding: 0.5em 1em">
          <div class="colorpicker">
            <table class="label-table">
              <tbody>
                <tr v-for="(line, i) in colorsArray" :key="i">
                  <td v-for="(colorItem, ci) in line.item" :key="ci">
                    <input
                      type="radio"
                      v-model="localParams.color"
                      name="search-colors"
                      :id="'search-colors-' + colorItem"
                      :value="colorItem"
                    />
                    <label
                      :for="'search-colors-' + colorItem"
                      :style="
                        colorItem === 'none'
                          ? 'height: 2em;background:linear-gradient(18deg, rgba(255,255,255,1) 42%,rgba(255,0,0,1) 45%,rgba(255,0,0,1) 55%,rgba(255,255,255,1) 58%);'
                          : 'background: #' + colorItem + '; height: 2em;'
                      "
                    ></label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 排序方式 -->
    <div @click.stop="" id="search-sorting" class="framed searchbar-dropdown">
      <input
        type="checkbox"
        name="order"
        v-model="localParams.desc"
        value="desc"
        id="search-order"
      />
      <label for="search-order" original-title="Ascending/Descending"></label>

      <a
        class="jsAnchor dropdown-toggle"
        :class="localParams.selector === 4 ? 'extended' : 'collapsed'"
        @click="changeSelector(4)"
        style="width: 7em"
        >{{ sortingFormat(localParams.sorting) }}</a
      >

      <div class="dropdown" :class="localParams.selector === 4 ? 'extended' : 'collapsed'">
        <div>
          <input
            type="radio"
            v-model="localParams.sorting"
            name="sorting"
            value="relevance"
            id="search-sorting-relevance"
          />
          <label for="search-sorting-relevance">相关性</label>

          <input
            type="radio"
            v-model="localParams.sorting"
            name="sorting"
            value="random"
            id="search-sorting-random"
          />
          <label for="search-sorting-random">随机</label>

          <input
            type="radio"
            v-model="localParams.sorting"
            name="sorting"
            value="date_added"
            id="search-sorting-date"
          />
          <label for="search-sorting-date">日期</label>

          <input
            type="radio"
            v-model="localParams.sorting"
            name="sorting"
            value="views"
            id="search-sorting-views"
          />
          <label for="search-sorting-views">浏览量</label>

          <input
            type="radio"
            v-model="localParams.sorting"
            name="sorting"
            value="favorites"
            id="search-sorting-favorites"
          />
          <label for="search-sorting-favorites">收藏数</label>

          <input
            type="radio"
            v-model="localParams.sorting"
            name="sorting"
            value="toplist"
            id="search-sorting-toplist"
          />
          <label for="search-sorting-toplist">排行榜</label>

          <input
            type="radio"
            v-model="localParams.sorting"
            name="sorting"
            value="hot"
            id="search-sorting-hot"
          />
          <label for="search-sorting-hot">热度</label>
        </div>
      </div>
    </div>

    <!-- 排行榜时间范围 -->
    <div
      @click.stop=""
      :style="localParams.sorting !== 'toplist' ? 'visibility:hidden' : ''"
      id="search-toplist-range"
      class="framed searchbar-dropdown"
    >
      <a
        class="jsAnchor dropdown-toggle"
        :class="localParams.selector === 5 ? 'extended' : 'collapsed'"
        @click="changeSelector(5)"
        style="width: 8.5em"
        >{{ topRangeFormat(localParams.topRange) }}</a
      >

      <div class="dropdown" :class="localParams.selector === 5 ? 'extended' : 'collapsed'">
        <div>
          <input
            type="radio"
            v-model="localParams.topRange"
            name="top"
            value="1d"
            id="searchbar-toplist-range-1d"
          />
          <label for="searchbar-toplist-range-1d">1 天</label>

          <input
            type="radio"
            v-model="localParams.topRange"
            name="top"
            value="3d"
            id="searchbar-toplist-range-3d"
          />
          <label for="searchbar-toplist-range-3d">3 天</label>

          <input
            type="radio"
            v-model="localParams.topRange"
            name="top"
            value="1w"
            id="searchbar-toplist-range-1w"
          />
          <label for="searchbar-toplist-range-1w">上周</label>

          <input
            type="radio"
            v-model="localParams.topRange"
            name="top"
            value="1M"
            id="searchbar-toplist-range-1M"
          />

          <input
            type="radio"
            v-model="localParams.topRange"
            name="top"
            value="3M"
            id="searchbar-toplist-range-3M"
          />
          <label for="searchbar-toplist-range-3M">3 个月</label>

          <input
            type="radio"
            v-model="localParams.topRange"
            name="top"
            value="6M"
            id="searchbar-toplist-range-6M"
          />
          <label for="searchbar-toplist-range-6M">6 个月</label>

          <input
            type="radio"
            v-model="localParams.topRange"
            name="top"
            value="1y"
            id="searchbar-toplist-range-1y"
          />
          <label for="searchbar-toplist-range-1y">去年</label>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <button
      type="button"
      class="button"
      id="search-submit"
      @click="emit('changeParams', computedQueryParams)"
    >
      <i class="fas fa-sync"></i>
    </button>

    <div title="设置为在线切换模式参数">
      <button type="button" class="button" id="search-save" @click="saveParams">
        <i class="fas" :class="saving ? 'fa-spinner' : 'fa-save'"></i>
      </button>
    </div>
    <button type="button" class="button" id="search-reset" @click="resetSelect">
      <i class="fas fa-undo"></i>
    </button>

    <!-- 多选工具栏 -->
    <div v-if="(selectedCount || 0) > 0">
      <div>
        <button class="button" @click="handleDownloadSelected" :disabled="downloading || false">
          <i class="fas fa-download"></i> 下载选中
        </button>
        <button class="button red" @click="handleClearSelection">
          <i class="fas fa-times"></i> 取消选择
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import type { CustomParams, ResolutionLine, RatioLine, ColorLine, GetParams } from '@/types'
import { arrayToBinaryString, formatResolution } from '@/utils/helpers'
import { useWallpaperStore } from '@/stores/wallpaper'

const wallpaperStore = useWallpaperStore()

onMounted(() => {
  const oldCustomParams = wallpaperStore.getSavedParams()
  if (oldCustomParams) {
    Object.assign(localParams, oldCustomParams)
  }
  emit('changeParams', computedQueryParams.value)
})

// Props
const props = defineProps<{
  apiKey: string
  desktopInfo: string
  saving: boolean
  selectedCount?: number
  downloading?: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'changeParams', value: GetParams | null): void
  (e: 'downloadSelected'): void
  (e: 'clearSelection'): void
}>()

// 本地参数副本 - 使用 reactive 确保深层响应式
const localParams = reactive<CustomParams>({
  selector: 0,
  keyword: '',
  categories: ['general', 'anime'],
  aiArt: false,
  purity: ['sfw', 'sketchy'],
  sorting: 'hot',
  desc: true,
  topRange: '1M',
  ratios: [],
  respickerLimitation: 'atleast',
  resolutions: [],
  resolution: '',
  respickerCustomWidth: '',
  respickerCustomHeight: '',
  color: 'none',
})

// 将 watch 转换为 computed，自动追踪 localParams 的变化
const computedQueryParams = computed<GetParams>(() => {
  // 使用工具函数转换分类和纯度为二进制字符串
  const ALL_CATEGORIES = ['general', 'anime', 'people']
  const tempCate = arrayToBinaryString(localParams.categories, ALL_CATEGORIES)

  const ALL_PURITIES = ['sfw', 'sketchy', 'nsfw']
  const tempPurity = arrayToBinaryString(localParams.purity, ALL_PURITIES)

  localParams.respickerLimitation === 'atleast'
    ? (localParams.resolutions = [])
    : (localParams.resolution = '')

  // 处理空数组，返回 undefined 而非空字符串
  const ratiosStr = localParams.ratios.length > 0 ? localParams.ratios.join(',') : undefined
  const resolutionsStr =
    localParams.resolutions.length > 0 ? localParams.resolutions.join(',') : undefined

  // 处理颜色值，'none' 时返回 null
  const colorValue = localParams.color && localParams.color !== 'none' ? localParams.color : null

  return {
    q: localParams.keyword,
    categories: tempCate,
    purity: tempPurity,
    sorting: localParams.sorting,
    topRange: localParams.topRange,
    order: localParams.desc ? 'desc' : 'asc',
    colors: colorValue,
    ratios: ratiosStr,
    atleast: localParams.resolution,
    resolutions: resolutionsStr,
    page: 1,
  }
})

// 分辨率数组
const resolutionsArray: ResolutionLine[] = [
  { item: ['2560x1080', '1280x720', '1280x800', '1280x960', '1280x1024'] },
  { item: ['3440x1440', '1600x900', '1600x1000', '1600x1200', '1600x1280'] },
  { item: ['3840x1600', '1920x1080', '1920x1200', '1920x1440', '1920x1536'] },
  { item: ['2560x1440', '2560x1600', '2560x1920', '2560x2048'] },
  { item: ['3840x2160', '3840x2400', '3840x2880', '3840x3072'] },
]

// 比例数组
const ratiosArray: RatioLine[] = [
  { item: ['16x9', '21x9', '9x16', '1x1'] },
  { item: ['16x10', '32x9', '10x16', '3x2'] },
  { item: ['', '48x9', '9x18', '4x3'] },
  { item: ['', '', '', '5x4'] },
]

// 颜色数组
const colorsArray: ColorLine[] = [
  { item: ['660000', '990000', 'cc0000', 'cc3333', 'ea4c88', '993399'] },
  { item: ['663399', '333399', '0066cc', '0099cc', '66cccc', '77cc33'] },
  { item: ['669900', '336600', '666600', '999900', 'cccc33', 'ffff00'] },
  { item: ['ffcc33', 'ff9900', 'ff6600', 'cc6633', '996633', '663300'] },
  { item: ['000000', '999999', 'cccccc', 'ffffff', '424153', 'none'] },
]

const handleCancleSelect = (rln: string): void => {
  console.log(rln)
  if (rln === localParams.resolution) {
    localParams.resolution = ''
  }
}

// 格式化分辨率显示（使用工具函数）
const formatMulti = formatResolution

// 切换选择器状态
const changeSelector = (index: number): void => {
  localParams.selector = localParams.selector === index ? 0 : index
}

// 排序方式格式化
const sortingFormat = (sorting: string): string => {
  const map: Record<string, string> = {
    relevance: '相关性',
    random: '随机',
    date_added: '日期',
    views: '浏览量',
    favorites: '收藏数',
    toplist: '排行榜',
    hot: '热度',
  }
  return map[sorting] || '排行榜'
}

// 排行榜时间范围格式化
const topRangeFormat = (topRange: string): string => {
  const map: Record<string, string> = {
    '1d': '1 天',
    '3d': '3 天',
    '1w': '上周',
    '1M': '1 个月',
    '3M': '3 个月',
    '6M': '6 个月',
    '1y': '去年',
  }
  return map[topRange] || '上周'
}

const closeModal = (): void => {
  localParams.selector = 0
}

const resetSelect = (): void => {
  // 重置选择,从pinia中获取参数
  const saved = wallpaperStore.getSavedParams()
  if (saved) {
    // 将保存的参数复制到 localParams
    Object.assign(localParams, saved)
    // 触发更新，通知父组件
    emit('changeParams', computedQueryParams.value)
  }
}

const saveParams = (): void => {
  // 将 params 存储到 pinia 中
  wallpaperStore.saveCustomParams({ ...localParams })
}

const handleDownloadSelected = (): void => {
  emit('downloadSelected')
}

const handleClearSelection = (): void => {
  emit('clearSelection')
}

// 暴露方法给父组件，用于关闭模态框
defineExpose({
  closeModal,
})
</script>

<style scoped>
@import url('@/static/css/list.css');

#search-save {
  background-image: linear-gradient(to bottom, #d5bf2a 0, #777744 100%) !important;
}

/* 多选工具栏样式 */
.selection-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75em 1em;
  margin-top: 0.5em;
  background: rgba(49, 49, 49, 0.8);
  border-radius: 3px;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, .33);
  animation: slideDown 0.25s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.selection-count {
  color: #ddd;
  font-size: 0.95em;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  gap: 0.5em;
}

.button.blue {
  background-image: linear-gradient(to bottom, #0cd 0, #099 100%);
  color: #fff;
}

.button.blue:hover:not(:disabled) {
  background-image: linear-gradient(to bottom, #0de 0, #0aa 100%);
}

.button.blue:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
