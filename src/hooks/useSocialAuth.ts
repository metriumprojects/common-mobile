import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

export type OAuthStrategy = 'oauth_google' | 'oauth_apple';

export function useSocialAuth() {
  const navigation = useNavigation<any>();
  const { startSSOFlow } = useSSO();
  const [oauthLoading, setOauthLoading] = useState<OAuthStrategy | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      WebBrowser.warmUpAsync().catch(() => {});
      return () => {
        WebBrowser.coolDownAsync().catch(() => {});
      };
    }
  }, []);

  const handleSocialAuth = async (
    strategy: OAuthStrategy,
    onError?: (msg: string) => void
  ) => {
    if (oauthLoading) return;
    setOauthLoading(strategy);
    onError?.('');

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'common',
        path: 'sso-callback',
      });

      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
        strategy,
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        const email =
          signUp?.emailAddress ||
          signIn?.identifier ||
          `${strategy === 'oauth_apple' ? 'apple' : 'google'}-${createdSessionId.slice(-6)}@common.app`;
        const fullName =
          [signUp?.firstName, signUp?.lastName].filter(Boolean).join(' ') ||
          email.split('@')[0];

        try {
          await mobileApi.syncUser({
            clerkId: createdSessionId,
            email,
            name: fullName,
          });
        } catch {
          // AuthContext syncs on mount if this transient call fails
        }

        Toast.show({
          type: 'success',
          text1: 'Signed in',
          text2: `Welcome, ${fullName}`,
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        return;
      }

      const missingMsg =
        'Additional sign-in steps are required. Please try email sign-in or finish verification.';
      onError?.(missingMsg);
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Social sign-in failed or was cancelled.';
      onError?.(message);
      Toast.show({
        type: 'error',
        text1: 'Sign-In Failed',
        text2: message,
      });
    } finally {
      setOauthLoading(null);
    }
  };

  return { handleSocialAuth, oauthLoading };
}
