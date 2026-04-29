<template>
  <div
    class="mask"
    :class="showing === true ? '' : 'out'"
  >
    <a
      class="close_btn"
      @click="close"
    />
    <!-- 左侧导航按钮 - 上一张 -->
    <div
      v-if="canNavigatePrev"
      class="nav-btn nav-btn-prev"
      title="上一张"
      @click="navigatePrev"
    >
      <i class="fas fa-chevron-left" />
    </div>
    <!-- 右侧导航按钮 - 下一张 -->
    <div
      v-if="canNavigateNext"
      class="nav-btn nav-btn-next"
      title="下一张"
      @click="navigateNext"
    >
      <i class="fas fa-chevron-right" />
    </div>
    <div class="img-view">
      <Transition
        :name="slideDirection"
        mode="out-in"
      >
        <img
          v-if="imgInfo"
          :key="imgInfo.id"
          class="img-class"
          :src="imgInfo.path"
          :style="{'max-height':calHeight}"
        >
      </Transition>
      <img
        v-show="!showing"
        class="img-class close-bg"
        :src="imgBgSrc"
        :style="{'max-height':calHeight}"
      >
    </div>
    <div
      class="sidebar-fixed-wrapper"
      style="bottom: 40px;"
    >
      <div class="details-sidebar-fixed-box hi-de">
        <div
          class="sidebar-fixed_box comments-middle-icon"
          title="设为壁纸"
          @click="setBg(imgInfo)"
        >
          <div class="icon-wrap">
            <i class="fas fa-repeat-alt" />
          </div>
        </div>
        <div
          class="sidebar-fixed_box favorite-btn"
          :class="{ 'is-favorite': isFavorite }"
          :title="isFavorite ? '已收藏 · 右键选择收藏夹' : '添加到收藏 · 右键选择收藏夹'"
          @click="handleFavoriteClick"
          @contextmenu.prevent="handleFavoriteRightClick"
        >
          <div class="icon-wrap">
            <i :class="isFavorite ? 'fas fa-heart' : 'far fa-heart'" />
          </div>
        </div>
        <div
          v-show="!isLocal"
          class="sidebar-fixed_box share-middle-icon sidebar-share"
          title="下载"
          @click="downloadImg(imgInfo)"
        >
          <div class="icon-wrap">
            <i class="fas fa-download" />
          </div>
        </div>
      </div>
      <div
        class="back-to-top sidebar-fixed_box"
        z-st="shortcut_totop"
        style="display: block;"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WallpaperItem } from '@/types';
import { ref, computed, onMounted, onUnmounted } from 'vue';

// 定义 props
interface Props {
  showing: boolean;
  imgInfo: WallpaperItem | null;
  isLocal: boolean;
  wallpaperList?: WallpaperItem[];
  currentIndex?: number;
  favoriteIds?: Set<string>;
}

const props = withDefaults(defineProps<Props>(), {
  showing: false,
  isLocal: false,
  wallpaperList: () => [],
  currentIndex: -1,
  favoriteIds: () => new Set(),
});

// 定义 emits
const emit = defineEmits<{
  close: [value: boolean];
  'set-bg': [item: WallpaperItem];
  'download-img': [item: WallpaperItem];
  navigate: [direction: 'prev' | 'next'];
  'toggle-favorite': [item: WallpaperItem, event: MouseEvent];  // left click
  'show-favorite-dropdown': [item: WallpaperItem, event: MouseEvent];  // right click
}>();

// 响应式数据
const clientHeight = ref<number>(1080);
const imgBgSrc = ref<string>("");
const slideDirection = ref<string>('slide-in-blurred-left');

// 计算属性
const calHeight = computed(() => {
  return parseInt((clientHeight.value * 0.9).toString()) + "px";
});

// 导航计算属性
const canNavigatePrev = computed(() => {
  return props.currentIndex > 0 && props.wallpaperList.length > 1
})

const canNavigateNext = computed(() => {
  return props.currentIndex >= 0 && props.currentIndex < props.wallpaperList.length - 1
})

const isFavorite = computed(() => {
  if (!props.imgInfo) return false
  return props.favoriteIds?.has(props.imgInfo.id) || false
})

// 监听窗口大小变化
const onresize = () => {
  if (document.documentElement.clientHeight !== undefined) {
    clientHeight.value = document.documentElement.clientHeight;
  }
};

// 关闭预览
const close = () => {
  if (props.imgInfo) {
    imgBgSrc.value = props.imgInfo.path;
  }
  emit('close', false);
};

