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

export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { login } = useAuth();
  const { handleSocialAuth, oauthLoading } = useSocialAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

          // Sync with MongoDB Atlas
          await mobileApi.syncUser({
            clerkId: completeSignUp.createdSessionId,
            email: email.trim(),
            name: fullName.trim(),
          });

          Toast.show({
            type: 'success',
            text1: 'Account Verified',
            text2: 'Welcome to Common Community Platform',
          });

          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
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
          <View style={styles.header}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>GET STARTED</Text>
            </View>
            <Text style={styles.title}>
              {pendingVerification ? 'Verify email' : 'Create account'}
            </Text>
            <Text style={styles.subtitle}>
              {pendingVerification
                ? `Enter the code sent to ${email}`
                : 'Join communities and engage in scoped real-time side-chats'}
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
                  <TextInput
                    style={styles.input}
                    placeholder="Create a secure password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    autoCapitalize="none"
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      if (errorMsg) setErrorMsg('');
                    }}
                  />
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
    backgroundColor: '#0F172A',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 32,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorBanner: {
    backgroundColor: '#451A1A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  primaryButton: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendBtnText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  linkText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
});
