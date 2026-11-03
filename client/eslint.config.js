import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "react-refresh/only-export-components": "off"
    },
  },
  {
    // Colors are named once, in src/theme.ts; everything else reads theme roles.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme.ts', 'src/**/*.test.ts'],
    rules: {
      "no-restricted-syntax": ["error", ...[
        "Literal[value=/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
        "TemplateElement[value.raw=/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
        "Literal[value=/\\b(rgba?|hsla?)\\(/]",
        "TemplateElement[value.raw=/\\b(rgba?|hsla?)\\(/]",
        "Property[key.name=/^(color|bgcolor|background|backgroundColor|borderColor|outlineColor|fill|stroke)$/] > Literal[value=/^(white|black|gr[ae]y|red|green|blue|orange|yellow|purple|pink|brown)$/i]",
        "JSXAttribute[name.name=/^(color|fill|stroke)$/] > Literal[value=/^(white|black|gr[ae]y|red|green|blue|orange|yellow|purple|pink|brown)$/i]",
      ].map(selector => ({
        selector,
        message: "Name colors in src/theme.ts and use a theme role here (e.g. \"text.secondary\" or theme.palette.divider).",
      }))],
    },
  },
])
