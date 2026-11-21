import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import stylistic from '@stylistic/eslint-plugin'
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
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Multi-line JSX starts on its own line inside parentheses: `return (`, `=> (`, `= (`.
      "@stylistic/jsx-wrap-multilines": ["error", {
        declaration: "parens-new-line",
        assignment: "parens-new-line",
        return: "parens-new-line",
        arrow: "parens-new-line",
        condition: "ignore",
        logical: "ignore",
        prop: "ignore",
        propertyValue: "ignore",
      }],
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
        // Hex colors, in strings or template literals.
        ":matches(Literal[value=/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/], TemplateElement[value.raw=/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/])",
        // rgb(), rgba(), hsl(), hsla().
        ":matches(Literal[value=/\\b(rgba?|hsla?)\\(/], TemplateElement[value.raw=/\\b(rgba?|hsla?)\\(/])",
        // Named colors on a color property (sx, style) or attribute (JSX, SVG).
        ":matches(Property[key.name=/^(color|bgcolor|background|backgroundColor|borderColor|outlineColor|fill|stroke)$/], JSXAttribute[name.name=/^(color|fill|stroke)$/]) > Literal[value=/^(white|black|gr[ae]y|red|green|blue|orange|yellow|purple|pink|brown)$/i]",
      ].map(selector => ({
        selector,
        message: "Name colors in src/theme.ts and use a theme role here (e.g. \"text.secondary\" or theme.palette.divider).",
      })), {
        // Focus moves from code follow the rules in AGENTS.md (UI conventions, Accessibility).
        selector: "CallExpression[callee.property.name='focus'][callee.object.property.name='currentTarget']",
        message: "Don't focus the clicked control from its handler: it shows a focus ring after a tap. See the Accessibility rule in AGENTS.md.",
      }],
    },
  },
])
