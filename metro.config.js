const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const path = require('path');

// Optimize watcher and bundler by ignoring non-app directories
config.resolver.blockList = [
  /\.git\/.*/,
  /targets\/.*/,
  /docs\/.*/,
  /scratch\/.*/,
];

// Fallback resolver for @/ path aliases
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const target = path.resolve(__dirname, 'src', moduleName.substring(2));
    return context.resolveRequest(context, target, platform);
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

