import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    // Override parser for Vue SFC files to support TypeScript in <script lang="ts">
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module'
      }
    }
  },
  {
    files: ['src/views/**/*.{vue,ts}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/stores/*'],
          message: 'Views must import from @/composables, not @/stores. See View → Composable → Store architecture.'
        }]
      }]
    }
  },
  {
    // Disable strict type checking rules that are too restrictive for this project
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    ignores: ['out/**', 'dist/**', 'node_modules/**', 'resources/**']
  }
]
