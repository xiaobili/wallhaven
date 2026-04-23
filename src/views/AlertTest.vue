<template>
  <div class="alert-test-page">
    <PageHeader title="Alert 组件测试" />
    
    <div class="test-container">
      <!-- Alert 显示区域（放在最前面，确保悬浮在最上层） -->
      <transition-group name="alert-list">
        <Alert
          v-for="alert in activeAlerts"
          :key="alert.id"
          :type="alert.type"
          :message="alert.message"
          :closable="alert.closable"
          :duration="alert.duration"
          :position="alert.position"
          @close="removeAlert(alert.id)"
        />
      </transition-group>

      <!-- 控制按钮区域 -->
      <section class="control-panel">
        <h3>触发不同类型的提示</h3>
        <div class="button-group">
          <button @click="triggerSuccess" class="button green">
            <i class="fas fa-check-circle"></i> 成功提示
          </button>
          <button @click="triggerError" class="button red">
            <i class="fas fa-times-circle"></i> 错误提示
          </button>
          <button @click="triggerWarning" class="button orange">
            <i class="fas fa-exclamation-triangle"></i> 警告提示
          </button>
          <button @click="triggerInfo" class="button">
            <i class="fas fa-info-circle"></i> 信息提示
          </button>
        </div>
      </section>

      <section class="control-panel">
        <h3>位置测试</h3>
        <div class="button-group">
          <button @click="triggerPosition('top-center')" class="button">
            顶部居中
          </button>
          <button @click="triggerPosition('top-right')" class="button">
            顶部右侧
          </button>
          <button @click="triggerPosition('top-left')" class="button">
            顶部左侧
          </button>
          <button @click="triggerPosition('bottom-center')" class="button">
            底部居中
          </button>
          <button @click="triggerPosition('bottom-right')" class="button">
            底部右侧
          </button>
          <button @click="triggerPosition('bottom-left')" class="button">
            底部左侧
          </button>
        </div>
      </section>

      <section class="control-panel">
        <h3>特殊场景测试</h3>
        <div class="button-group">
          <button @click="triggerAutoClose" class="button">
            自动关闭 (3秒)
          </button>
          <button @click="triggerNotClosable" class="button">
            不可关闭
          </button>
          <button @click="triggerMultiple" class="button">
            连续触发
          </button>
          <button @click="clearAll" class="button restore-button">
            清除所有
          </button>
        </div>
      </section>

      <!-- 模拟内容区域（用于测试悬浮效果） -->
      <section class="content-simulation">
        <h3>模拟页面内容</h3>
        <p>这是一些模拟的页面内容，用于测试 Alert 组件是否正确地悬浮在所有内容之上。</p>
        <div class="dummy-content">
          <div v-for="i in 10" :key="i" class="dummy-item">
            内容项 {{ i }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import Alert from '@/components/Alert.vue'

interface ActiveAlert {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  closable: boolean
  duration: number
  position: 'top-center' | 'top-right' | 'top-left' | 'bottom-center' | 'bottom-right' | 'bottom-left'
}

const activeAlerts = ref<ActiveAlert[]>([])
let alertIdCounter = 0

const addAlert = (
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  closable: boolean = true,
  duration: number = 0,
  position: ActiveAlert['position'] = 'top-center'
) => {
  const id = ++alertIdCounter
  activeAlerts.value.push({
    id,
    type,
    message,
    closable,
    duration,
    position
  })
}

const removeAlert = (id: number) => {
  const index = activeAlerts.value.findIndex(a => a.id === id)
  if (index > -1) {
    activeAlerts.value.splice(index, 1)
  }
}

const triggerSuccess = () => {
  addAlert('success', '✅ 操作成功！数据已保存到数据库。', true, 0, 'top-center')
}

const triggerError = () => {
  addAlert('error', '❌ 发生错误！无法连接到服务器，请检查网络设置。', true, 0, 'top-right')
}

const triggerWarning = () => {
  addAlert('warning', '⚠️ 警告：此操作将删除所有数据，且不可恢复！', true, 0, 'top-left')
}

const triggerInfo = () => {
  addAlert('info', 'ℹ️ 系统提示：新版本 v2.0.0 已发布，建议更新。', true, 0, 'bottom-center')
}

const triggerPosition = (position: ActiveAlert['position']) => {
  const positionNames = {
    'top-center': '顶部居中',
    'top-right': '顶部右侧',
    'top-left': '顶部左侧',
    'bottom-center': '底部居中',
    'bottom-right': '底部右侧',
    'bottom-left': '底部左侧'
  }
  addAlert('info', `📍 这是${positionNames[position]}位置的提示`, true, 3000, position)
}

const triggerAutoClose = () => {
  addAlert('info', '⏱️ 这条消息将在3秒后自动消失...', true, 3000, 'bottom-right')
}

const triggerNotClosable = () => {
  addAlert('warning', '🔒 这是一条重要通知，必须手动确认后才能关闭（模拟）。', false, 0, 'top-center')
  
  // 5秒后自动移除，模拟用户确认
  setTimeout(() => {
    const lastAlert = activeAlerts.value[activeAlerts.value.length - 1]
    if (lastAlert && !lastAlert.closable) {
      removeAlert(lastAlert.id)
    }
  }, 5000)
}

const triggerMultiple = () => {
  triggerSuccess()
  setTimeout(() => triggerWarning(), 300)
  setTimeout(() => triggerInfo(), 600)
}

const clearAll = () => {
  activeAlerts.value = []
}
</script>

<style scoped>
@import '@/static/css/list.css';

.alert-test-page {
  padding: 2em;
  max-width: 1000px;
  margin: 0 auto;
}

.test-container {
  margin-top: 2em;
}

.control-panel {
  background: rgba(40, 40, 40, 0.6);
  border-radius: 4px;
  padding: 1.5em;
  margin-bottom: 1.5em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.control-panel h3 {
  margin-top: 0;
  margin-bottom: 1em;
  color: #85aaaf;
  font-size: 1.2em;
  border-bottom: 1px dotted #444;
  padding-bottom: 0.5em;
}

.button-group {
  display: flex;
  gap: 1em;
  flex-wrap: wrap;
}

.button-group .button {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
}

.content-simulation {
  background: rgba(30, 30, 30, 0.4);
  border-radius: 4px;
  padding: 1.5em;
  margin-top: 2em;
  border: 1px dashed #444;
}

.content-simulation h3 {
  margin-top: 0;
  margin-bottom: 1em;
  color: #85aaaf;
}

.dummy-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1em;
  margin-top: 1em;
}

.dummy-item {
  background: rgba(50, 50, 50, 0.6);
  padding: 1em;
  border-radius: 3px;
  text-align: center;
  color: #999;
}

/* 列表动画 */
.alert-list-enter-active,
.alert-list-leave-active {
  transition: all 0.3s ease;
}

.alert-list-enter-from {
  opacity: 0;
}

.alert-list-leave-to {
  opacity: 0;
}

.alert-list-move {
  transition: transform 0.3s ease;
}
</style>
