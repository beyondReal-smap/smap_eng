const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores([
    'dist/*',
    'src/components/animated-icon.tsx',
    'src/components/animated-icon.web.tsx',
    'src/components/app-tabs.tsx',
    'src/components/app-tabs.web.tsx',
    'src/components/external-link.tsx',
    'src/components/hint-row.tsx',
    'src/components/ui/collapsible.tsx',
    'src/components/web-badge.tsx',
    'src/hooks/use-color-scheme.web.ts',
  ]),
  expoConfig,
]);