// 设置壁纸
const setBg = (imgItem: WallpaperItem | null) => {
  if (!imgItem) return;
  emit('set-bg', imgItem);
};

// 下载图片
const downloadImg = (imgItem: WallpaperItem | null) => {
  if (!imgItem) return;
  emit('download-img', imgItem);
};

// 导航方法
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    slideDirection.value = 'slide-left'  // New image enters from left
    emit('navigate', 'prev')
  }
}

const navigateNext = () => {
  if (canNavigateNext.value) {
    slideDirection.value = 'slide-right'  // New image enters from right
    emit('navigate', 'next')
  }
}

// 收藏点击处理
const handleFavoriteClick = (event: MouseEvent) => {
  if (!props.imgInfo) return
  emit('toggle-favorite', props.imgInfo, event)
}

// 收藏右键点击处理 - 显示下拉菜单
const handleFavoriteRightClick = (event: MouseEvent) => {
  if (!props.imgInfo) return
  event.preventDefault()
  emit('show-favorite-dropdown', props.imgInfo, event)
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  // 只在预览显示时响应
  if (!props.showing) return

  if (event.key === 'ArrowLeft') {
    navigatePrev()
  } else if (event.key === 'ArrowRight') {
    navigateNext()
  }
}

// 组件挂载时执行
onMounted(() => {
  clientHeight.value = document.documentElement.clientHeight;
  window.addEventListener('resize', onresize);
  window.addEventListener('keydown', handleKeydown);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', onresize);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>


.close_btn {
  z-index: 999;
  display: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  position: absolute;
  top: 20px;
  right: 40px;
  text-decoration: none;
  background: url(@/static/icons/icon-s-close-hover.svg) center no-repeat #222;
}


.sidebar-fixed-wrapper {
  color: #000000;
  position: fixed;
  right: 40px;
  bottom: 40px;
  z-index: 999;
  visibility: hidden;
}

.comments-middle-icon,
.share-middle-icon {
  border: 1px solid #E9E9E9;
  background-color: #222;
  -webkit-transition: background .3s;
  transition: background .3s;
}

.icon-wrap {
  position: relative;
  top: 12px;
  width: 21px;
  margin: 0 auto;
  color: #d7ce82;
}

.sidebar-fixed-wrapper .sidebar-fixed_box {
  color: #d3dce6;
  width: 50px;
  height: 50px;
  margin-top: 10px;
  cursor: pointer;
  border: none;
  position: relative;
  background-repeat: no-repeat;
  background-position: center;
  border-radius: 4px;
  font-size: 20px;
}


.img-class {
  object-fit: cover;
  max-width: 95%;
}

.img_class_copy {
  object-fit: cover;
  max-width: 95%;
}


.mask {
  z-index: 999;
  width: 100%;
  height: 100%;
  position: fixed;
  margin: auto;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.88);
  -webkit-user-select: none;
  /*谷歌 /Chrome*/
  -moz-user-select: none;
  /*火狐/Firefox*/
  -ms-user-select: none;
  /*IE 10+*/
  user-select: none;
  /* background-color: rgba(103, 103, 103, 0.5); */
  display: table;
}

.mask.out {
  opacity: 0;
  visibility: hidden
}

.mask:hover .close_btn {
  display: inline-block;
}

.mask:hover .sidebar-fixed-wrapper {
  visibility: visible;
}

.img-view {
  text-align: center;
  display: table-cell;
  vertical-align: middle;
  width: auto;
  margin-left: auto;
  position: relative;
}

.img-class {
  margin: 0 auto;
}

.img-view > img {
  border-radius: 3px;
  box-shadow: 0 1px 1px 1px #222, 5px 5px 5px rgb(84 84 84 / 50%);
}


/*弹层动画（放大）*/
.mask {
  transition: all 0.3s;
  -moz-transition: all 0.3s;
  /* Firefox 4 */
  -webkit-transition: all 0.3s;
  /* Safari and Chrome */
  -o-transition: all 0.3s;
  /* Opera */
  visibility: visible;
  opacity: 1;
  transform: scale(1);
}

.mask .img-view .img-class {
  animation: blowUpModal 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}

.mask.out .img-view .img-class {
  animation: blowUpModalTwo 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}


@keyframes blowUpModal {
  0% {
    transform: scale(0);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes blowUpModalTwo {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  100% {
    transform: scale(0);
    opacity: 0;
  }
}

/* 导航按钮样式 */
.nav-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background-color: rgba(34, 34, 34, 0.8);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  transition: background-color 0.3s, opacity 0.3s;
  font-size: 20px;
  color: #d7ce82;
}

.nav-btn:hover {
  background-color: rgba(34, 34, 34, 1);
}

.nav-btn-prev {
  left: 40px;
}

.nav-btn-next {
  right: 40px;
}

/* 悬浮时显示导航按钮 */
.mask:hover .nav-btn {
  opacity: 1;
}

/* 收藏按钮样式 */
.favorite-btn {
  border: 1px solid #E9E9E9;
  background-color: #222;
  transition: background 0.3s;
}

.favorite-btn:hover {
  background-color: #ff6b6b;
  border-color: #ff6b6b;
}

.favorite-btn.is-favorite {
  background-color: #ff6b6b;
  border-color: #ff6b6b;
}

.favorite-btn.is-favorite .icon-wrap {
  color: #fff;
}

/* ----------------------------------------------
 * Generated by Animista on 2026-4-30 0:0:18
 * Licensed under FreeBSD License.
 * See http://animista.net/license for more info. 
 * w: http://animista.net, t: @cssanimista
 * ---------------------------------------------- */

/**
 * ----------------------------------------
 * animation slide-in-blurred-left
 * ----------------------------------------
 */
@-webkit-keyframes slide-in-blurred-left {
  0% {
    -webkit-transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
            transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    -webkit-transform-origin: 100% 50%;
            transform-origin: 100% 50%;
    -webkit-filter: blur(40px);
            filter: blur(40px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0) scaleY(1) scaleX(1);
            transform: translateX(0) scaleY(1) scaleX(1);
    -webkit-transform-origin: 50% 50%;
            transform-origin: 50% 50%;
    -webkit-filter: blur(0);
            filter: blur(0);
    opacity: 1;
  }
}
@keyframes slide-in-blurred-left {
  0% {
    -webkit-transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
            transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    -webkit-transform-origin: 100% 50%;
            transform-origin: 100% 50%;
    -webkit-filter: blur(40px);
            filter: blur(40px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0) scaleY(1) scaleX(1);
            transform: translateX(0) scaleY(1) scaleX(1);
    -webkit-transform-origin: 50% 50%;
            transform-origin: 50% 50%;
    -webkit-filter: blur(0);
            filter: blur(0);
    opacity: 1;
  }
}
.slide-right-leave-active {
	-webkit-animation: slide-in-blurred-left 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) reverse both;
	        animation: slide-in-blurred-left 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) reverse both;
}
.slide-left-enter-active {
	-webkit-animation: slide-in-blurred-left 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) both;
	        animation: slide-in-blurred-left 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) both;
}
/* ----------------------------------------------
 * Generated by Animista on 2026-4-30 0:4:3
 * Licensed under FreeBSD License.
 * See http://animista.net/license for more info. 
 * w: http://animista.net, t: @cssanimista
 * ---------------------------------------------- */

