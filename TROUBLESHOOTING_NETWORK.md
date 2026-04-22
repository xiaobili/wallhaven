# 网络异常问题排查指南

## 问题描述
运行 `npm run dev` 后，在线壁纸页面显示"网络异常"错误。

## 已完成的修复

### 1. ✅ 添加API代理配置
已在 `electron.vite.config.ts` 中添加代理配置：

```typescript
server: {
  cors: true,
  proxy: {
    '/api': {
      target: 'https://wallhaven.cc/api/v1',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

### 2. ✅ 增强错误日志
在 `wallpaperApi.ts` 中添加了详细的请求/响应日志和错误处理。

### 3. ✅ 友好的错误提示
在 `OnlineWallpaper.vue` 中添加了用户友好的错误提示界面和重试功能。

### 4. ✅ API测试工具
创建了 `/api-test` 页面用于诊断API连接问题。

## 排查步骤

### 第一步：重启开发服务器（重要！）

修改配置文件后**必须重启**开发服务器：

```bash
# 停止当前运行的服务（Ctrl+C）
# 然后重新启动
npm run dev
```

### 第二步：访问API测试页面

在浏览器中访问：`http://localhost:5173/api-test`

点击"测试连接"按钮，查看测试结果。

### 第三步：检查浏览器控制台

按 `F12` 打开开发者工具，查看：

1. **Console 标签** - 查看错误日志
   - 应该看到 `[API Request]` 和 `[API Response]` 日志
   - 如果有 `[API Response Error]`，查看详细错误信息

2. **Network 标签** - 查看网络请求
   - 找到 `/api/search` 请求
   - 检查状态码（应该是 200）
   - 检查请求URL是否正确

### 第四步：常见问题及解决方案

#### 问题1：代理未生效

**症状：**
- 控制台显示 `ERR_NETWORK` 错误
- Network 标签中看到请求失败

**解决：**
1. 确认已重启开发服务器
2. 检查 `electron.vite.config.ts` 中的代理配置
3. 尝试清除缓存并硬刷新（Ctrl+Shift+R 或 Cmd+Shift+R）

#### 问题2：CORS 错误

**症状：**
- 控制台显示 CORS 相关错误

**解决：**
代理配置应该已经解决了这个问题。如果仍有问题，确认：
```typescript
server: {
  cors: true,  // 确保这个配置存在
  proxy: { ... }
}
```

#### 问题3：API Key 问题

**症状：**
- 返回 401 或 403 错误
- 只能获取少量结果

**解决：**
1. 访问 https://wallhaven.cc/settings/account
2. 生成 API Key
3. 在应用的"设置"页面配置 API Key

#### 问题4：网络连接问题

**症状：**
- 所有网络请求都失败
- 其他网站也无法访问

**解决：**
1. 检查网络连接
2. 检查防火墙设置
3. 如果使用代理，确认代理配置正确

#### 问题5：Electron 安全问题

**症状：**
- 在 Electron 窗口中请求被阻止

**解决：**
检查 `electron/main/index.ts` 中的安全配置：
```typescript
webPreferences: {
  sandbox: false,
  contextIsolation: true,
  nodeIntegration: false
}
```

### 第五步：手动测试

在浏览器控制台中运行以下命令测试：

```javascript
// 测试1：直接访问代理
fetch('/api/search?q=nature&page=1')
  .then(r => r.json())
  .then(d => console.log('成功:', d))
  .catch(e => console.error('失败:', e))

// 测试2：检查环境变量
console.log('Base URL:', import.meta.env.BASE_URL)
```

### 第六步：检查配置文件

确认以下文件配置正确：

1. **electron.vite.config.ts**
   ```typescript
   renderer: {
     server: {
       cors: true,
       proxy: {
         '/api': {
           target: 'https://wallhaven.cc/api/v1',
           changeOrigin: true,
           rewrite: (path) => path.replace(/^\/api/, ''),
         },
       },
     },
   }
   ```

2. **wallpaperApi.ts**
   ```typescript
   const apiClient = axios.create({
     baseURL: '/api',  // 确保是 /api
     timeout: 15000,
   })
   ```

## 调试技巧

### 1. 启用详细日志

在 `wallpaperApi.ts` 中已经添加了日志，你会看到：
```
[API Request] GET /api/search { q: 'nature', page: 1 }
[API Response] /api/search 200
```

### 2. 使用 Axios 拦截器

可以临时添加更详细的日志：

```typescript
// 在 wallpaperApi.ts 的请求拦截器中
apiClient.interceptors.request.use((config) => {
  console.log('=== 完整请求配置 ===')
  console.log('URL:', config.baseURL + config.url)
  console.log('Params:', config.params)
  console.log('Headers:', config.headers)
  return config
})
```

### 3. 检查 Vite 服务器

运行 `npm run dev` 后，应该看到：
```
dev server running for the electron renderer process at:
  ➜  Local:   http://localhost:5173/
```

如果没有看到这个，说明 Vite 服务器启动失败。

## 快速验证清单

- [ ] 已重启开发服务器
- [ ] electron.vite.config.ts 包含代理配置
- [ ] wallpaperApi.ts 的 baseURL 是 `/api`
- [ ] 浏览器控制台没有 CORS 错误
- [ ] Network 标签中 `/api/search` 请求返回 200
- [ ] 可以访问 https://wallhaven.cc/api/v1/search?q=nature（直接在浏览器）

## 仍然有问题？

如果以上步骤都无法解决问题，请提供：

1. 浏览器控制台的完整错误信息
2. Network 标签中失败请求的详细信息
3. API 测试页面的测试结果
4. `npm run dev` 的完整输出

## 临时解决方案

如果代理配置一直有问题，可以临时直接使用完整URL：

```typescript
// 在 wallpaperApi.ts 中临时修改
const apiClient = axios.create({
  baseURL: 'https://wallhaven.cc/api/v1',  // 直接使用完整URL
  timeout: 15000,
})
```

**注意：** 这只适用于开发环境，生产环境应该使用代理。
