# Testing

## Test Framework

- **Framework**: Vitest v4.1.4
- **Configuration**: `vitest.config.ts`
- **Test utilities**: `@vue/test-utils` v2.4.6
- **Environment**: jsdom v29.0.2

### Configuration

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

### TypeScript Configuration for Tests
```json
// tsconfig.vitest.json
{
  "extends": "./tsconfig.app.json",
  "include": ["src/**/__tests__/*", "env.d.ts"],
  "exclude": [],
  "compilerOptions": {
    "lib": [],
    "types": ["node", "jsdom"]
  }
}
```

---

## Test Organization

### Location
- Test files are located in `src/__tests__/` directory
- Tests are **co-located** with source code using the `__tests__` folder pattern

### Naming Convention
- Test files use `.spec.ts` suffix (e.g., `App.spec.ts`)
- The codebase currently uses `.spec.ts` rather than `.test.ts`

### Current Test Coverage

| Area | Test Files | Status |
|------|-----------|--------|
| App.vue | `src/__tests__/App.spec.ts` | ✅ Minimal |
| Components | None | ❌ Not covered |
| Stores | None | ❌ Not covered |
| Services | None | ❌ Not covered |
| Utils | None | ❌ Not covered |
| Views | None | ❌ Not covered |

---

## Test Types

### Unit Tests
**What's tested**:
- Basic component mounting (`App.vue`)

**Current test example**:

```typescript
// src/__tests__/App.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../App.vue'

// Create test router instance
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/online', component: { template: '<div>Online</div>' } },
    { path: '/switch', component: { template: '<div>Switch</div>' } },
    { path: '/download', component: { template: '<div>Download</div>' } },
    { path: '/setting', component: { template: '<div>Setting</div>' } },
  ],
})

describe('App', () => {
  it('mounts renders properly', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })
    
    // Wait for router initialization
    await router.isReady()
    
    expect(wrapper.exists()).toBe(true)
  })
})
```

### Integration Tests
- **Status**: Not implemented
- **Potential areas**: Store + Component interactions, Router navigation

### E2E Tests
- **Status**: Not implemented
- **Note**: E2E folder is excluded in vitest config (`e2e/**`)

---

## Test Patterns

### Component Testing Pattern
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ComponentName from '@/components/ComponentName.vue'

describe('ComponentName', () => {
  it('should render correctly', () => {
    const wrapper = mount(ComponentName, {
      props: {
        // props here
      },
      global: {
        plugins: [/* global plugins like router, pinia */],
      },
    })
    
    expect(wrapper.exists()).toBe(true)
  })
  
  it('should handle user interaction', async () => {
    const wrapper = mount(ComponentName)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### Store Testing Pattern (Recommended)
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWallpaperStore } from '@/stores/wallpaper'

describe('Wallpaper Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should have initial state', () => {
    const store = useWallpaperStore()
    
    expect(store.loading).toBe(false)
    expect(store.error).toBe(false)
  })
  
  it('should fetch wallpapers', async () => {
    const store = useWallpaperStore()
    
    await store.fetchWallpapers({ page: 1 })
    
    expect(store.totalPageData.sections.length).toBeGreaterThan(0)
  })
})
```

---

## Coverage

### Areas Covered
- ✅ Basic App.vue mounting test

### Areas Not Covered
- ❌ **Components**: `WallpaperList.vue`, `SearchBar.vue`, `ImagePreview.vue`, `Alert.vue`, etc.
- ❌ **Stores**: `useWallpaperStore`, `useDownloadStore`
- ❌ **Services**: `wallpaperApi.ts`
- ❌ **Utils**: `helpers.ts`, `store.ts`
- ❌ **Views**: `OnlineWallpaper.vue`, `SettingPage.vue`, etc.
- ❌ **Router**: Navigation and route guards
- ❌ **Electron IPC**: Main process handlers

---

## Running Tests

```bash
# Run unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit -- --watch

# Run tests with coverage
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- src/__tests__/App.spec.ts
```

---

## Mock Patterns

### How APIs Are Mocked
Currently not implemented. Recommended approach:

```typescript
import { vi } from 'vitest'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ data: mockData }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))
```

### How Stores Are Mocked
Currently not implemented. Recommended approach:

```typescript
import { vi } from 'vitest'
import { useWallpaperStore } from '@/stores/wallpaper'

