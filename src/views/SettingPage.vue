<template>
  <div class="settings-page">
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
import { useWallpaperStore } from '@/stores/wallpaper'
import type { WallpaperFit } from '@/types'

// Pinia Store
const wallpaperStore = useWallpaperStore()
const settings = wallpaperStore.settings

// 注意：设置已在应用启动时通过 main.ts 自动加载，无需在此处再次加载

// 方法
const browseDownloadPath = async (): Promise<void> => {
  // TODO: 调用 Electron API 打开文件夹选择对话框
  console.log('打开文件夹选择对话框')
  // 示例：通过 IPC 调用主进程
  // const path = await window.electron.selectFolder()
  // if (path) {
  //   settings.downloadPath = path
  // }
}

const saveSettings = (): void => {
  // 验证设置
  if (settings.maxConcurrentDownloads < 1 || settings.maxConcurrentDownloads > 10) {
    alert('多线程下载数量必须在 1-10 之间')
    return
  }
  
  // 保存设置到 store 和 localStorage
  wallpaperStore.updateSettings({ ...settings })
  
  // 显示成功提示
  console.log('设置已保存')
  // TODO: 使用 Toast 组件显示提示
  // showToast('设置已保存', 'success')
}

const resetSettings = (): void => {
  if (confirm('确定要恢复默认设置吗？')) {
    // 重置为默认值
    wallpaperStore.updateSettings({
      downloadPath: '',
      maxConcurrentDownloads: 3,
      apiKey: '',
      wallpaperFit: 'fill',
    })
  }
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
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ddd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
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
