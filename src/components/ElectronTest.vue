<template>
  <div class="electron-test">
    <h2>Electron 集成测试</h2>
    <div class="test-section">
      <h3>发送消息到主进程</h3>
      <button @click="sendMessage">发送消息</button>
      <p v-if="response">响应: {{ response }}</p>
    </div>
    
    <div class="test-section">
      <h3>应用信息</h3>
      <button @click="getAppVersion">获取应用版本</button>
      <p v-if="appVersion">版本: {{ appVersion }}</p>
    </div>
    
    <div class="test-section">
      <h3>打开外部链接</h3>
      <button @click="openExternal">打开 Wallhaven</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const response = ref('')
const appVersion = ref('')

// 发送消息到主进程
const sendMessage = () => {
  if (window.electronAPI) {
    window.electronAPI.send('toMain', { message: 'Hello from Vue!' })
    
    // 监听回复
    window.electronAPI.receive('fromMain', (data: any) => {
      response.value = data.message
      console.log('收到主进程回复:', data)
    })
  } else {
    console.warn('electronAPI 不可用 - 可能在浏览器环境中运行')
  }
}

// 获取应用版本
const getAppVersion = async () => {
  if (window.electronAPI) {
    try {
      // 注意：这需要你在主进程中注册 'get-app-version' handler
      const version = await (window as any).electron.invoke('get-app-version')
      appVersion.value = version
    } catch (error) {
      console.error('获取版本失败:', error)
    }
  }
}

// 打开外部链接
const openExternal = () => {
  if (window.electronAPI) {
    ;(window as any).electron.invoke('open-external', 'https://wallhaven.cc')
  }
}
</script>

<style scoped>
.electron-test {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.test-section {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.test-section h3 {
  margin-top: 0;
  color: #333;
}

button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background-color: #45a049;
}

p {
  margin-top: 10px;
  color: #666;
}
</style>