vi.mock('@/stores/wallpaper', () => ({
  useWallpaperStore: vi.fn(() => ({
    loading: false,
    error: false,
    totalPageData: { sections: [], totalPage: 0, currentPage: 0 },
    fetchWallpapers: vi.fn(),
  })),
}))
```

### How Electron APIs Are Mocked
Currently not implemented. Recommended approach:

```typescript
// __mocks__/electron.ts
export const mockElectronAPI = {
  selectFolder: vi.fn().mockResolvedValue('/mock/path'),
  storeGet: vi.fn().mockResolvedValue({ success: true, value: null }),
  storeSet: vi.fn().mockResolvedValue({ success: true }),
  downloadWallpaper: vi.fn().mockResolvedValue({ 
    success: true, 
    filePath: '/mock/path/wallpaper.jpg' 
  }),
  setWallpaper: vi.fn().mockResolvedValue({ success: true }),
  onDownloadProgress: vi.fn(),
}

// In test setup
vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
})
```

### Pinia Store Testing Setup
```typescript
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})
```

### Vue Router Testing Setup
```typescript
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
  ],
})

const wrapper = mount(Component, {
  global: {
    plugins: [router],
  },
})

await router.isReady()
```

---

## Testing Recommendations

### Priority Areas for Testing

1. **Utils** (`src/utils/helpers.ts`)
   - Pure functions, easy to test
   - High value: `formatFileSize`, `formatResolution`, `debounce`, `throttle`

2. **Stores** (`src/stores/`)
   - Test state management logic
   - Test action functions

3. **Services** (`src/services/wallpaperApi.ts`)
   - Mock axios and test API calls
   - Test cache functionality

4. **Components**
   - Start with reusable components: `Alert.vue`, `LoadingOverlay.vue`
   - Then test complex components: `SearchBar.vue`, `WallpaperList.vue`

### Test File Structure Recommendation
```
src/
├── __tests__/
│   ├── App.spec.ts           # Existing
│   ├── components/
│   │   ├── Alert.spec.ts
│   │   ├── WallpaperList.spec.ts
│   │   └── SearchBar.spec.ts
│   ├── stores/
│   │   ├── wallpaper.spec.ts
│   │   └── download.spec.ts
│   ├── services/
│   │   └── wallpaperApi.spec.ts
│   └── utils/
│       └── helpers.spec.ts
```

---

## Test Utilities

### Installed Packages
```json
{
  "devDependencies": {
    "@vue/test-utils": "^2.4.6",
    "vitest": "^4.1.4",
    "jsdom": "^29.0.2",
    "@types/jsdom": "^28.0.1"
  }
}
```

### Common Assertions
```typescript
// Component exists
expect(wrapper.exists()).toBe(true)

// Element is visible
expect(wrapper.find('.element').isVisible()).toBe(true)

// Props are passed correctly
expect(wrapper.props('propName')).toBe('value')

// Events are emitted
expect(wrapper.emitted('event-name')).toBeTruthy()
expect(wrapper.emitted('event-name')[0]).toEqual([payload])

// Text content
expect(wrapper.text()).toContain('expected text')

// DOM structure
expect(wrapper.find('.class').exists()).toBe(true)
```

### Async Testing
```typescript
import { flushPromises } from '@vue/test-utils'

it('should handle async operation', async () => {
  const wrapper = mount(Component)
  
  await wrapper.find('button').trigger('click')
  await flushPromises()
  
  expect(wrapper.find('.result').exists()).toBe(true)
})
```
