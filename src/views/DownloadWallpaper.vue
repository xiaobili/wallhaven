<template>
  <div class="download-center">
    <!-- Alert 提示框 -->
    <Alert
      v-if="alert.visible"
      :type="alert.type"
      :message="alert.message"
      :duration="alert.duration"
      @close="hideAlert"
    />

    <div class="dowloading">
      <div class="m-title">
        <a class="dowloading-title">下载中</a>
      </div>
      <div class="dowload-list" v-show="downloadList.length > 0">
        <div
          class="dowload-item"
          v-for="(item, i) in downloadList"
          :key="item.id"
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
                  @click="onPauseDownload(item.id)"
                >
                  <i class="fas fw fa-pause-circle"></i>
                </div>
                <div
                  class="op-resume"
                  v-show="item.state === 'paused'"
                  @click="onResumeDownload(item.id)"
                >
                  <i class="fas fw fa-play-circle"></i>
                </div>
                <div class="op-cancel" @click="onCancelDownload(item.id)">
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
        <div class="dowload-item" v-for="(item, i) in downloadFinishedList" :key="item.id">
          <div class="img-view">
            <img class="img-context" :src="item.small" />
          </div>
          <div class="down-content">
            <div class="img-info">
              <div class="op-del" @click="delRecorder(item.id)">
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
import { onMounted, onUnmounted } from 'vue'
import { useDownload, useAlert } from '@/composables'
import { formatFileSize, formatResolution, formatSpeed, formatTime } from '@/utils/helpers'
import Alert from '@/components/Alert.vue'

// Composables
const {
  downloadingList: downloadList,
  finishedList: downloadFinishedList,
  loadHistory,
  removeFinished,
  pauseDownload,
  cancelDownload,
  resumeDownload
} = useDownload()
const { alert, showSuccess, showError, showInfo, showWarning, hideAlert } = useAlert()

// 取消下载 - 使用 composable 提供的方法
const onCancelDownload = async (id: string) => {
  const confirmed = window.confirm('确定要取消这个下载任务吗？')
  if (confirmed) {
    const success = await cancelDownload(id)
    if (success) {
      showInfo('已取消下载')
    }
  }
}

// 暂停下载 - 使用 composable 提供的方法，会发送 IPC 到主进程
const onPauseDownload = async (id: string) => {
  const success = await pauseDownload(id)
  if (success) {
    showInfo('已暂停下载')
  }
}

// 恢复下载 - 使用 composable 提供的方法
const onResumeDownload = (id: string) => {
  resumeDownload(id)
  showInfo('恢复下载...')
}

// 删除完成记录
const delRecorder = async (id: string) => {
  const confirmed = window.confirm('确定要删除这条记录吗？')
  if (confirmed) {
    await removeFinished(id)
    showSuccess('记录已删除')
  }
}

// 在文件夹中显示
const showInFolder = async (path: string) => {
  try {
    // 检查是否在 Electron 环境中且暴露了 API
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // 简单处理：获取最后一个路径分隔符之前的部分
      const sep = path.includes('\\') ? '\\' : '/'
      const dirPath = path.substring(0, path.lastIndexOf(sep))

      const result = await (window as any).electronAPI.openFolder(dirPath)
      if (!result.success) {
        showError('打开文件夹失败: ' + (result.error || ''))
      }
    } else {
      showWarning('请在Electron环境中使用此功能')
      console.log('模拟打开文件夹:', path)
    }
  } catch (error: any) {
    console.error('打开文件夹错误:', error)
    showError('打开文件夹失败')
  }
}

// 生命周期钩子
onMounted(() => {
  // 初始化时从存储加载历史记录
  // loadHistory() handled by composable lifecycle
  console.log('下载中心数据已加载')

  // 注意：下载进度监听器已在 main.ts 中全局注册，无需在此重复注册
})

onUnmounted(() => {
  // 清理监听器（如果需要）
  console.log('[DownloadWallpaper] 组件卸载')
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
