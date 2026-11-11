import { Linking } from 'react-native';

export function maybeCompleteAuthSession() {
  return { type: 'failed', message: 'Not supported in bare environment' };
}

export async function openAuthSessionAsync(url) {
  if (url) {
    await Linking.openURL(url);
  }
  return { type: 'dismiss' };
}

export async function openBrowserAsync(url) {
  if (url) {
    await Linking.openURL(url);
  }
  return { type: 'dismiss' };
}

export async function warmUpAsync() {
  return { servicePackage: undefined };
}

export async function coolDownAsync() {
  return { servicePackage: undefined };
}

export function dismissAuthSession() {}

export default {
  maybeCompleteAuthSession,
  openAuthSessionAsync,
  openBrowserAsync,
  warmUpAsync,
  coolDownAsync,
  dismissAuthSession,
};

