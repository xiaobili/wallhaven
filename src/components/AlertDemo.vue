<template>
  <div class="alert-demo">
    <h2>Alert 提示框组件演示</h2>
    
    <section class="demo-section">
      <h3>基本用法</h3>
      <div class="demo-buttons">
        <button @click="showSuccess" class="button green">显示成功提示</button>
        <button @click="showError" class="button red">显示错误提示</button>
        <button @click="showWarning" class="button orange">显示警告提示</button>
        <button @click="showInfo" class="button">显示信息提示</button>
      </div>
    </section>

    <section class="demo-section">
      <h3>自动关闭（3秒）</h3>
      <div class="demo-buttons">
        <button @click="showAutoClose" class="button">显示自动关闭提示</button>
      </div>
    </section>

    <section class="demo-section">
      <h3>不可关闭</h3>
      <div class="demo-buttons">
        <button @click="showNotClosable" class="button">显示不可关闭提示</button>
      </div>
    </section>

    <!-- Alert 提示框 -->
    <Alert
      v-if="alerts.success"
      type="success"
      message="操作成功！数据已保存。"
      :closable="alerts.success.closable"
      :duration="alerts.success.duration"
      @close="alerts.success.visible = false"
    />

    <Alert
      v-if="alerts.error"
      type="error"
      message="发生错误！请检查网络连接后重试。"
      :closable="alerts.error.closable"
      :duration="alerts.error.duration"
      @close="alerts.error.visible = false"
    />

    <Alert
      v-if="alerts.warning"
      type="warning"
      message="警告：此操作不可撤销，请谨慎操作！"
      :closable="alerts.warning.closable"
      :duration="alerts.warning.duration"
      @close="alerts.warning.visible = false"
    />

    <Alert
      v-if="alerts.info"
      type="info"
      message="提示：系统将在5分钟后进行维护。"
      :closable="alerts.info.closable"
      :duration="alerts.info.duration"
      @close="alerts.info.visible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import Alert from './Alert.vue'

interface AlertState {
  visible: boolean
  closable: boolean
  duration: number
}

const alerts = reactive<{
  success: AlertState
  error: AlertState
  warning: AlertState
  info: AlertState
}>({
  success: { visible: false, closable: true, duration: 0 },
  error: { visible: false, closable: true, duration: 0 },
  warning: { visible: false, closable: true, duration: 0 },
  info: { visible: false, closable: true, duration: 0 }
})

const showSuccess = () => {
  alerts.success.visible = true
  alerts.success.closable = true
  alerts.success.duration = 0
}

const showError = () => {
  alerts.error.visible = true
  alerts.error.closable = true
  alerts.error.duration = 0
}

const showWarning = () => {
  alerts.warning.visible = true
  alerts.warning.closable = true
  alerts.warning.duration = 0
}

const showInfo = () => {
  alerts.info.visible = true
  alerts.info.closable = true
  alerts.info.duration = 0
}

const showAutoClose = () => {
  alerts.info.visible = true
  alerts.info.closable = true
  alerts.info.duration = 3000 // 3秒后自动关闭
}

const showNotClosable = () => {
  alerts.warning.visible = true
  alerts.warning.closable = false
  alerts.warning.duration = 0
}
</script>

<style scoped>
@import '@/static/css/list.css';

.alert-demo {
  padding: 2em;
  max-width: 800px;
  margin: 0 auto;
}

.alert-demo h2 {
  text-align: center;
  font-size: 2em;
  margin: 1.5em 0 1em;
  color: #8cc;
  border-bottom: 1px dotted #333;
  padding-bottom: 0.5em;
}

.demo-section {
  margin: 2em 0;
  padding: 1.5em;
  background: rgba(40, 40, 40, 0.5);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.demo-section h3 {
  margin-top: 0;
  margin-bottom: 1em;
  color: #85aaaf;
  font-size: 1.2em;
}

.demo-buttons {
  display: flex;
  gap: 1em;
  flex-wrap: wrap;
}

.demo-buttons .button {
  margin: 0;
}
</style>
