<template>
  <div class="diagnostic-page">
    <!-- Alert 提示框 -->
    <Alert
      v-if="alert.visible"
      :type="alert.type"
      :message="alert.message"
      :duration="alert.duration"
      @close="alert.visible = false"
    />
    
    <h2>🔍 Electron API 诊断</h2>
    
    <div class="section">
      <h3>1. 环境检测</h3>
      <p><strong>window.electronAPI:</strong> {{ isElectronAPIAvailable ? '✅ 已定义' : '❌ 未定义' }}</p>
      <p><strong>window.electronAPI.selectFolder:</strong> {{ hasSelectFolder ? '✅ 可用' : '❌ 不可用' }}</p>
    </div>
    
    <div class="section">
      <h3>2. 测试选择文件夹</h3>
      <button @click="testSelectFolder" :disabled="!hasSelectFolder">
        测试选择文件夹
      </button>
      <div v-if="testResult" class="result">
        <pre>{{ testResult }}</pre>
      </div>
    </div>
    
    <div class="section">
      <h3>3. 所有可用的 API 方法</h3>
      <ul v-if="electronAPIMethods.length > 0">
        <li v-for="(item, index) in electronAPIMethods" :key="index">
          {{ item.key }}: {{ item.type }}
        </li>
      </ul>
      <p v-else>electronAPI 未定义</p>
    </div>
    
    <div class="section">
      <h3>4. 调试信息</h3>
      <p>请在浏览器控制台查看详细日志</p>
      <button @click="showConsoleLogs">显示控制台日志说明</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import Alert from '@/components/Alert.vue'

// Alert 状态管理
const alert = reactive({
  visible: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info',
  message: '',
  duration: 5000
})

// 显示提示消息
const showAlert = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration: number = 5000
) => {
  alert.message = message
  alert.type = type
  alert.duration = duration
  alert.visible = true
}

const testResult = ref<string>('')

const isElectronAPIAvailable = computed(() => typeof window !== 'undefined' && !!window.electronAPI)
const hasSelectFolder = computed(() => typeof window !== 'undefined' && !!window.electronAPI?.selectFolder)
const electronAPIMethods = computed(() => {
  if (typeof window === 'undefined' || !window.electronAPI) return []
  return Object.entries(window.electronAPI).map(([key, value]) => ({ key, type: typeof value }))
})

const testSelectFolder = async () => {
  try {
    console.log('[Diagnostic] Testing selectFolder...')
    
    if (typeof window === 'undefined' || !window.electronAPI) {
      testResult.value = '❌ window.electronAPI is undefined'
      return
    }
    
    if (!window.electronAPI.selectFolder) {
      testResult.value = '❌ window.electronAPI.selectFolder is undefined'
      return
    }
    
    const result = await window.electronAPI.selectFolder()
    testResult.value = `✅ 成功！\n选择的目录: ${result || '用户取消了选择'}`
  } catch (error: any) {
    console.error('[Diagnostic] Error:', error)
    testResult.value = `❌ 错误: ${error.message}`
  }
}

const showConsoleLogs = () => {
  showAlert(`请在浏览器控制台（F12）中查看以下日志：

1. [Preload] Script loaded - Preload脚本已加载
2. [Preload] Exposing electronAPI to window - 正在暴露API
3. [Preload] Done - Preload脚本执行完成
4. [SettingPage] window.electronAPI - SettingPage组件中的API状态

如果看不到这些日志，说明preload脚本没有正确加载。`, 'info', 8000)
}
</script>

<style scoped>
.diagnostic-page {
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
}

.section {
  background: #2a2a2a;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
}

h2 {
  color: #fff;
  margin-bottom: 30px;
}

h3 {
  color: #667eea;
  margin-bottom: 15px;
}

button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result {
  margin-top: 15px;
  padding: 15px;
  background: #1a1a1a;
  border-radius: 4px;
  white-space: pre-wrap;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 8px;
  background: #1a1a1a;
  margin: 5px 0;
  border-radius: 4px;
}
</style>
