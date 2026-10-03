const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in monorepo
config.watchFolders = [monorepoRoot];

// Let Metro resolve packages from node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ignore other apps and .git to keep watcher efficient on Windows
config.resolver.blockList = [
  new RegExp(`^${path.resolve(monorepoRoot, 'apps', 'backend').replace(/\\/g, '\\\\')}.*`),
  new RegExp(`^${path.resolve(monorepoRoot, 'apps', 'web').replace(/\\/g, '\\\\')}.*`),
];

// Enforce single copies of runtime singletons across the entire monorepo
const singletons = [
  'react',
  'react-dom',
  'react-native',
  'react-native-web',
  'zustand',
  '@tanstack/react-query',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of singletons) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      const subpath = moduleName.slice(pkg.length);
      const target = path.resolve(projectRoot, 'node_modules', pkg) + subpath;
      return context.resolveRequest(context, target, platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
