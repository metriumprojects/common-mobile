// util/authController.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store auth data in AsyncStorage for React Native
export const storeAuthData = async (token: string, userData: any) => {
  try {
    // React Native environment - using AsyncStorage
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
  } catch (error) {
    console.error('Error storing auth data:', error);
    throw error;
  }
};

// Get stored token
export const getStoredToken = async (): Promise<string | null> => {
  try {
    // React Native environment
    const token = await AsyncStorage.getItem('authToken');
     console.log("token at start",token);
    return token;
   
    
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

// Get stored user data
export const getStoredUserData = async (): Promise<any> => {
  try {
    // React Native environment
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting stored user data:', error);
    return null;
  }
};

// Clear auth data
export const clearAuthData = async () => {
  try {
    // React Native environment
    await AsyncStorage.multiRemove(['authToken', 'userData']);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getStoredToken();
  return token !== null && token !== '';
};