/**
 * ----------------------------------------
 * animation slide-in-blurred-right
 * ----------------------------------------
 */
@-webkit-keyframes slide-in-blurred-right {
  0% {
    -webkit-transform: translateX(1000px) scaleX(2.5) scaleY(0.2);
            transform: translateX(1000px) scaleX(2.5) scaleY(0.2);
    -webkit-transform-origin: 0% 50%;
            transform-origin: 0% 50%;
    -webkit-filter: blur(40px);
            filter: blur(40px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0) scaleY(1) scaleX(1);
            transform: translateX(0) scaleY(1) scaleX(1);
    -webkit-transform-origin: 50% 50%;
            transform-origin: 50% 50%;
    -webkit-filter: blur(0);
            filter: blur(0);
    opacity: 1;
  }
}
@keyframes slide-in-blurred-right {
  0% {
    -webkit-transform: translateX(1000px) scaleX(2.5) scaleY(0.2);
            transform: translateX(1000px) scaleX(2.5) scaleY(0.2);
    -webkit-transform-origin: 0% 50%;
            transform-origin: 0% 50%;
    -webkit-filter: blur(40px);
            filter: blur(40px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0) scaleY(1) scaleX(1);
            transform: translateX(0) scaleY(1) scaleX(1);
    -webkit-transform-origin: 50% 50%;
            transform-origin: 50% 50%;
    -webkit-filter: blur(0);
            filter: blur(0);
    opacity: 1;
  }
}
.slide-right-enter-active {
	-webkit-animation: slide-in-blurred-right 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) both;
	        animation: slide-in-blurred-right 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) both;
}
.slide-left-leave-active {
	-webkit-animation: slide-in-blurred-right 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) reverse both;
	        animation: slide-in-blurred-right 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) reverse both;
}
</style>