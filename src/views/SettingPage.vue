<template>
  <div class="settings-page">
    <!-- Alert 提示框 -->
    <Alert
      v-if="alert.visible"
      :type="alert.type"
      :message="alert.message"
      :duration="alert.duration"
      @close="hideAlert"
    />

    <h2>应用设置</h2>
    <!-- 下载设置 -->
    <section class="settings-section">
      <h3><i class="fas fa-download"></i> 下载设置</h3>

      <div class="setting-item">
        <label for="download-path">下载目录</label>
        <div class="oneline">
          <input
            type="text"
            id="download-path"
            v-model="settings.downloadPath"
            placeholder="选择壁纸下载目录"
            readonly
          />
          <button class="button" @click="browseDownloadPath">
            <i class="fas fa-folder-open"></i> 浏览
          </button>
        </div>
        <p class="setting-hint">设置壁纸文件的默认保存位置</p>
      </div>

      <div class="setting-item">
        <label for="max-concurrent">多线程下载数量: {{ settings.maxConcurrentDownloads }}</label>
        <div class="framed">
          <input
            type="range"
            id="max-concurrent"
            v-model.number="settings.maxConcurrentDownloads"
            min="1"
            max="10"
            step="1"
            class="slider-input"
          />
        </div>
        <p class="setting-hint">同时下载的壁纸数量（1-10）</p>
      </div>
    </section>

    <!-- API 设置 -->
    <section class="settings-section">
      <h3><i class="fas fa-key"></i> Wallhaven API 设置</h3>

      <div class="setting-item">
        <label for="api-key">API Key</label>
        <input
          type="password"
          id="api-key"
          v-model="settings.apiKey"
          placeholder="输入您的 Wallhaven API Key"
        />
        <p class="setting-hint">
          API Key 用于访问 NSFW 内容。您可以在
          <a href="https://wallhaven.cc/settings/account" target="_blank">Wallhaven 账户设置</a>
          中获取。
        </p>
      </div>
    </section>

    <!-- 桌面设置 -->
    <section class="settings-section">
      <h3><i class="fas fa-desktop"></i> 系统桌面设置</h3>

      <div class="setting-item">
        <label for="wallpaper-fit">壁纸适配模式</label>
        <div class="framed">
          <select id="wallpaper-fit" v-model="settings.wallpaperFit">
            <option value="fill">填充 (Fill)</option>
            <option value="fit">适应 (Fit)</option>
            <option value="stretch">拉伸 (Stretch)</option>
            <option value="tile">平铺 (Tile)</option>
            <option value="center">居中 (Center)</option>
            <option value="span">跨屏 (Span)</option>
          </select>
        </div>
        <p class="setting-hint">设置壁纸在桌面上的显示方式</p>
      </div>

      <div class="setting-preview">
        <p class="preview-label">预览效果：</p>
        <div class="fit-preview" :class="'fit-' + settings.wallpaperFit">
          <div class="preview-screen">
            <div class="preview-wallpaper"></div>
          </div>
          <span class="fit-description">{{ getFitDescription(settings.wallpaperFit) }}</span>
        </div>
      </div>
    </section>

    <!-- 缓存管理 -->
    <section class="settings-section">
      <h3><i class="fas fa-broom"></i> 缓存管理</h3>

      <div class="setting-item">
        <label>应用缓存</label>
        <p class="setting-hint" style="margin-bottom: 1em;">
          清理应用产生的缓存数据，包括缩略图、临时文件和应用存储数据。<br>
          注意：清理后缩略图会在下次访问时重新生成，不会影响已下载的壁纸文件。
        </p>

        <div class="cache-info" v-if="cacheInfo">
          <div class="cache-stat">
            <span class="stat-label">缩略图数量:</span>
            <span class="stat-value">{{ cacheInfo.thumbnailsCount || 0 }}</span>
          </div>
          <div class="cache-stat">
            <span class="stat-label">临时文件数量:</span>
            <span class="stat-value">{{ cacheInfo.tempFilesCount || 0 }}</span>
          </div>
        </div>

        <button class="button warning-button" @click="clearCache" :disabled="isClearing">
          <i class="fas" :class="isClearing ? 'fa-spinner fa-spin' : 'fa-trash-alt'"></i>
          {{ isClearing ? '清理中...' : '清空缓存' }}
        </button>
      </div>
    </section>

    <!-- 操作按钮 -->
    <div class="settings-actions">
      <button class="button restore-button" @click="resetSettings">
        <i class="fas fa-undo"></i> 恢复默认
      </button>
      <button class="button green" @click="saveSettings">
        <i class="fas fa-save"></i> 保存设置
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, toRaw, ref } from 'vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import { useSettings, useAlert } from '@/composables'
import { settingsService } from '@/services'
import type { WallpaperFit } from '@/types'
import Alert from '@/components/Alert.vue'

