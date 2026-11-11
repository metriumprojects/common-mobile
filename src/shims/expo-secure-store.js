import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItemAsync(key) {
  return AsyncStorage.getItem(`secure_${key}`);
}

export async function setItemAsync(key, value) {
  return AsyncStorage.setItem(`secure_${key}`, value);
}

export async function deleteItemAsync(key) {
  return AsyncStorage.removeItem(`secure_${key}`);
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};

