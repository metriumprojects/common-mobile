const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const shims = {
  'expo-secure-store': path.resolve(__dirname, 'src/shims/expo-secure-store.js'),
  'expo-local-authentication': path.resolve(__dirname, 'src/shims/expo-local-authentication.js'),
  '@clerk/expo-passkeys': path.resolve(__dirname, 'src/shims/clerk-expo-passkeys.js'),
  'react-native/unstable-internals-do-not-use': path.resolve(__dirname, 'src/shims/unstable-internals.js'),
  'react-native/setup-env': path.resolve(__dirname, 'src/shims/setup-env.js'),
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (shims[moduleName]) {
        return {
          filePath: shims[moduleName],
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

