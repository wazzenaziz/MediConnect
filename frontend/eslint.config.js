import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // React 19's `react-hooks/set-state-in-effect` flags every common
      // data-fetching pattern (setLoading, setData inside useEffect).
      // It's opinionated guidance, not a bug indicator — downgrade to
      // a warning so CI doesn't fail on standard idioms.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Context files intentionally export both a Provider component
      // and a `useFoo()` hook from the same file. That's the standard
      // React Context idiom — fast-refresh still works fine for the
      // Provider component, so downgrade this from error to warning.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
