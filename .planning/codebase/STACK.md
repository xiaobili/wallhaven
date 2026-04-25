# Technology Stack

## Runtime

### Electron
- **Electron**: v41.2.2
- **Node.js**: ^20.19.0 || >=22.12.0 (required engine)
- **Runtime Type**: ESM (type: "module" in package.json)

## Frontend Framework

### Vue Ecosystem
- **Vue**: v3.5.32
- **Vue Router**: v5.0.4
- **Pinia**: v3.0.4 (state management)

## Build Tools

### Core Build System
- **Vite**: v7.3.2 (frontend build tool)
- **electron-vite**: v5.0.0 (Electron-specific build tool)
- **electron-builder**: v26.8.1 (packaging and distribution)

### Build Configuration Files
- `electron.vite.config.ts` - Main Electron build configuration
- `vite.config.ts` - Renderer process build configuration
- `vitest.config.ts` - Test configuration

### Build Features
- **Minification**: esbuild (production builds)
- **Code Splitting**: Manual chunks for vendor, utils, and components
- **Sourcemap**: Disabled in production for smaller bundle size
- **Tree Shaking**: Automatic via Rollup (Vite's bundler)

## Language & Types

- **TypeScript**: ~6.0.0
- **@types/node**: v24.12.2
- **@tsconfig/node24**: v24.0.4
- **@vue/tsconfig**: v0.9.1
- **vue-tsc**: v3.2.6 (Vue TypeScript compiler)

### TypeScript Configuration
- Target: ES modules
- Module Resolution: Node.js style with ESM support
- Strict mode enabled

## Testing

- **Vitest**: v4.1.4
- **@vue/test-utils**: v2.4.6
- **jsdom**: v29.0.2
- **@types/jsdom**: v28.0.1

### Test Configuration
```typescript
// vitest.config.ts
{
  environment: 'jsdom',
  exclude: [...configDefaults.exclude, 'e2e/**']
}
```

## Key Dependencies

### HTTP & API
| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.15.0 | HTTP client for Wallhaven API requests |

### Image Processing
| Package | Version | Purpose |
|---------|---------|---------|
| sharp | ^0.34.5 | High-performance image processing for thumbnail generation |

### System Integration
| Package | Version | Purpose |
|---------|---------|---------|
| wallpaper | ^7.3.1 | Cross-platform desktop wallpaper management |
| electron-store | 11.0.2 | Persistent data storage for Electron apps |

### Electron Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| @electron-toolkit/utils | ^4.0.0 | Electron development utilities |

## Development Tools

### Code Quality
| Package | Version | Purpose |
|---------|---------|---------|
| prettier | 3.8.3 | Code formatter |
| vue-tsc | ^3.2.6 | Vue TypeScript type-checking |

### Vite Plugins
| Package | Version | Purpose |
|---------|---------|---------|
| @vitejs/plugin-vue | ^6.0.6 | Vue 3 SFC support |
| @vitejs/plugin-vue-jsx | ^5.1.5 | JSX support for Vue |
| vite-plugin-vue-devtools | ^8.1.1 | Vue DevTools integration |

### Build Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| npm-run-all2 | ^8.0.4 | Run multiple npm scripts in parallel |
| png-to-ico | ^3.0.1 | Convert PNG to ICO for Windows icons |

## Project Scripts

```json
{
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "preview": "electron-vite preview",
  "test:unit": "vitest",
  "type-check": "vue-tsc --build",
  "format": "prettier --write --experimental-cli src/",
  "postinstall": "electron-builder install-app-deps",
  "build:win": "npm run build && electron-builder --win --config",
  "build:mac": "npm run build && electron-builder --mac --config",
  "build:linux": "npm run build && electron-builder --linux --config",
  "generate-icons": "node scripts/generate-icons.js",
  "generate-ico": "node scripts/generate-ico.js"
}
```

## Application Version

- **Current Version**: v1.1.6
- **Author**: BillyJR
- **Description**: Wallhaven client built with Electron

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Application                     │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)          │  Renderer Process (Vue)  │
│  ├── electron/main/index.ts      │  ├── src/                │
│  ├── electron/main/ipc/          │  │   ├── views/          │
│  │   └── handlers.ts             │  │   ├── components/     │
│  └── electron/preload/index.ts   │  │   ├── stores/         │
│                                  │  │   ├── services/       │
│                                  │  │   └── utils/          │
├─────────────────────────────────────────────────────────────┤
│                     Shared Types                              │
│                     src/types/index.ts                        │
└─────────────────────────────────────────────────────────────┘
```

## Environment Requirements

- **Node.js**: Version 20.19.0+ or 22.12.0+
- **Package Manager**: npm (configured in package.json)
- **Platform Support**: Windows, macOS, Linux
