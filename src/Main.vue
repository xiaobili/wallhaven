<template>
  <div class="left-menu">
    <img class="logo-wrap" src="./static/icons/logo.png"/>
    <div class="version-wrap">{{ version }}</div>
    <div class="menu-wrap">
      <label class="menu-title">我的壁纸</label>
      <ul class="menu-ul">
        <li class="menu-item">
          <router-link to="/online" class="menu-native">
            <i class="fas fa-cloud"></i>
            在线壁纸<span class="li-border"/>
          </router-link>
        </li>
        <li class="menu-item">
          <router-link to="/switch" class="menu-native">
            <i class="fas fa-folder"></i>
            本地列表<span class="li-border"/>
          </router-link>
        </li>
        <li class="menu-item">
          <router-link to="download" class="menu-native">
            <i class="fas fa-inbox-in"></i>
            下载中心<span class="li-border"/>
          </router-link>
        </li>
      </ul>
      <label class="menu-title more">更多</label>
      <ul class="menu-ul">
        <li class="menu-item">
          <router-link to="setting" class="menu-native">
            <i class="fas fa-cog"></i>
            设置<span class="li-border"/>
          </router-link>
        </li>
      </ul>
    </div>
  </div>
  <div class="container" :style="{width: calContainerW + 'px'}">
    <!-- 使用 KeepAlive 缓存路由组件，避免重复渲染 -->
    <router-view v-slot="{ Component, route }">
      <KeepAlive :include="['OnlineWallpaper', 'LocalWallpaper', 'DownloadWallpaper']">
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import pkg from '../package.json'

// App版本
const version = pkg.version

// 客户端宽度
const clientWidth = ref<number>(700)

// 计算容器宽度
const calContainerW = computed(() => {
  const width = clientWidth.value - 200
  return width < 800 ? 800 : width
})

// 窗口大小变化处理（使用防抖）
let resizeTimer: number | null = null
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    if (document.documentElement.clientWidth !== undefined) {
      clientWidth.value = document.documentElement.clientWidth
    }
  }, 150) // 150ms 防抖
}

// 组件挂载时
onMounted(() => {
  clientWidth.value = document.documentElement.clientWidth
  window.addEventListener('resize', handleResize)
})

// 组件卸载时
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})
</script>

<style scoped>

a:link,
a:visited {
  /*去掉a标签链接的下划线的效果*/
  text-decoration: none;
}

.logo-wrap {
  margin: 10px 0 2px 0;
  padding: 0 8px 0 8px;
  width: 95%;
}

.version-wrap {
  text-align: center;
  margin-bottom: 30px;
}

.update-process-container {
  padding-top: 5px;
  z-index: 999;
  width: 100%;
  bottom: 0;
  position: fixed;
  background: rgba(96, 96, 96, 0.87);
  -moz-box-shadow: 0 -3px 9px #070805;
  -webkit-box-shadow: 0 -3px 9px #070805;
  box-shadow: 0 -3px 9px #070805;
}

.bg-container {
  position: fixed;
  top: 0;
  left: 0;
  min-height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #0c0e29;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: left top;
  z-index: -1;
  transition: background 0.8s;
}


.bg-container:before {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: -2;
  backdrop-filter: blur(20px);
}


.left-menu a,
.left-menu label {
  font-size: 1.1rem;
}

.left-menu {
  z-index: 998;
  position: fixed;
  color: #fff;
  float: left;
  width: 180px;
  height: 100%;
  /*background-color: rgba(39, 42, 44, .75);*/
  /*background-image: linear-gradient(to right, #292c2f 0, rgba(34, 34, 34, .5) 100%);*/
  box-shadow: 0 0 0 1px #222, 5px 0px 5px rgb(0 0 0 / 50%);
}

.menu-title {
  display: block;
}

.more {
  margin-top: 100px;
}

.menu-wrap {
  text-align: left;
  padding: 0 23px;
}

.menu-ul {
  list-style-type: none;
  padding-top: 5px;
  padding-left: 25px;
}

.menu-item {
  margin-top: 20px;
  color: #c6c6c6;
}

.menu-item > i {
  margin-right: 5px;
}

.menu-native {
  display: inline-block;
  color: #c6c6c6;
  min-width: 60px;
}

.menu-native:hover {
  color: #fff;
}

.menu-native.router-link-active {
  color: #fff;
}

.li-border {
  padding: 0;
  margin: 3px 0 0 0;
  display: block;
  border-radius: 3px;
  background: transparent;
  width: 100%;
  height: 2px;
}

.menu-native:hover > .li-border {
  background: linear-gradient(to right, rgba(2, 108, 209, 255), 50%, rgba(35, 196, 214, 255));
}

.menu-native.router-link-active > .li-border {
  background: linear-gradient(to right, rgba(2, 108, 209, 255), 50%, rgba(35, 196, 214, 255));
}

.container {
  /* padding-top: 50px; */
  margin-left: 180px;
  /*float: left;*/
}
</style>