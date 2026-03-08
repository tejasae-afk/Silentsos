// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" field resolution.
// Required for @google/genai to resolve the correct (browser/RN) entry point
// instead of the Node-only entry, which throws:
//   "This feature requires the web or Node specific @google/genai implementation"
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
