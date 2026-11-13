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
import { useSignIn } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSocialAuth } from '../../hooks/useSocialAuth';
import { SocialAuthButtons } from '../../components/SocialAuthButtons';
import { figmaColors, figmaShadows } from '../../theme/figmaTheme';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { login } = useAuth();
  const { handleSocialAuth, oauthLoading } = useSocialAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useEmailCode, setUseEmailCode] = useState(false);
  const [pendingCode, setPendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const finishSignIn = async (sessionId: string) => {
    await setActive!({ session: sessionId });

    Toast.show({
      type: 'success',
      text1: 'Welcome back',
      text2: `Logged in as ${email.trim()}`,
    });
  };

  const sendEmailCodeFactor = async (attempt: any) => {
    const firstEmailFactor = attempt?.supportedFirstFactors?.find(
      (f: any) => f.strategy === 'email_code'
    );
    if (firstEmailFactor?.emailAddressId && signIn) {
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: firstEmailFactor.emailAddressId,
      });
      setPendingCode(true);
      Toast.show({
        type: 'info',
        text1: 'Code Sent',
        text2: `Check ${email.trim()} (and spam) for your 6-digit code`,
      });
      return true;
    }

    const secondEmailFactor = attempt?.supportedSecondFactors?.find(
      (f: any) => f.strategy === 'email_code'
    );
    if (secondEmailFactor && signIn) {
      await signIn.prepareSecondFactor({ strategy: 'email_code' });
      setPendingCode(true);
      Toast.show({
        type: 'info',
        text1: 'Verification Code Sent',
        text2: `Check ${email.trim()} (and spam) for your 6-digit code`,
      });
      return true;
    }
    return false;
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!useEmailCode && !password) {
      setErrorMsg('Please enter your password or switch to Email Code.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      if (!isLoaded || !signIn) {
        setErrorMsg('Authentication service is initializing. Please try again.');
        return;
      }

      if (useEmailCode) {
        const attempt = await signIn.create({ identifier: email.trim() });
        if (attempt.status === 'complete' && attempt.createdSessionId) {
          await finishSignIn(attempt.createdSessionId);
          return;
        }
        const sent = await sendEmailCodeFactor(attempt);
        if (!sent) {
          setErrorMsg('Email code sign-in is not enabled for this account.');
        }
        return;
      }

      const completeSignIn = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (completeSignIn.status === 'complete' && completeSignIn.createdSessionId) {
        await finishSignIn(completeSignIn.createdSessionId);
      } else {
        const sent = await sendEmailCodeFactor(completeSignIn);
        if (!sent) {
          setErrorMsg('Additional verification is required to complete sign in.');
        }
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Unable to log in. Please check your credentials.';
      setErrorMsg(message);
      Toast.show({
        type: 'error',
        text1: 'Authentication Failed',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!verificationCode.trim()) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      if (!isLoaded || !signIn) {
        setErrorMsg('Authentication service is initializing. Please try again.');
        return;
      }

      const attempt =
        signIn.status === 'needs_second_factor'
          ? await signIn.attemptSecondFactor({
              strategy: 'email_code',
              code: verificationCode.trim(),
            })
          : await signIn.attemptFirstFactor({
              strategy: 'email_code',
              code: verificationCode.trim(),
            });

      if (attempt.status === 'complete' && attempt.createdSessionId) {
        await finishSignIn(attempt.createdSessionId);
      } else {
        const sent = await sendEmailCodeFactor(attempt);
        if (!sent) {
          setErrorMsg('Verification incomplete. Please try again.');
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
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>c</Text>
              <View style={styles.brandLimeCircle} />
              <Text style={styles.brandText}>mmon</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to your communities and private side-chats
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {pendingCode ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>6-digit code sent to {email}</Text>
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
                  onPress={handleVerifyEmailCode}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modeToggleBtn}
                  onPress={() => {
                    setPendingCode(false);
                    setVerificationCode('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>Back to sign in</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <SocialAuthButtons
                  oauthLoading={oauthLoading}
                  disabled={loading}
                  onPressProvider={(strategy) => handleSocialAuth(strategy, setErrorMsg)}
                />

                {/* Auth Mode Segmented Pill */}
                <View style={styles.modeSegment}>
                  <TouchableOpacity
                    style={[
                      styles.modeSegmentItem,
                      !useEmailCode && styles.modeSegmentItemActive,
                    ]}
                    onPress={() => {
                      setUseEmailCode(false);
                      setErrorMsg('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modeSegmentText,
                        !useEmailCode && styles.modeSegmentTextActive,
                      ]}
                    >
                      Password
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeSegmentItem,
                      useEmailCode && styles.modeSegmentItemActive,
                    ]}
                    onPress={() => {
                      setUseEmailCode(true);
                      setErrorMsg('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modeSegmentText,
                        useEmailCode && styles.modeSegmentTextActive,
                      ]}
                    >
                      Email Code
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor={figmaColors.inkMuted}
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

                {/* Password Field */}
                {!useEmailCode ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordInputWrapper}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Enter your password"
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
                ) : null}

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (loading || Boolean(oauthLoading)) && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loading || Boolean(oauthLoading)}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {useEmailCode ? 'Send Email Code' : 'Continue'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Switch to Signup */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Create account</Text>
              </TouchableOpacity>
            </View>
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
  modeSegment: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
  },
  modeSegmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeSegmentItemActive: {
    backgroundColor: '#FFFFFF',
    ...figmaShadows.card,
  },
  modeSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: figmaColors.inkSecondary,
  },
  modeSegmentTextActive: {
    color: figmaColors.ink,
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
  modeToggleBtn: {
    alignItems: 'center',
    marginBottom: 12,
  },
});
