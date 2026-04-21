<template>
  <div class="download-center">
    <div class="dowloading">
      <div class="m-title">
        <a class="dowloading-title">下载中</a>
      </div>
      <div class="dowload-list" v-show="downloadList.length > 0">
        <div
          class="dowload-item"
          v-for="(item, i) in downloadList"
          :key="item.url"
          :class="item.state === 'paused' ? 'pause-item' : ''"
        >
          <div class="img-view">
            <img class="img-context" :src="item.small" />
          </div>
          <div class="down-content">
            <div class="img-info">
              <div class="rigth-top">
                <div
                  class="op-pause"
                  v-show="item.state === 'downloading'"
                  @click="onPauseDownload(item.url)"
                >
                  <i class="fas fw fa-pause-circle"></i>
                </div>
                <div
                  class="op-resume"
                  v-show="item.state === 'paused'"
                  @click="onResumeDownload(item)"
                >
                  <i class="fas fw fa-play-circle"></i>
                </div>
                <div class="op-cancel" @click="onCancelDownload(i)">
                  <i class="fas fw fa-times-circle"></i>
                </div>
              </div>
              <div class="img-resolution">尺寸：{{ formatResolution(item.resolution) }}</div>
              <div class="file-size">图片大小：{{ formatFileSize(item.size) }}</div>
              <div class="rigth-bottoim">
                <div class="dowload-speed" v-show="item.state === 'downloading'">
                  下载速度：{{ formatSpeed(item.speed) }}
                </div>
                <div class="dowload-state" v-show="item.state === 'waiting'">等待中</div>
                <div class="dowload-state" v-show="item.state === 'paused'">已暂停</div>
                <div class="dowloaded-size">已下载：{{ formatFileSize(item.offset) }}</div>
              </div>
              <div class="dowloaded-process">
                <div class="dowloaded-process-block" :style="{ width: item.progress + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-list" v-if="downloadList.length <= 0">没有正在下载中的任务~</div>
    </div>
    <div class="dowloaded">
      <div class="m-title">
        <a class="dowload-title">已完成</a
        ><a style="font-size: 10px">（重启后只保留最后20条记录）</a>
      </div>
      <div class="dowload-list">
        <div class="dowload-item" v-for="(item, i) in downloadFinishedList" :key="item.url">
          <div class="img-view">
            <img class="img-context" :src="item.small" />
          </div>
          <div class="down-content">
            <div class="img-info">
              <div class="op-del" @click="delRecorder(i)">
                <i class="fas fw fa-trash"></i>
              </div>
              <div class="op-open" @click="showInFolder(item.path)">
                <i class="fas fw fa-folder-open"></i>
              </div>
              <div class="dowload-date">{{ formatTime(item.time) }}</div>
              <div class="downloaded-info">
                <div class="img-resolution">尺寸：{{ formatResolution(item.resolution) }}</div>
                <div class="file-size">图片大小：{{ formatFileSize(item.size) }}</div>
              </div>
              <div class="img-info"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-list" v-if="downloadFinishedList.length <= 0">没有完成的任务~</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { DownloadItem, FinishedDownloadItem } from '../types'
import { formatFileSize, formatResolution, formatSpeed, formatTime } from '@/utils/helpers'

// 标题
const title = ref<string>('下载中心')

// 下载列表
const downloadList = ref<DownloadItem[]>([])
const downloadFinishedList = ref<FinishedDownloadItem[]>([])

// 定时器引用
let updateDataTimer: ReturnType<typeof setTimeout> | null = null

// 取消下载
const onCancelDownload = (index: number) => {
  // TODO: 调用实际的取消下载API
  console.log('取消下载:', index)
}

// 暂停下载
const onPauseDownload = (url: string) => {
  // TODO: 调用实际的暂停下载API
  console.log('暂停下载:', url)
}

// 恢复下载
const onResumeDownload = (item: DownloadItem) => {
  // TODO: 调用实际的恢复下载API
  console.log('恢复下载:', item.url)
}

// 删除完成记录
const delRecorder = (index: number) => {
  // TODO: 调用实际的删除完成记录API
  console.log('删除完成记录:', index)
}

// 在文件夹中显示
const showInFolder = (path: string) => {
  // TODO: 调用实际的显示文件夹API
  console.log('在文件夹中显示:', path)
}

// 显示消息
const showMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
  // TODO: 使用实际的消息组件
  console.log(`[${type}] ${message}`)
}

// 加载数据
const loadData = () => {
  // TODO: 调用实际的加载数据API
  console.log('加载数据')
}

// 生命周期钩子
onMounted(() => {
  loadData()
})

onUnmounted(() => {
  if (updateDataTimer != null) {
    clearTimeout(updateDataTimer)
  }
})
</script>

<style scoped>
.empty-list {
  width: 100%;
  padding: 20px 0;
  text-align: center;
  color: rgb(173, 173, 173);
}

.download-center {
  width: 100%;
  position: relative;
  padding: 50px 20px 0;
  min-width: 800px;
}

.m-title {
  font-size: 18px;
  text-align: left;
  padding: 5px 8px;
  margin: 5px 0 10px 0;
}

.dowload-list {
  margin-left: 25px;
}

.dowload-item {
  margin-bottom: 20px;
  position: relative;
  border-radius: 3px;
  display: flex;
  padding: 10px 8px 5px 8px;
  background-color: #2a2b2ca1;
}

.dowload-item > .img-view {
  margin-left: 3px;
}

.dowload-date {
  bottom: 30px;
}

.downloaded-info {
  bottom: 0px;
}

.downloaded-info > div {
  display: inline-block;
}

.down-content {
  padding: 5px 10px;
  flex: 1;
}

.img-info {
  height: 100%;
  position: relative;
}

.img-info > div {
  font-size: 14px;
  padding-bottom: 5px;
  color: rgb(173, 173, 173);
  position: absolute;
}

.img-info > .img-resolution {
  bottom: 20px;
  margin-bottom: 20px;
}

.file-size {
  bottom: 10px;
}

.downloaded-info > .file-size {
  margin-left: 10px;
}

.dowload-speed,
.dowload-state,
.op-pause,
.op-resume {
  margin-right: 10px;
}

.op-pause i:hover,
.op-resume i:hover,
.op-cancel i:hover {
  font-size: 15px;
}

.dowloaded-process {
  width: 100%;
  position: absolute;
  border-radius: 5px;
  bottom: 0px;
  height: 6px;
  background-color: #fff;
}

.dowloaded-process-block {
  width: 100%;
  height: 6px;
  border-radius: 6px;
  background: linear-gradient(to right, rgba(35, 196, 214, 255), 50%, rgba(2, 108, 209, 255));
}

.pause-item .dowloaded-process-block {
  background: linear-gradient(to right, rgba(230, 160, 60, 255), 50%, rgba(230, 160, 60, 255));
}

.dowload-item .img-view .img-context {
  box-shadow: none;
  width: 120px;
  height: 80px;
  border-radius: 3px;
}

.rigth-top {
  top: 0px;
  right: 0px;
}

.rigth-bottoim {
  bottom: 10px;
  right: 0px;
}

.rigth-bottoim > div {
  display: inline-block;
}

.rigth-top > div {
  display: inline-block;
}

.op-del {
  right: 0;
  top: 25px;
}

.op-open {
  right: 30px;
  top: 25px;
}

.op-open i,
.op-del i {
  font-size: 18px;
}

.op-open i:hover {
  color: #006d19;
}

.op-del i:hover {
  color: #fafafa;
}
</style>
