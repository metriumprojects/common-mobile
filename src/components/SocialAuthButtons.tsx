import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { OAuthStrategy } from '../hooks/useSocialAuth';

interface SocialAuthButtonsProps {
  oauthLoading: OAuthStrategy | null;
  disabled?: boolean;
  onPressProvider: (strategy: OAuthStrategy) => void;
}

export function SocialAuthButtons({
  oauthLoading,
  disabled,
  onPressProvider,
}: SocialAuthButtonsProps) {
  const isDisabled = Boolean(disabled || oauthLoading);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.socialButton, isDisabled && styles.buttonDisabled]}
        onPress={() => onPressProvider('oauth_google')}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {oauthLoading === 'oauth_google' ? (
          <ActivityIndicator color="#F8FAFC" size="small" />
        ) : (
          <Text style={styles.socialButtonText}>G  Continue with Google</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.socialButton, isDisabled && styles.buttonDisabled]}
        onPress={() => onPressProvider('oauth_apple')}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {oauthLoading === 'oauth_apple' ? (
          <ActivityIndicator color="#F8FAFC" size="small" />
        ) : (
          <Text style={styles.socialButtonText}>  Continue with Apple</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  socialButton: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  socialButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

