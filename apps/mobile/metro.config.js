const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order.
//    Bun stores transitive deps inside .bun/<pkg>@version+hash/node_modules/,
//    so we must include the .bun store directory for Metro to find them.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules', '.bun'),
];

// 3. Allow Metro to walk up the directory tree to find transitive deps.
//    NOTE: disableHierarchicalLookup was removed because Bun's
//    content-addressed store (.bun/) nests transitive dependencies inside
//    each package's own node_modules. Metro needs hierarchical lookup to
//    traverse into those nested directories.

// 4. Support package.json "exports" field (needed by many modern packages)
config.resolver.unstable_enablePackageExports = true;

// ─── Size Optimization ──────────────────────────────────────────────────────

// 5. Enable tree-shaking for smaller bundles
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

// 6. Exclude test files and unused assets from the bundle
config.resolver.blockList = [
  /.*\/tests\/.*/,
  /.*\/__tests__\/.*/,
  /.*\.test\.(ts|tsx|js|jsx)$/,
  /.*\.spec\.(ts|tsx|js|jsx)$/,
];

module.exports = withNativeWind(config, { input: './global.css' });
