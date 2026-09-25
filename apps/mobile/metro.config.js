const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// ─── Size Optimization ──────────────────────────────────────────────────────

// 4. Enable tree-shaking for smaller bundles
if (config.transformer) {
  config.transformer.minifierPath = 'metro-minify-terser';
  config.transformer.minifierConfig = {
    compress: {
      // Drop console.log in production (keeps .warn and .error)
      drop_console: false,
      pure_funcs: ['console.log'],
      passes: 2,
    },
    mangle: {
      toplevel: false,
    },
  };
}

// 5. Exclude test files and unused assets from the bundle
config.resolver.blockList = [
  /.*\/tests\/.*/,
  /.*\/__tests__\/.*/,
  /.*\.test\.(ts|tsx|js|jsx)$/,
  /.*\.spec\.(ts|tsx|js|jsx)$/,
];

module.exports = withNativeWind(config, { input: './global.css' });
