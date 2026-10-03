const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize watcher and bundler by ignoring non-app directories
config.resolver.blockList = [
  /\.git\/.*/,
  /targets\/.*/,
  /docs\/.*/,
  /scratch\/.*/,
];

module.exports = config;
