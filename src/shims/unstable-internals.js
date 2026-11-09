const { NativeModules } = require('react-native');

let AssetSourceResolver;
try {
  const mod = require('react-native/Libraries/Image/AssetSourceResolver');
  AssetSourceResolver = mod.default || mod;
} catch (e) {
  AssetSourceResolver = class AssetSourceResolver {};
}

const DevLoadingView = {
  showMessage: () => {},
  hide: () => {},
};

const NativeRedBox = NativeModules.RedBox || {
  dismiss: () => {},
};

const NativeExceptionsManager = NativeModules.ExceptionsManager || {
  dismissRedbox: () => {},
};

const NativeSourceCode = NativeModules.SourceCode || {
  getConstants: () => ({ scriptURL: null }),
};

module.exports = {
  AssetSourceResolver,
  DevLoadingView,
  NativeRedBox,
  NativeExceptionsManager,
  NativeSourceCode,
};
