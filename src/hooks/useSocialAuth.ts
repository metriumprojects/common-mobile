import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useClerk, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

export type OAuthStrategy = 'oauth_google' | 'oauth_apple';

function extractQueryParam(url: string, key: string): string {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get(key) || '';
  } catch {
    const match = url.match(new RegExp(`[?&]${key}=([^&#]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  }
}

export function useSocialAuth() {
  const navigation = useNavigation<any>();
  const clerk = useClerk();
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
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
    if (!isSignInLoaded || !isSignUpLoaded || !signIn || !signUp) {
      onError?.('Authentication service is still loading. Please try again.');
      return;
    }

    setOauthLoading(strategy);
    onError?.('');

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'common',
        path: 'sso-callback',
      });

      const createdSignIn = await signIn.create({
        strategy,
        redirectUrl,
      });

      const activeSignIn = createdSignIn || clerk.client?.signIn || signIn;
      const authUrl =
        activeSignIn?.firstFactorVerification?.externalVerificationRedirectURL?.toString();

      if (!authUrl) {
        const verificationError =
          activeSignIn?.firstFactorVerification?.error?.longMessage ||
          activeSignIn?.firstFactorVerification?.error?.message;
        throw new Error(
          verificationError ||
            `Could not start ${strategy === 'oauth_apple' ? 'Apple' : 'Google'} sign-in (status: ${activeSignIn?.status || 'unknown'}).`
        );
      }

      const authSessionResult = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl
      );

      if (authSessionResult.type !== 'success' || !authSessionResult.url) {
        return;
      }

      const rotatingTokenNonce = extractQueryParam(
        authSessionResult.url,
        'rotating_token_nonce'
      );

      const reloadedSignIn = await activeSignIn.reload({ rotatingTokenNonce });
      const finalSignIn = reloadedSignIn || clerk.client?.signIn || activeSignIn;

      let sessionId = finalSignIn?.createdSessionId || null;
      let resolvedSignUp = signUp;

      if (!sessionId && finalSignIn?.firstFactorVerification?.status === 'transferable') {
        const createdSignUp = await signUp.create({ transfer: true });
        resolvedSignUp = createdSignUp || clerk.client?.signUp || signUp;
        sessionId = resolvedSignUp?.createdSessionId || null;
      }

      if (sessionId && setActive) {
        await setActive({ session: sessionId });

        const email =
          resolvedSignUp?.emailAddress ||
          finalSignIn?.identifier ||
          `${strategy === 'oauth_apple' ? 'apple' : 'google'}-${sessionId.slice(-6)}@common.app`;
        const fullName =
          [resolvedSignUp?.firstName, resolvedSignUp?.lastName]
            .filter(Boolean)
            .join(' ') || email.split('@')[0];

        Toast.show({
          type: 'success',
          text1: 'Signed in',
          text2: `Welcome, ${fullName}`,
        });
        return;
      }

      onError?.('Could not complete sign-in. Please try again.');
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
