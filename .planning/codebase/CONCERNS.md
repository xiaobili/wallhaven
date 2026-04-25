# Technical Concerns

## Security

### API Key Handling
- **How API keys are stored**: API keys are stored in plain text in `electron-store` (see `src/stores/modules/wallpaper/settings-storage.ts`)
  - Settings are persisted to `settings.json` in the Electron userData directory
  - No encryption or obfuscation is applied to the API key
- **Risks**:
  - API key is visible in plain text in the settings file
  - Could be leaked through logs (multiple `console.log` statements print settings)
  - Memory exposure through reactive state
- **Recommendations**:
  - Use `safeStorage` API from Electron to encrypt sensitive data before storing
  - Avoid logging settings objects that contain API keys
  - Consider using environment variables or secure keychain integration

### IPC Security
- **Channel validation**: Partial implementation
  - `send` and `receive` methods validate channels against allowlists (`toMain`, `fromMain`) - see `electron/preload/index.ts:203-213`
  - However, all `ipcRenderer.invoke` calls use hardcoded channel names without validation
  - No channel allowlist for invoke channels
- **Context isolation**: Enabled properly (`contextIsolation: true`, `nodeIntegration: false`) - see `electron/main/index.ts:105-106`
- **Sandbox**: Disabled (`sandbox: false`) - see `electron/main/index.ts:104`
  - This allows Node.js APIs in preload but increases attack surface
- **Risks**:
  - No validation on invoke channels could allow malicious code to call any registered handler
  - Disabled sandbox provides more capabilities than necessary for most operations
- **Recommendations**:
  - Add channel allowlist validation for all IPC methods
  - Consider enabling sandbox if possible
  - Validate all input parameters in IPC handlers

### XSS Risks
- **v-html usage**: Not found - good practice
- **User input handling**:
  - Search queries and parameters are passed through API calls without sanitization
  - File paths from user input are used directly in file operations
  - No DOMPurify or similar sanitization library is used
- **Recommendations**:
  - Add input sanitization for search queries
  - Validate and sanitize file paths before using in filesystem operations

## Performance

### Image Handling
- **Large image lists**: Handled via pagination and lazy loading
  - Uses `loading="lazy"` attribute on images - see `src/components/WallpaperList.vue:28-34`
  - IntersectionObserver implemented for scroll optimization - see `src/components/WallpaperList.vue:103-128`
- **Lazy loading**: Implemented with native lazy loading + IntersectionObserver
  - `rootMargin: '200px'` preloads images before they enter viewport
- **Memory concerns**:
  - API cache limited to 50 items - see `src/services/wallpaperApi.ts:58`
  - Cache TTL of 5 minutes - see `src/services/wallpaperApi.ts:28`
  - **Issue**: No cleanup of cached image data or blob URLs
  - **Issue**: Thumbnail generation stores files on disk without cleanup scheduling
- **Recommendations**:
  - Implement cache eviction strategy for blob URLs
  - Add memory usage monitoring
  - Consider virtual scrolling for very large lists

### Scroll Performance
- **Implementation**: Throttled scroll event handler
  - Uses 300ms throttle interval - see `src/views/OnlineWallpaper.vue:354`
  - Passive event listener enabled - see `src/views/OnlineWallpaper.vue:124`
- **Throttling/debouncing**: Both implemented in `src/utils/helpers.ts`
  - `throttle()` function at lines 53-90
  - `debounce()` function at lines 10-45
- **Recommendations**:
  - Consider using IntersectionObserver for infinite scroll instead of scroll event
  - Add debounce to search input to reduce API calls

### Bundle Size
- **Size concerns**:
  - `sharp` package is large (~30MB with native binaries) and used for thumbnail generation
  - No code splitting observed - entire app loads as one bundle
- **Code splitting**: Not implemented
  - All views and components are eagerly loaded
  - Router does not use lazy loading - see `src/router/index.ts`
- **Recommendations**:
  - Implement route-based code splitting with dynamic imports
  - Consider lazy loading the `sharp` module only when needed
  - Use Vite's built-in code splitting features

## Error Handling

### Gaps
- **Unhandled promise rejections**: Several async functions lack proper error handling
  - `src/main.ts:72` - `initializeApp()` called without await or catch
  - Missing error boundaries in Vue components
- **Missing error boundaries**: No Vue error boundary components found
  - Components with errors will crash the entire app
- **User-facing errors**: Handled via Alert component
  - Good pattern in `src/views/OnlineWallpaper.vue:38-52` with error display
  - However, errors are generic and lack actionable guidance
- **Recommendations**:
  - Add global error handler for unhandled rejections
  - Implement Vue error boundaries for component isolation
  - Provide more specific error messages with recovery actions

## Code Quality

### Code Smells
- **Duplication**:
  - Alert state management duplicated across multiple views (OnlineWallpaper.vue, LocalWallpaper.vue, SettingPage.vue, DownloadWallpaper.vue)
  - File path encoding logic duplicated in multiple places
  - Similar `formatFileSize`, `formatResolution` utility calls repeated
- **Complex functions**:
  - `electron/main/ipc/handlers.ts` - Single file with 866 lines handling all IPC operations
  - `getImageDimensions()` at handlers.ts:88-170 is overly complex with nested conditionals
