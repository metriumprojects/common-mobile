import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSocialAuth } from '../../hooks/useSocialAuth';
import { SocialAuthButtons } from '../../components/SocialAuthButtons';
import { figmaColors, figmaShadows } from '../../theme/figmaTheme';

export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { login } = useAuth();
  const { handleSocialAuth, oauthLoading } = useSocialAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('All fields are required.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      if (!isLoaded || !signUp) {
        setErrorMsg('Authentication service is initializing. Please try again.');
        return;
      }

      const parts = fullName.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      await signUp.create({
        firstName,
        lastName,
        emailAddress: email.trim(),
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
      Toast.show({
        type: 'info',
        text1: 'Verification Sent',
        text2: `A 6-digit code has been sent to ${email.trim()}`,
      });
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Unable to create account.';
      setErrorMsg(message);
      Toast.show({
        type: 'error',
        text1: 'Sign Up Failed',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLoaded && signUp) {
        const completeSignUp = await signUp.attemptEmailAddressVerification({
          code: verificationCode.trim(),
        });

        if (completeSignUp.status === 'complete') {
          await setActive({ session: completeSignUp.createdSessionId });

          Toast.show({
            type: 'success',
            text1: 'Account Verified',
            text2: 'Welcome to Common Community Platform',
          });
          return;
        }
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Invalid verification code.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>c</Text>
              <View style={styles.brandLimeCircle} />
              <Text style={styles.brandText}>mmon</Text>
            </View>
            <Text style={styles.title}>
              {pendingVerification ? 'Verify your email' : 'Create your account'}
            </Text>
            <Text style={styles.subtitle}>
              {pendingVerification
                ? `Enter the 6-digit code sent to ${email}`
                : 'Join communities and start real-time side-chats'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {pendingVerification ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={verificationCode}
                    onChangeText={(t) => {
                      setVerificationCode(t);
                      if (errorMsg) setErrorMsg('');
                    }}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={async () => {
                    if (!isLoaded || !signUp || loading) return;
                    setErrorMsg('');
                    setLoading(true);
                    try {
                      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                      Toast.show({
                        type: 'info',
                        text1: 'Code Resent',
                        text2: `Check ${email.trim()} (and spam) for your 6-digit code`,
                      });
                    } catch (err: any) {
                      setErrorMsg(
                        err?.errors?.[0]?.longMessage ||
                          err?.errors?.[0]?.message ||
                          'Unable to resend code.'
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendBtnText}>Resend verification code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => setPendingVerification(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendBtnText}>Back to edit details</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <SocialAuthButtons
                  oauthLoading={oauthLoading}
                  disabled={loading}
                  onPressProvider={(strategy) => handleSocialAuth(strategy, setErrorMsg)}
                />
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Jane Doe"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    value={fullName}
                    onChangeText={(t) => {
                      setFullName(t);
                      if (errorMsg) setErrorMsg('');
                    }}
                  />
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (errorMsg) setErrorMsg('');
                    }}
                  />
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Create a secure password"
                      placeholderTextColor={figmaColors.inkMuted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (errorMsg) setErrorMsg('');
                      }}
                    />
                    <TouchableOpacity
                      style={styles.toggleVisibilityBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.toggleVisibilityText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  )}
                </TouchableOpacity>

                {/* Switch to Login */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already have an account?</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.linkText}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: figmaColors.bg,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.9,
    color: figmaColors.ink,
    lineHeight: 32,
  },
  brandLimeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: figmaColors.brandLime,
    borderWidth: 2,
    borderColor: figmaColors.ink,
    marginHorizontal: 1.5,
    marginTop: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: figmaColors.ink,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: figmaColors.inkSecondary,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: figmaColors.border,
    ...figmaShadows.card,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: figmaColors.ink,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: figmaColors.ink,
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 64,
  },
  toggleVisibilityBtn: {
    position: 'absolute',
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  toggleVisibilityText: {
    color: figmaColors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: figmaColors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendBtnText: {
    color: figmaColors.inkSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: figmaColors.inkSecondary,
    fontSize: 13,
  },
  linkText: {
    color: figmaColors.ink,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
