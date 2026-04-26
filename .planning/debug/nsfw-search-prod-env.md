---
status: verified
trigger: "开发环境可以搜索到NSFW内容，生产环境无法搜索到NSFW内容 （同样的设置）"
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: nsfw-search-prod-env

## Symptoms

**Expected Behavior:**
- 勾选 NSFW purity 后应该能搜索到 NSFW 内容

**Actual Behavior:**
- 生产环境搜索无结果返回
- 开发环境正常工作

**Error Messages:**
- 无错误提示

**Timeline:**
- 曾经可以工作，现在不行了

**Reproduction:**
- 简单复现：勾选 purity 设置后搜索即可触发

## Current Focus

hypothesis: ""
test: ""
expecting: ""
next_action: "closed"
reasoning_checkpoint: 修复已完成，等待用户验证

## Evidence

1. **api.client.ts 第 76-80 行** - 生产环境调用缺少 apiKey:
   ```typescript
   const result = await window.electronAPI.wallhavenApiRequest({
     endpoint: url,
     params,
     // ❌ 缺少 apiKey
   })
   ```

2. **api.handler.ts 第 47 行** - 后端支持 apiKey:
   ```typescript
   headers: {
     ...(apiKey ? { 'X-API-Key': apiKey } : {}),
   }
   ```

3. **wallpaperApi.ts 第 105-109 行** - 旧服务正确传递 apiKey:
   ```typescript
   const result = await electronAPI.wallhavenApiRequest({
     endpoint,
     params: params,
     apiKey: apiKey !== '' || apiKey !== null ? apiKey : undefined,
   })
   ```

4. **调用链**:
   - wallpaperService.search() → apiClient.get('/search', params, apiKey) ✅ 传入
   - api.client.ts 生产分支 → wallhavenApiRequest({ endpoint, params }) ❌ 未传出

5. **NSFW 要求**: Wallhaven API 需要 API Key 才能返回 NSFW 内容

## Eliminated

- 环境变量配置问题 - 不适用，apiKey 存储在 settings
- preload 脚本问题 - preload 正确透传参数
- IPC handler 问题 - handler 正确处理 apiKey
- purity 参数传递问题 - purity 参数传递正确

## Resolution

root_cause: "src/clients/api.client.ts 在生产环境分支调用 wallhavenApiRequest 时没有传递 apiKey 参数，导致 Wallhaven API 无法返回 NSFW 内容"

fix: |
  修改了以下文件：

  1. **src/clients/api.client.ts**
     - GET 方法: 添加 apiKey 参数到 wallhavenApiRequest 调用
     - POST 方法: 添加 apiKey 参数到 wallhavenApiRequest 调用

  2. **electron/preload/index.ts**
     - 更新 ElectronAPI 接口，添加 apiKey?: string 到 wallhavenApiRequest 参数
     - 添加日志输出是否提供了 apiKey

  3. **env.d.ts**
     - 更新 ElectronAPI 接口，添加 apiKey?: string 到 wallhavenApiRequest 参数

  4. **src/clients/electron.client.ts**
     - 更新 wallhavenApiRequest 方法参数类型，添加 apiKey?: string

verification: |
  ✅ TypeScript 类型检查通过
  ✅ 构建成功
  🔲 用户测试：打包应用后设置 API Key，勾选 NSFW purity，搜索验证

files_changed:
  - src/clients/api.client.ts
  - electron/preload/index.ts
  - env.d.ts
  - src/clients/electron.client.ts
