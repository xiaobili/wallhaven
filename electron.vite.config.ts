import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: false, // 生产环境禁用sourcemap
      minify: 'esbuild', // 使用esbuild进行更快的构建和压缩
      esbuild: {
        drop: ['console', 'debugger'] // 生产环境移除console和debugger
      },
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        },
        output: {
          manualChunks: undefined // 主进程不分割
        },
        treeshake: false
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [vue(), vueJsx()],
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
    optimizeDeps: {
      // 预构建优化
      include: ['vue', 'vue-router', 'pinia', 'axios'],
      exclude: ['sharp'] // sharp是原生模块，不需要预构建
    },
    build: {
      sourcemap: false, // 生产环境禁用sourcemap
      minify: 'esbuild', // 使用esbuild进行更快的构建和压缩
      esbuild: {
        drop: ['console', 'debugger'] // 生产环境移除console和debugger
      },
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          splash: resolve(__dirname, 'splash.html')
        },
        output: {
          // 手动代码分割
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
            utils: ['axios'],
            components: [
              '@/components/ImagePreview.vue',
              '@/components/SearchBar.vue',
              '@/components/WallpaperList.vue',
              '@/components/PageHeader.vue'
            ]
          },
          // 优化chunk命名
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      // 压缩报告
      reportCompressedSize: true,
      // chunk大小警告阈值
      chunkSizeWarningLimit: 1000
    }
  }
})