- **Dead code**:
  - `src/components/ElectronTest.vue` appears to be a test/demo component not used in production
  - `src/components/AlertDemo.vue` - Demo component not used in production
  - `src/views/APITest.vue` - Test view not integrated into router
  - `src/views/Diagnostic.vue` - Diagnostic view not integrated into router
- **Recommendations**:
  - Extract Alert state to a composable
  - Split IPC handlers into separate modules by domain
  - Remove or properly integrate test/demo components

### Type Safety
- **`any` usage**: Extensive use throughout codebase
  - `src/services/wallpaperApi.ts`: Lines 22, 33, 40, 56, 83, 92, 93, 112, 232, 233
  - `src/utils/helpers.ts`: Lines 10, 16, 18, 53, 60, 158-160, 175, 237, 242
  - `electron/main/ipc/handlers.ts`: Lines 79, 229, 242, 298, 320, 324, 328, 336, 345, 353, 376, 508, 557, 562, 597, 685, 694, 699, 714, 728, 761, 776, 784, 799, 808, 841, 850, 858
  - `src/stores/modules/wallpaper/actions.ts`: Line 13
  - `src/main.ts`: Lines 8, 9, 49
  - `electron/preload/index.ts`: Lines 12, 34, 35, 41, 42, 45, 47, 59, 60, 82, 83, 130
  - `env.d.ts`: Lines 21, 50, 51, 54, 56, 68, 69, 74, 75
- **Missing return types**: Many functions lack explicit return types
- **Non-null assertions**: Minimal usage, but present in some type assertions
- **@ts-ignore comments**: Present in several files
  - `electron/main/ipc/handlers.ts:711` - Silencing type error for electron-store
- **Recommendations**:
  - Replace `any` with proper interfaces
  - Add explicit return types to all exported functions
  - Create proper type definitions for IPC message payloads

## Dependencies

### Outdated
All dependencies are at their latest versions as of analysis date:
- axios: 1.15.0 (latest)
- pinia: 3.0.4 (latest)
- sharp: 0.34.5 (latest)
- vue: 3.5.33 (latest)
- vue-router: 5.0.6 (latest)
- wallpaper: 7.3.1 (latest)
- electron: 41.2.2 (latest)

### Unused
- `jsdom` - Dev dependency, appears to be for testing but minimal test coverage exists
- Test utilities present but only one test file (`src/__tests__/App.spec.ts`)

### Security considerations
- No known vulnerabilities in current versions
- `sharp` has had historical vulnerabilities - keep updated

## Architecture

### Coupling Issues
- **Tight coupling between stores and Electron API**:
  - Stores directly call `window.electronAPI` throughout
  - Makes testing difficult without Electron environment
- **IPC handlers in single file**:
  - `electron/main/ipc/handlers.ts` contains all IPC logic (866 lines)
  - No separation between concerns (file ops, downloads, settings, etc.)
- **Component-store coupling**:
  - Views directly import and use stores without abstraction layer

### Missing Abstractions
- **No service layer for Electron operations**:
  - Electron API calls scattered throughout components
  - Could benefit from a unified ElectronService
- **No repository pattern for data access**:
  - Direct store access from components
  - Storage logic mixed with business logic
- **No composable for common UI patterns**:
  - Alert management duplicated across views
  - Could be extracted to useAlert() composable

### Recommendations
1. Create abstraction layer for Electron API
2. Split IPC handlers by domain
3. Extract common composables for UI patterns
4. Implement repository pattern for data access

## Accessibility

### ARIA Attributes
- **Usage level**: Minimal
  - `role="alert"` on Alert component - see `src/components/Alert.vue:6`
  - `aria-label="关闭"` on close button - see `src/components/Alert.vue:16`
- **Missing ARIA**:
  - No ARIA labels on buttons in WallpaperList
  - No ARIA live regions for loading states
  - No ARIA for modal dialogs (ImagePreview)

### Keyboard Navigation
- **Implementation**: Partial
  - No explicit keyboard navigation handlers found
  - Ctrl/Cmd+click for multi-select implemented - see `src/components/WallpaperList.vue:17-18`
  - No focus management for modals
- **Missing**:
  - Arrow key navigation for wallpaper grid
  - Escape key handling for modals
  - Focus trap in dialogs

### Screen Reader Support
- **Considerations**:
  - Alt text on images is generic ("loading", "本地壁纸")
  - No skip links
  - No landmark regions
  - No page title updates on navigation

### Recommendations
1. Add meaningful alt text to images
2. Implement keyboard navigation for wallpaper grid
3. Add focus trap and escape handling for modals
4. Add ARIA labels to all interactive elements
5. Implement skip links for main content
6. Update page titles on route changes

## Recommendations

### High Priority
1. **Encrypt API keys at rest** using Electron's safeStorage API
2. **Add IPC channel validation** for all invoke methods in preload
3. **Implement error boundaries** to prevent full app crashes
4. **Fix memory leaks** in image caching and blob URL handling

### Medium Priority
1. Extract duplicated Alert logic into a Vue composable
2. Split IPC handlers into domain-specific modules
3. Implement code splitting for routes
4. Add input sanitization for user-provided content
5. Remove or properly integrate test/demo components
6. Replace `any` types with proper interfaces

### Low Priority
1. Implement virtual scrolling for large lists
2. Add comprehensive keyboard navigation
3. Improve accessibility with ARIA attributes
4. Add unit tests for core functionality
5. Implement focus management for modals
6. Add skip links and landmark regions
