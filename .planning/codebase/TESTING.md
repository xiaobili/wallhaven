# 测试文档

> 最后更新: 2026-05-06

## 概述

本文档描述 Wallhaven 壁纸浏览器的测试策略、框架配置和测试实践。

---

## 测试框架

### 技术栈

| 工具 | 版本 | 用途 |
|------|------|------|
| **Vitest** | ^4.1.4 | 单元测试框架 |
| **@vue/test-utils** | ^2.4.6 | Vue 组件测试工具 |
| **jsdom** | ^29.0.2 | DOM 模拟环境 |

### 配置文件

```typescript
// vitest.config.ts
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
```

---

## 测试结构

### 目录组织

```
src/
└── __tests__/
    └── App.spec.ts      # App 组件测试
```

**注意**: 当前测试覆盖率较低，仅有 1 个测试文件。

### 测试文件命名

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 单元测试 | `{filename}.spec.ts` | `wallpaper.service.spec.ts` |
| 组件测试 | `{ComponentName}.spec.ts` | `WallpaperCard.spec.ts` |
| 集成测试 | `{feature}.integration.spec.ts` | `download.integration.spec.ts` |

---

## 测试类型

### 1. 单元测试

**测试服务层逻辑**:
```typescript
// wallpaper.service.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { wallpaperService } from '@/services/wallpaper.service'

describe('WallpaperService', () => {
  describe('search', () => {
    it('should return cached result if available', async () => {
      // Arrange
      const params = { q: 'nature', page: 1 }

      // Act
      const result = await wallpaperService.search(params)

      // Assert
      expect(result.success).toBe(true)
    })

    it('should handle API errors gracefully', async () => {
      // ...
    })
  })
})
```

### 2. 组件测试

**测试 Vue 组件**:
```typescript
// WallpaperCard.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WallpaperCard from '@/components/WallpaperCard.vue'

describe('WallpaperCard', () => {
  it('should render wallpaper info', () => {
    const wallpaper = {
      id: '123',
      url: 'https://example.com/wallpaper.jpg',
      resolution: '1920x1080'
    }

    const wrapper = mount(WallpaperCard, {
      props: { wallpaper }
    })

    expect(wrapper.text()).toContain('1920x1080')
  })

  it('should emit select event on click', async () => {
    const wrapper = mount(WallpaperCard, {
      props: { wallpaper: mockWallpaper, selectable: true }
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
  })
})
```

### 3. 集成测试

**测试 IPC 通信**:
```typescript
// download.integration.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Download Flow', () => {
  it('should complete download workflow', async () => {
    // 1. 开始下载
    const startResult = await window.electronAPI.startDownloadTask({
      taskId: 'test-1',
      url: 'https://example.com/image.jpg',
      filename: 'image.jpg',
      saveDir: '/tmp'
    })
    expect(startResult.success).toBe(true)

    // 2. 监听进度
    const progressPromise = new Promise(resolve => {
      window.electronAPI.onDownloadProgress(data => {
        if (data.state === 'completed') {
          resolve(data)
        }
      })
    })

    // 3. 等待完成
    const finalProgress = await progressPromise
    expect(finalProgress.progress).toBe(100)
  })
})
```

---

## Mock 策略

### Mock IPC 客户端

```typescript
// __mocks__/ipc.ts
import { vi } from 'vitest'

export const mockElectronAPI = {
  favoritesGetCollections: vi.fn(),
  favoritesAdd: vi.fn(),
  startDownloadTask: vi.fn(),
  onDownloadProgress: vi.fn(),
}

global.window = {
  electronAPI: mockElectronAPI
} as any
```

### Mock API 响应

```typescript
// __mocks__/api.ts
import { vi } from 'vitest'

export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
}

vi.mock('@/clients/api.client', () => ({
  apiClient: mockApiClient
}))
```

### Mock 文件系统

```typescript
// __mocks__/fs.ts
import { vi } from 'vitest'

export const mockFs = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}

vi.mock('node:fs', () => mockFs)
```

---

## 测试工具

### Vue Test Utils