// Pinia Store
const wallpaperStore = useWallpaperStore()
const settings = wallpaperStore.settings

// Composables
const { update: updateSettings, reset: resetSettingsComposable } = useSettings()
const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()

// 缓存信息
const cacheInfo = reactive({
  thumbnailsCount: 0,
  tempFilesCount: 0
})

// 清理状态
const isClearing = ref(false)

// 方法
const browseDownloadPath = async (): Promise<void> => {
  try {
    const response = await settingsService.selectFolder()

    if (!response.success) {
      showError('选择文件夹失败: ' + (response.error?.message || '未知错误'))
      return
    }

    const selectedPath = response.data
    console.log('[SettingPage] Selected path:', selectedPath)

    if (selectedPath) {
      settings.downloadPath = selectedPath
      // 自动保存设置到 electron-store
      await updateSettings({ downloadPath: selectedPath })
    }
  } catch (error: any) {
    console.error('选择文件夹失败:', error)
    showError('选择文件夹失败: ' + error.message)
  }
}

const saveSettings = async (): Promise<void> => {
  // 验证设置
  if (settings.maxConcurrentDownloads < 1 || settings.maxConcurrentDownloads > 10) {
    showWarning('多线程下载数量必须在 1-10 之间')
    return
  }

  try {
    // 将 reactive 对象转换为普通对象，避免 IPC 克隆错误
    const plainSettings = toRaw(settings)

    // 保存设置到 electron-store
    await updateSettings(plainSettings)

    console.log('[SettingPage] 设置已保存到 electron-store')

    showSuccess('设置已保存')
  } catch (error: any) {
    console.error('保存设置错误:', error)
    showError('保存设置失败: ' + error.message)
  }
}

const resetSettings = async (): Promise<void> => {
  const confirmed = window.confirm('确定要恢复默认设置吗？')
  if (!confirmed) {
    return
  }

  // 重置为默认值（普通对象）
  const defaultSettings = {
    downloadPath: '',
    maxConcurrentDownloads: 3,
    apiKey: '',
    wallpaperFit: 'fill' as WallpaperFit,
  }

  await updateSettings(defaultSettings)

  // 同时更新本地显示
  Object.assign(settings, defaultSettings)

  showSuccess('已恢复默认设置')
}

const getFitDescription = (fit: WallpaperFit): string => {
  const descriptions: Record<WallpaperFit, string> = {
    fill: '填充整个屏幕，可能会裁剪图片',
    fit: '保持比例适应屏幕，可能会有黑边',
    stretch: '拉伸以填满屏幕，可能会变形',
    tile: '平铺重复显示',
    center: '居中显示，保持原始大小',
    span: '跨多个显示器显示（多屏适用）',
  }
  return descriptions[fit]
}

const clearCache = async (): Promise<void> => {
  const confirmed = window.confirm(
    '确定要清空应用缓存吗？\n\n' +
    '这将删除：\n' +
    '• 缩略图缓存（下次访问时会重新生成）\n' +
    '• 下载临时文件\n' +
    '• 应用存储数据（设置将被重置）\n\n' +
    '注意：不会删除已下载的壁纸文件。'
  )

  if (!confirmed) {
    return
  }

  isClearing.value = true

  try {
    // 1. 清空缩略图和临时文件缓存
    const cacheResult = await settingsService.clearAppCache(settings.downloadPath || undefined)

    if (!cacheResult.success) {
      throw new Error(cacheResult.error?.message || '清理缓存失败')
    }

    // 2. 清空 Store 数据
    const storeResult = await settingsService.clearStore()

    if (!storeResult.success) {
      console.warn('[SettingPage] Store clear failed:', storeResult.error?.message)
    }

    // 3. 重置本地设置状态
    const defaultSettings = {
      downloadPath: '',
      maxConcurrentDownloads: 3,
      apiKey: '',
      wallpaperFit: 'fill' as WallpaperFit,
    }
    Object.assign(settings, defaultSettings)

    // 4. 更新缓存信息
    cacheInfo.thumbnailsCount = 0
    cacheInfo.tempFilesCount = 0

    // 5. 显示成功消息
    const details = []
    if (cacheResult.data?.thumbnailsDeleted && cacheResult.data.thumbnailsDeleted > 0) {
      details.push(`${cacheResult.data.thumbnailsDeleted} 个缩略图`)
    }
    if (cacheResult.data?.tempFilesDeleted && cacheResult.data.tempFilesDeleted > 0) {
      details.push(`${cacheResult.data.tempFilesDeleted} 个临时文件`)
    }

    const message = details.length > 0
      ? `缓存已清空\n已删除：${details.join('、')}`
      : '缓存已清空'

    showSuccess(message, 5000)
  } catch (error: any) {
    console.error('[SettingPage] Clear cache error:', error)
    showError('清空缓存失败: ' + error.message)
  } finally {
    isClearing.value = false
  }
}

