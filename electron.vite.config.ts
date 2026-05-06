import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts'),
        },
        output: {
          manualChunks: undefined,
        },
        treeshake: false,
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [vue(), vueJsx()],
    esbuild: {
      drop: ['console', 'debugger'],
    },
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
      include: ['vue', 'vue-router', 'pinia', 'axios'],
      exclude: ['sharp'],
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          splash: resolve(__dirname, 'splash.html'),
        },
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
            utils: ['axios'],
            components: [
              '@/components/ImagePreview.vue',
              '@/components/SearchBar.vue',
              '@/components/WallpaperList.vue',
              '@/components/PageHeader.vue',
            ],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
    },
  },
})