```typescript
import { mount, flushPromises } from '@vue/test-utils'

// 挂载组件
const wrapper = mount(Component, {
  props: { /* ... */ },
  global: {
    plugins: [pinia],
    mocks: { $router: mockRouter }
  }
})

// 等待异步操作
await flushPromises()

// 访问组件实例
const vm = wrapper.vm

// 检查渲染内容
expect(wrapper.find('.wallpaper-card').exists()).toBe(true)
```

### Vitest 工具

```typescript
import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'

// 创建 spy
const spy = vi.fn()

// 模拟实现
vi.mock('@/services/wallpaper.service', () => ({
  wallpaperService: {
    search: vi.fn().mockResolvedValue({ success: true, data: mockData })
  }
}))

// 定时器控制
vi.useFakeTimers()
vi.advanceTimersByTime(1000)
vi.useRealTimers()
```

---

## 测试覆盖率

### 当前状态

| 层级 | 覆盖率 | 状态 |
|------|--------|------|
| Views | 0% | ❌ 未覆盖 |
| Composables | 0% | ❌ 未覆盖 |
| Services | 0% | ❌ 未覆盖 |
| Repositories | 0% | ❌ 未覆盖 |
| Clients | 0% | ❌ 未覆盖 |
| Handlers | 0% | ❌ 未覆盖 |

### 目标覆盖率

| 层级 | 目标覆盖率 | 优先级 |
|------|------------|--------|
| Services | 80% | 高 |
| Composables | 70% | 高 |
| Handlers | 70% | 中 |
| Repositories | 60% | 中 |
| Clients | 50% | 低 |
| Views | 40% | 低 |

---

## 测试最佳实践

### 1. AAA 模式

```typescript
it('should search wallpapers', async () => {
  // Arrange (准备)
  const params = { q: 'nature', page: 1 }
  const mockResponse = { data: [mockWallpaper] }
  vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

  // Act (执行)
  const result = await wallpaperService.search(params)

  // Assert (断言)
  expect(result.success).toBe(true)
  expect(result.data?.data).toHaveLength(1)
})
```

### 2. 描述性测试名称

```typescript
// ✅ 推荐
it('should return cached result when cache is valid', () => {})

// ❌ 避免
it('test cache', () => {})
```

### 3. 隔离测试

```typescript
describe('WallpaperService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wallpaperService.clearCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('...', () => {})
})
```

### 4. 测试边界条件

```typescript
describe('download', () => {
  it('should handle empty URL', async () => {
    const result = await downloadService.start({ url: '' })
    expect(result.success).toBe(false)
  })

  it('should handle network timeout', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('timeout'))
    const result = await downloadService.start(params)
    expect(result.error?.code).toBe('NETWORK_TIMEOUT')
  })
})
```

---

## 运行测试

### NPM Scripts

```json
{
  "test:unit": "vitest",
  "test:coverage": "vitest --coverage"
}
```

### 命令行选项

```bash
# 运行所有测试
npm run test:unit

# 运行特定文件
npm run test:unit wallpaper.service.spec.ts

# 监听模式
npm run test:unit -- --watch

# 生成覆盖率报告
npm run test:coverage
```

---

## 待补充的测试

### 高优先级

1. **wallpaper.service.spec.ts**
   - 搜索功能
   - 缓存逻辑
   - 错误处理

2. **favorites.service.spec.ts**
   - 收藏操作
   - 收藏夹管理
   - 状态同步

3. **download.handler.spec.ts**
   - 下载流程
   - 断点续传
   - 重试机制

### 中优先级

4. **useWallpaperList.spec.ts**
   - 列表状态管理
   - 分页逻辑

5. **useFavorites.spec.ts**
   - 收藏状态
   - UI 交互

6. **api.client.spec.ts**
   - 请求构造
   - 响应处理

---

## E2E 测试 (未实现)

### 建议

使用 Playwright 或 Cypress 进行 E2E 测试：

```typescript
// e2e/download.spec.ts
import { test, expect } from '@playwright/test'

test('download workflow', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="wallpaper-card"]')
  await page.click('[data-testid="download-button"]')

  await expect(page.locator('[data-testid="download-progress"]')).toBeVisible()
  await expect(page.locator('[data-testid="download-complete"]')).toBeVisible({ timeout: 30000 })
})
```
