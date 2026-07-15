const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude the .local directory (Replit agent skills/state) from Metro's
// file watcher.  Metro scans every directory under the project root and
// crashes with ENOENT if a watched path disappears while it is running
// (e.g. stale temp folders created/deleted by agent tooling).
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const localDir = escapeRegex(path.join(__dirname, '.local'));

config.resolver.blockList = [
  // Keep any existing blockList entries
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
    ? [config.resolver.blockList]
    : []),
  new RegExp(`^${localDir}[\\/\\\\].*$`),
];

module.exports = config;
