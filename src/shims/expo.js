import { Platform, NativeModules } from 'react-native';

export class CodedError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export class UnavailabilityError extends CodedError {
  constructor(moduleName, propertyName) {
    super(
      'ERR_UNAVAILABLE',
      `The method or property ${moduleName}.${propertyName} is not available on ${Platform.OS}`
    );
  }
}

export class NativeModule {}

export function requireNativeModule(name) {
  return NativeModules[name] || {};
}

export function requireOptionalNativeModule(name) {
  return NativeModules[name] || null;
}

export { Platform };

export default {
  CodedError,
  UnavailabilityError,
  NativeModule,
  requireNativeModule,
  requireOptionalNativeModule,
  Platform,
};