const fetchCacheInfo = async (): Promise<void> => {
  try {
    const result = await settingsService.getCacheInfo(settings.downloadPath || undefined)

    if (result.success && result.data) {
      cacheInfo.thumbnailsCount = result.data.thumbnailsCount
      cacheInfo.tempFilesCount = result.data.tempFilesCount
    }
  } catch (error: any) {
    console.error('获取缓存信息失败:', error)
    // 静默失败，不影响页面显示
  }
}

// 初始化获取缓存信息
fetchCacheInfo()

</script>

<style scoped>

.settings-page {
  max-width: 900px;
  margin: 2em auto;
  padding: 0 2em;
}

.settings-page h2 {
  text-align: center;
  font-size: 2em;
  margin: 1.5em 0 1em;
  color: #8cc;
  border-style: dotted;
  border-color: #333;
  border-width: 0 0 1px 0;
}

.settings-section {
  background-color: #1a1a1a;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, .33);
  border-radius: 3px;
  margin: 1.5em auto;
  padding: 1.5em;
}

.settings-section h3 {
  font-weight: 700;
  margin: 1.5em 0 1em;
  padding: .25em;
  color: #8cc;
  border-style: dotted;
  border-color: #333;
  border-width: 0 0 1px 0;
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.settings-section h3 i {
  font-size: 1.1em;
}

.setting-item {
  margin-bottom: 2em;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  display: block;
  font-weight: 600;
  color: #85aaaf;
  margin-bottom: 0.75em;
  font-size: 1.05em;
}

.setting-item input[type="text"],
.setting-item input[type="password"] {
  padding: .5em;
  width: 100%;
  background-color: #313131;
  border-radius: 2px;
  box-shadow: inset 0 0 .75em rgba(255, 255, 255, .03), 0 2px 0 #222, 0 3px 4px -3px #000, 0 1px 2px rgba(0, 0, 0, .2);
  color: #ddd;
  cursor: text;
}

.setting-item input[type="text"]:focus,
.setting-item input[type="password"]:focus {
  background-color: #4d4d4d;
}

.setting-item input[readonly] {
  cursor: default;
  opacity: 0.8;
}

.oneline {
  display: flex;
  position: relative;
  min-height: 2.3em;
  margin: .5em 0;
  white-space: nowrap;
  overflow: visible;
  align-items: center;
  gap: 0.5em;
}

.oneline > input {
  flex: 1 1 auto;
  height: 2.3em;
  line-height: 2.3em;
  margin: 0;
  min-width: 0;
}

.oneline > .button {
  height: 2.3em;
  line-height: normal;
  margin: 0;
  padding: 0.3em 1.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  min-width: fit-content;
  flex-shrink: 0;
}

.framed {
  position: relative;
  display: flex;
  padding: 3px;
  margin: .33em 0;
  height: auto;
  white-space: nowrap;
  border-radius: 3px;
  background-color: rgba(30, 30, 30, .5);
  box-shadow: inset 1px 1px 1px rgba(0, 0, 0, .4), 1px 1px 0 rgba(127, 127, 127, .1);
}

.framed select {
  padding: .5em 2.5em .5em .5em;
  width: 100%;
  background-color: #313131;
  border-radius: 2px;
  box-shadow: inset 0 0 .75em rgba(255, 255, 255, .03), 0 2px 0 #222, 0 3px 4px -3px #000, 0 1px 2px rgba(0, 0, 0, .2);
  color: #ddd;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ddd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3E%3c/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7em center;
  background-size: 1em;
  font-size: 1em;
  line-height: 1.5;
}

.framed select:focus {
  background-color: #4d4d4d;
  outline: none;
}

.framed select option {
  background-color: #313131;
  color: #ddd;
  padding: 0.5em;
}

.framed select option:hover,
.framed select option:checked {
  background-color: #4d4d4d;
  color: #fff;
}

.slider-input {
  width: 100%;
  -webkit-appearance: none;
  height: 6px;
  background: #313131;
  border-radius: 3px;
  outline: none;
  box-shadow: inset 0 0 .75em rgba(255, 255, 255, .03), 0 2px 0 #222;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(to bottom, #275660 0, #183640 100%);
  border-radius: 3px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, .3);
  transition-property: color, background, text-shadow, box-shadow, border-color;
  transition-duration: .25s;
}

