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
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClerkProvider } from '@clerk/clerk-expo';
import Toast, { ToastConfig } from 'react-native-toast-message';
import * as Updates from 'expo-updates';

import { APP_CONFIG } from './src/config/appConfig';
import { mobileApi } from './src/api/client';
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

const toastConfig: ToastConfig = {
  success: ({ text1, text2, onPress }) => (
    <View style={toastStyles.darkCard} onTouchEnd={() => onPress?.()}>
      <View style={[toastStyles.badge, toastStyles.successBadge]}>
        <Text style={toastStyles.successBadgeText}>✓</Text>
      </View>
      <View style={toastStyles.textWrap}>
        {!!text1 && <Text style={toastStyles.darkTitle} numberOfLines={1}>{text1}</Text>}
        {!!text2 && <Text style={toastStyles.darkSub} numberOfLines={2}>{text2}</Text>}
      </View>
    </View>
  ),
  error: ({ text1, text2, onPress }) => (
    <View style={toastStyles.errorCard} onTouchEnd={() => onPress?.()}>
      <View style={[toastStyles.badge, toastStyles.errorBadge]}>
        <Text style={toastStyles.errorBadgeText}>!</Text>
      </View>
      <View style={toastStyles.textWrap}>
        {!!text1 && <Text style={toastStyles.errorTitle} numberOfLines={1}>{text1}</Text>}
        {!!text2 && <Text style={toastStyles.errorSub} numberOfLines={2}>{text2}</Text>}
      </View>
    </View>
  ),
  info: ({ text1, text2, onPress }) => (
    <View style={toastStyles.darkCard} onTouchEnd={() => onPress?.()}>
      <View style={[toastStyles.badge, toastStyles.infoBadge]}>
        <View style={toastStyles.infoDot} />
      </View>
      <View style={toastStyles.textWrap}>
        {!!text1 && <Text style={toastStyles.darkTitle} numberOfLines={1}>{text1}</Text>}
        {!!text2 && <Text style={toastStyles.darkSub} numberOfLines={2}>{text2}</Text>}
      </View>
    </View>
  ),
};

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        lazy: true,
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
        <View style={styles.splashBrandRow}>
          <Text style={styles.splashBrandText}>c</Text>
          <View style={styles.splashLimeCircle} />
          <Text style={styles.splashBrandText}>mmon</Text>
        </View>
        <Text style={styles.splashText}>Scoped communities & real-time chat</Text>
        <ActivityIndicator
          size="small"
          color={figmaColors.ink}
          style={styles.splashSpinner}
        />
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
    // Wake backend immediately in parallel with Clerk/auth startup
    mobileApi.getHealth().catch(() => {});

    const checkAndApplyOTA = async () => {
      if (__DEV__ || checkingRef.current) return;
      try {
        if (!Updates.isEnabled) return;
        checkingRef.current = true;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync();
          if (fetched.isNew) {
            Toast.show({
              type: 'info',
              text1: 'Update Downloaded',
              text2: 'Close and reopen the app to apply the latest update.',
              visibilityTime: 4000,
            });
          }
        }
      } catch (err) {
        console.warn('[OTA] Update check skipped:', err);
      } finally {
        checkingRef.current = false;
      }
    };

    const timer = setTimeout(() => {
      checkAndApplyOTA();
    }, 3000);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkAndApplyOTA();
      }
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
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
            <NavigationContainer
              theme={{
                ...DefaultTheme,
                colors: {
                  ...DefaultTheme.colors,
                  background: figmaColors.bg,
                },
              }}
            >
              <RootNavigator />
            </NavigationContainer>
            <Toast config={toastConfig} topOffset={54} />
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
    gap: 10,
  },
  splashBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splashBrandText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.1,
    color: figmaColors.ink,
    lineHeight: 40,
  },
  splashLimeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: figmaColors.brandLime,
    borderWidth: 2.5,
    borderColor: figmaColors.ink,
    marginHorizontal: 2,
    marginTop: 3,
  },
  splashText: {
    color: figmaColors.inkSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  splashSpinner: {
    marginTop: 14,
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

const toastStyles = StyleSheet.create({
  darkCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: figmaColors.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  errorCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    backgroundColor: figmaColors.brandLime,
  },
  successBadgeText: {
    color: figmaColors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  errorBadge: {
    backgroundColor: '#DC2626',
  },
  errorBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  infoBadge: {
    backgroundColor: 'rgba(216, 255, 95, 0.18)',
  },
  infoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: figmaColors.brandLime,
  },
  textWrap: {
    flex: 1,
  },
  darkTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  darkSub: {
    color: '#D1D5DB',
    fontSize: 12,
    marginTop: 1,
    lineHeight: 16,
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  errorSub: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 1,
    lineHeight: 16,
  },
});
