import { Platform } from 'react-native';

const LOCAL_IP = '10.0.2.2'; // Android Emulator host loopback

const DEV_API_URL = Platform.select({
  android: `http://${LOCAL_IP}:5001/api`,
  ios: 'http://localhost:5001/api',
  default: 'http://localhost:5001/api',
});

const SOCKET_URL = Platform.select({
  android: `http://${LOCAL_IP}:5001`,
  ios: 'http://localhost:5001',
  default: 'http://localhost:5001',
});

export const APP_CONFIG = {
  API_BASE_URL: DEV_API_URL,
  DEV_API_URL: DEV_API_URL,
  SOCKET_URL: SOCKET_URL,
  CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    'pk_test_ZW5oYW5jZWQtYmF0LTY4NS5jbGVyay5hY2NvdW50cy5kZXYk',
};