.slider-input::-webkit-slider-thumb:hover {
  background-position: 0 0;
}

.setting-hint {
  margin-top: 0.5em;
  font-size: 0.9em;
  color: #999;
  line-height: 1.5;
}

.setting-hint a {
  color: #0cd;
  cursor: pointer;
}

.setting-hint a:active,
.setting-hint a:focus,
.setting-hint a:hover {
  text-shadow: 0 0 2px rgba(220, 255, 255, .3);
}

.setting-preview {
  margin-top: 1.5em;
  padding: 1.5em;
  background-color: #222;
  border-radius: 3px;
  box-shadow: inset 1px 1px 1px rgba(0, 0, 0, .4), 1px 1px 0 rgba(127, 127, 127, .1);
}

.preview-label {
  font-weight: 600;
  color: #85aaaf;
  margin-bottom: 1em;
}

.fit-preview {
  text-align: center;
}

.preview-screen {
  width: 100%;
  max-width: 400px;
  height: 225px;
  margin: 0 auto 1em;
  background-color: #111;
  border: 2px solid #444;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, .33);
}

.preview-wallpaper {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-image:
    repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px),
    repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px);
}

/* 不同适配模式的预览效果 */
.fit-fill .preview-wallpaper {
  background-size: cover;
  background-position: center;
}

.fit-fit .preview-wallpaper {
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.fit-stretch .preview-wallpaper {
  background-size: 100% 100%;
}

.fit-tile .preview-wallpaper {
  background-size: 100px 100px;
  background-repeat: repeat;
}

.fit-center .preview-wallpaper {
  background-size: auto;
  background-position: center;
  background-repeat: no-repeat;
}

.fit-span .preview-wallpaper {
  background-size: cover;
  background-position: center;
}

.fit-description {
  display: block;
  font-size: 0.9em;
  color: #aaa;
  font-style: italic;
}

/* 缓存信息样式 */
.cache-info {
  background-color: rgba(30, 30, 30, .5);
  border-radius: 3px;
  padding: 1em;
  margin-bottom: 1em;
  box-shadow: inset 1px 1px 1px rgba(0, 0, 0, .4), 1px 1px 0 rgba(127, 127, 127, .1);
}

.cache-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 0;
  border-bottom: 1px solid rgba(127, 127, 127, .1);
}

.cache-stat:last-child {
  border-bottom: none;
}

.stat-label {
  color: #85aaaf;
  font-size: 0.95em;
}

.stat-value {
  color: #ddd;
  font-weight: 600;
  font-size: 1.1em;
}

.warning-button {
  background: linear-gradient(to bottom, #c0392b 0, #a93226 100%);
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition-property: color, background, text-shadow, box-shadow, border-color;
  transition-duration: .25s;
  box-shadow: 0 2px 0 #8b2a1f, 0 3px 4px -3px #000, 0 1px 2px rgba(0, 0, 0, .2);
  padding: 0.5em 1.2em;
  font-size: 1em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
}

.warning-button:hover:not(:disabled) {
  background-position: 0 -2.5em;
}

.warning-button:active:not(:disabled) {
  box-shadow: 0 1px 0 #8b2a1f, 0 1px 2px rgba(0, 0, 0, .2);
  transform: translateY(1px);
}

.warning-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.warning-button i {
  font-size: 1em;
}

.settings-actions {
  text-align: center;
  margin-top: 2em;
  padding-top: 2em;
  border-top: 1px solid #333;
}

.settings-actions .button {
  margin: 0.5em 0.25em;
  padding: 0.5em 1em;
}

.settings-actions .button i {
  margin-right: 0.4em;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-page {
    padding: 0 1em;
  }

  .settings-section {
    padding: 1em;
  }

  .oneline {
    flex-direction: column;
    height: auto;
  }

  .oneline > input,
  .oneline > .button {
    width: 100%;
    margin: 0.25em 0;
  }
}
</style>
