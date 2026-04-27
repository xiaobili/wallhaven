import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
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
    ignores: ['out/**', 'dist/**', 'node_modules/**', 'resources/**']
  }
]
