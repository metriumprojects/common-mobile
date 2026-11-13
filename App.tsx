import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import {
  StatusBar,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClerkProvider } from '@clerk/clerk-expo';
import Toast from 'react-native-toast-message';
import * as Updates from 'expo-updates';

import { APP_CONFIG } from './src/config/appConfig';
import { tokenCache } from './src/util/tokenCache';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { figmaColors } from './src/theme/figmaTheme';

import LoginScreen from './src/screens/Auth/LoginScreen';
import SignupScreen from './src/screens/Auth/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import CommunityChatScreen from './src/screens/CommunityChatScreen';
import CommunityInboxScreen from './src/screens/CommunityInboxScreen';
import PrivateChatScreen from './src/screens/PrivateChatScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        lazy: false,
        sceneStyle: { backgroundColor: figmaColors.bg },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={figmaColors.ink} />
        <Text style={styles.splashText}>Connecting to common...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: figmaColors.bg },
        ...TransitionPresets.SlideFromRightIOS,
        gestureEnabled: true,
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ animation: 'none' }}
          />
          <Stack.Screen name="CommunityChat" component={CommunityChatScreen} />
          <Stack.Screen name="CommunityInbox" component={CommunityInboxScreen} />
          <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected startup error.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('[RootErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, message: '' })}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const checkingRef = useRef(false);

  useEffect(() => {
    const checkAndApplyOTA = async () => {
      if (__DEV__ || checkingRef.current) return;
      try {
        if (!Updates.isEnabled) return;
        checkingRef.current = true;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          // Download silently in background; EXUpdates applies on next cold launch
          await Updates.fetchUpdateAsync();
        }
      } catch (err) {
        console.warn('[OTA] Update check skipped:', err);
      } finally {
        checkingRef.current = false;
      }
    };

    checkAndApplyOTA();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkAndApplyOTA();
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        <ClerkProvider
          publishableKey={APP_CONFIG.CLERK_PUBLISHABLE_KEY}
          tokenCache={tokenCache}
        >
          <AuthProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={figmaColors.bg}
              translucent={false}
            />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <Toast />
          </AuthProvider>
        </ClerkProvider>
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: figmaColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashText: {
    color: figmaColors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: figmaColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  errorTitle: {
    color: figmaColors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  errorMessage: {
    color: figmaColors.inkSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: figmaColors.inkButton,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
