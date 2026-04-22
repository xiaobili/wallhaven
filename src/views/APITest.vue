<template>
  <div class="api-test-container">
    <h2>🔧 API 连接测试</h2>
    
    <div class="test-section">
      <h3>1. 检查代理配置</h3>
      <p>当前环境: {{ isElectron ? 'Electron' : 'Browser' }}</p>
      <p>API Base URL: /api (应该被代理到 https://wallhaven.cc/api/v1)</p>
    </div>

    <div class="test-section">
      <h3>2. 测试 API 连接</h3>
      <button @click="testApiConnection" :disabled="testing">
        {{ testing ? '测试中...' : '测试连接' }}
      </button>
      
      <div v-if="testResult" class="result" :class="testResult.success ? 'success' : 'error'">
        <p><strong>状态:</strong> {{ testResult.success ? '✅ 成功' : '❌ 失败' }}</p>
        <p v-if="testResult.message"><strong>消息:</strong> {{ testResult.message }}</p>
        <p v-if="testResult.data"><strong>返回数据:</strong></p>
        <pre v-if="testResult.data">{{ JSON.stringify(testResult.data, null, 2) }}</pre>
        <p v-if="testResult.error"><strong>错误:</strong> {{ testResult.error }}</p>
      </div>
    </div>

    <div class="test-section">
      <h3>3. 常见问题排查</h3>
      <ul>
        <li>✅ 确认 electron.vite.config.ts 中配置了代理</li>
        <li>✅ 确认已重启开发服务器（修改配置后需要重启）</li>
        <li>✅ 检查浏览器控制台的网络请求（F12 -> Network）</li>
        <li>✅ 检查是否有 CORS 错误</li>
        <li>⚠️ 如果需要使用 NSFW，需要配置 API Key</li>
      </ul>
    </div>

    <div class="test-section">
      <h3>4. 手动测试命令</h3>
      <p>在浏览器控制台中运行：</p>
      <code>
        fetch('/api/search?q=nature')<br/>
        &nbsp;&nbsp;.then(r => r.json())<br/>
        &nbsp;&nbsp;.then(d => console.log(d))<br/>
        &nbsp;&nbsp;.catch(e => console.error(e))
      </code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

const isElectron = ref(typeof window !== 'undefined' && (window as any).electronAPI !== undefined)
const testing = ref(false)
const testResult = ref<{
  success: boolean
  message?: string
  data?: any
  error?: string
} | null>(null)

const testApiConnection = async () => {
  testing.value = true
  testResult.value = null
  
  try {
    console.log('[API Test] 开始测试连接...')
    const response = await axios.get('/api/search', {
      params: {
        q: 'nature',
        page: 1,
        limit: 1
      }
    })
    
    console.log('[API Test] 响应成功:', response)
    testResult.value = {
      success: true,
      message: 'API 连接正常',
      data: response.data
    }
  } catch (error: any) {
    console.error('[API Test] 连接失败:', error)
    testResult.value = {
      success: false,
      message: 'API 连接失败',
      error: error.message || String(error)
    }
    
    // 提供更详细的错误信息
    if (error.code === 'ERR_NETWORK') {
      testResult.value.error += '\n\n可能原因：\n1. 代理配置未生效（需要重启开发服务器）\n2. 网络连接问题\n3. 防火墙阻止'
    } else if (error.response?.status === 401) {
      testResult.value.error += '\n\n可能原因：API Key 无效或缺失'
    } else if (error.response?.status === 403) {
      testResult.value.error += '\n\n可能原因：访问被拒绝'
    }
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.api-test-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 30px;
  background: #1a1a1a;
  border-radius: 12px;
  color: #ddd;
}

h2 {
  color: #fff;
  margin-bottom: 30px;
  text-align: center;
}

h3 {
  color: #667eea;
  margin-bottom: 15px;
  font-size: 18px;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 8px;
}

.test-section p {
  margin: 8px 0;
  line-height: 1.6;
}

.test-section ul {
  margin: 15px 0;
  padding-left: 25px;
}

.test-section li {
  margin: 10px 0;
  line-height: 1.6;
}

button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result {
  margin-top: 20px;
  padding: 15px;
  border-radius: 6px;
}

.result.success {
  background: rgba(72, 187, 120, 0.1);
  border: 1px solid #48bb78;
}

.result.error {
  background: rgba(245, 101, 101, 0.1);
  border: 1px solid #f56565;
}

.result pre {
  background: #1a1a1a;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  margin-top: 10px;
}

code {
  display: block;
  background: #1a1a1a;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}
</style>
