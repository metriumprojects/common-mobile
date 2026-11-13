import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { OAuthStrategy } from '../hooks/useSocialAuth';
import { figmaColors } from '../theme/figmaTheme';

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
        style={[styles.googleButton, isDisabled && styles.buttonDisabled]}
        onPress={() => onPressProvider('oauth_google')}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        {oauthLoading === 'oauth_google' ? (
          <ActivityIndicator color={figmaColors.ink} size="small" />
        ) : (
          <View style={styles.buttonInner}>
            <View style={styles.googleBadge}>
              <Text style={styles.googleBadgeText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.appleButton, isDisabled && styles.buttonDisabled]}
        onPress={() => onPressProvider('oauth_apple')}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        {oauthLoading === 'oauth_apple' ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.appleButtonText}>  Continue with Apple</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or with email</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    color: figmaColors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  googleButtonText: {
    color: figmaColors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: figmaColors.ink,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
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
    backgroundColor: figmaColors.border,
  },
  dividerText: {
    color: figmaColors.inkMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
