import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useClerk } from '@clerk/clerk-expo';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';
import {
  getCachedCommunities,
  setCachedCommunities,
  getCachedUser,
  setCachedUser,
} from '../api/dataCache';
import { mobileSocket } from '../api/socket';
import { Community, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import BottomSheetModal from '../components/BottomSheetModal';
import {
  VerifiedBadge,
  LockIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
} from '../components/FigmaIcons';
import { figmaColors } from '../theme/figmaTheme';

const AVATAR_COLORS = [
  '#059669',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#D97706',
  '#DC2626',
  '#0891B2',
];

const ROLE_PRESETS = [
  'Verified Member',
  'Pace Leader • 8:30/mi',
  'Community Host',
  'Product Designer',
  'Tech Builder',
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useClerk();
  const { user, login, token, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(
    () => getCachedUser(user?.id)
  );
  const [communities, setCommunities] = useState<Community[]>(
    () => getCachedCommunities(user?.id) || []
  );
  const [dbStatus, setDbStatus] = useState('MongoDB Atlas Active');
  const [socketConnected, setSocketConnected] = useState(mobileSocket.connected);
  const [loading, setLoading] = useState(
    () => !getCachedUser(user?.id) && !getCachedCommunities(user?.id)
  );
  const [loggingOut, setLoggingOut] = useState(false);

  // Notification toggles
  const [notifyChannels, setNotifyChannels] = useState(true);
  const [notifySideChats, setNotifySideChats] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);

  // Edit Profile Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editColor, setEditColor] = useState('#059669');
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [uRes, commRes, healthRes] = await Promise.all([
        mobileApi.getCurrentUser(user?.id).catch(() => null),
        mobileApi.getCommunities(user?.id).catch(() => []),
        mobileApi.getHealth().catch(() => null),
      ]);

      if (uRes) {
        setProfile(uRes);
        setCachedUser(user?.id, uRes);
        setEditName(uRes.name || '');
        setEditRole(uRes.role || 'Verified Member');
        setEditBio(uRes.bio || 'Community Member & Builder');
        setEditColor(uRes.avatarColor || '#059669');
      } else {
        const fallbackName = user?.fullName || user?.name || 'Community Member';
        setEditName(fallbackName);
        setEditRole(user?.role || 'Verified Member');
        setEditBio('Community Member & Builder');
      }

      if (Array.isArray(commRes)) {
        setCommunities(commRes);
        setCachedCommunities(user?.id, commRes);
      }

      if (healthRes?.database) {
        setDbStatus(healthRes.database);
      }
    } catch (err) {
      console.warn('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    mobileSocket.on('connect', onConnect);
    mobileSocket.on('disconnect', onDisconnect);

    return () => {
      mobileSocket.off('connect', onConnect);
      mobileSocket.off('disconnect', onDisconnect);
    };
  }, [fetchData]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Name Required',
        text2: 'Please enter your display name',
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await mobileApi.updateProfile({
        id: profile?.id || user?.id || 'me',
        clerkId: user?.clerkId || user?.id,
        name: editName.trim(),
        email: profile?.email || user?.email,
        role: editRole.trim() || 'Verified Member',
        bio: editBio.trim(),
        avatarColor: editColor,
      });

      setProfile(updated);
      if (token) {
        await login(token, {
          ...user,
          name: updated.name,
          fullName: updated.name,
          initials: updated.initials,
          role: updated.role,
          avatarColor: updated.avatarColor,
        });
      }

      setShowEditModal(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your changes have been saved',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not save profile changes',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      if (signOut) {
        await signOut();
      }
      await logout();

      Toast.show({
        type: 'info',
        text1: 'Signed Out',
        text2: 'You have been successfully logged out',
      });
    } catch (err) {
      console.warn('Sign out error:', err);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your Common profile, remove you from all communities, and delete your private side-chats. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await mobileApi.deleteAccount();
              if (signOut) {
                await signOut();
              }
              await logout();
              Toast.show({
                type: 'info',
                text1: 'Account Deleted',
                text2: 'Your account and profile data have been removed.',
              });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Deletion Failed',
                text2: 'Could not delete your account. Please try again.',
              });
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const joinedCommunities = communities.filter((c) => c.isJoined !== false);
  const totalSideChats = joinedCommunities.reduce(
    (sum, c) => sum + (c.privateChats?.length || 0),
    0
  );

  const displayName =
    profile?.name || user?.fullName || user?.name || 'Community Member';
  const displayEmail = profile?.email || user?.email || 'Verified Account';
  const displayInitials =
    profile?.initials ||
    displayName
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ||
    'U';
  const displayRole = profile?.role || user?.role || 'Verified Member';
  const displayBio =
    profile?.bio || 'Community Member & Builder';
  const displayColor = profile?.avatarColor || '#059669';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={20} color={figmaColors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile & Settings</Text>
        <TouchableOpacity
          style={styles.editHeaderBtn}
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.editHeaderBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={figmaColors.ink} />
          </View>
        ) : (
          <>
            {/* Profile Avatar Card */}
            <View style={styles.profileCard}>
              <View
                style={[
                  styles.avatarLarge,
                  { backgroundColor: displayColor },
                ]}
              >
                <Text style={styles.avatarLargeText}>{displayInitials}</Text>
              </View>

              <View style={styles.nameVerifiedRow}>
                <Text style={styles.nameText}>{displayName}</Text>
                <VerifiedBadge size={16} />
              </View>

              <Text style={styles.emailText}>{displayEmail}</Text>
              <Text style={styles.bioText}>{displayBio}</Text>

              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {displayRole} • {joinedCommunities.length} Communities
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.customizeBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                onPress={() => setShowEditModal(true)}
                activeOpacity={0.8}
              >
                <EditIcon size={14} color={figmaColors.ink} />
                <Text style={styles.customizeBtnText}>
                  Edit Profile & Role
                </Text>
              </TouchableOpacity>
            </View>

            {/* Real Dynamic Stats Row */}
            <View style={styles.statsContainer}>
              <TouchableOpacity
                style={styles.statBox}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.statNumber}>{joinedCommunities.length}</Text>
                <Text style={styles.statLabel}>Communities</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity
                style={styles.statBox}
                onPress={() => {
                  if (joinedCommunities[0]) {
                    navigation.navigate('CommunityInbox', {
                      communityId: joinedCommunities[0].id,
                    });
                  }
                }}
              >
                <Text style={styles.statNumber}>{totalSideChats}</Text>
                <Text style={styles.statLabel}>Side-Chats</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {profile?.joinedDate || 'Nov 2026'}
                </Text>
                <Text style={styles.statLabel}>Member Since</Text>
              </View>
            </View>

            {/* About Side-Chats Card */}
            <View style={styles.aboutCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <LockIcon size={14} color={figmaColors.inkOlive} />
                <Text style={styles.aboutTitle}>About Scoped Side-Chats</Text>
              </View>
              <Text style={styles.aboutBody}>
                In <Text style={{ fontWeight: '800', color: '#10B981' }}>common</Text>, all 1-to-1 chats are connected to the communities you share with each person. No generic direct message chaos.
              </Text>
            </View>

            {/* My Joined Communities Quick List */}
            {joinedCommunities.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>MY JOINED SPACES</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Discover')}
                  >
                    <Text style={styles.sectionLink}>+ Discover</Text>
                  </TouchableOpacity>
                </View>

                {joinedCommunities.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.commRow}
                    onPress={() =>
                      navigation.navigate('CommunityChat', {
                        communityId: c.id,
                      })
                    }
                  >
                    <View>
                      <Text style={styles.commRowName}>{c.name}</Text>
                      <Text style={styles.commRowMeta}>
                        {c.category} • {c.location}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={styles.commRowArrow}>Open</Text>
                      <ChevronRightIcon size={14} color={figmaColors.inkOlive} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Notification Preferences */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>NOTIFICATION SETTINGS</Text>

              <View style={styles.switchRow}>
                <Text style={styles.infoLabel}>Community Channel Posts</Text>
                <Switch
                  value={notifyChannels}
                  onValueChange={setNotifyChannels}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor="#F8FAFC"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.infoLabel}>Scoped 1-on-1 Side-Chats</Text>
                <Switch
                  value={notifySideChats}
                  onValueChange={setNotifySideChats}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor="#F8FAFC"
                />
              </View>

              <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Weekly Meetup Reminders</Text>
                <Switch
                  value={notifyEvents}
                  onValueChange={setNotifyEvents}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor="#F8FAFC"
                />
              </View>
            </View>

            {/* System & Auth Details Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>SYSTEM & AUTHENTICATION</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Auth Provider</Text>
                <Text style={styles.infoValue}>Clerk Universal Auth</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Database Persistence</Text>
                <Text style={styles.infoValue}>{dbStatus}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Real-time Socket</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: socketConnected ? '#10B981' : '#F59E0B' },
                  ]}
                >
                  {socketConnected ? '● Connected' : '○ Reconnecting'}
                </Text>
              </View>
            </View>

            {/* Privacy & Data Handling */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>PRIVACY & DATA</Text>
              <Text style={styles.privacyText}>
                Private side-chats are scoped strictly to you and the recipient. You can permanently delete your account and remove your profile data at any time below.
              </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.logoutButton, loggingOut && styles.buttonDisabled]}
              onPress={handleSignOut}
              disabled={loggingOut || deletingAccount}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Log Out"
            >
              {loggingOut ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <Text style={styles.logoutButtonText}>Log Out</Text>
              )}
            </TouchableOpacity>

            {/* Delete Account Button (App Store 5.1.1(v)) */}
            <TouchableOpacity
              style={[styles.deleteButton, deletingAccount && styles.buttonDisabled]}
              onPress={handleDeleteAccount}
              disabled={loggingOut || deletingAccount}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Delete Account"
            >
              {deletingAccount ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <BottomSheetModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        scrollable={false}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <CloseIcon size={18} color={figmaColors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>AVATAR COLOR</Text>
              <View style={styles.colorRow}>
                {AVATAR_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      editColor === c && styles.colorCircleActive,
                    ]}
                    onPress={() => setEditColor(c)}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>DISPLAY NAME *</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>COMMUNITY ROLE / HEADLINE</Text>
              <TextInput
                style={styles.input}
                value={editRole}
                onChangeText={setEditRole}
                placeholder="e.g. Pace Leader • 8:30/mi"
                placeholderTextColor="#64748B"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginTop: 8 }}
              >
                {ROLE_PRESETS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={styles.presetChip}
                    onPress={() => setEditRole(r)}
                  >
                    <Text style={styles.presetChipText}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>BIO</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Short bio shared in your communities..."
                placeholderTextColor="#64748B"
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
      </BottomSheetModal>
      {/* Unified Figma Bottom Navigation Bar */}
      <BottomNav
        activeTab="Profile"
        navigation={navigation}
        onCommunityCreated={() => fetchData()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  editHeaderBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editHeaderBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  verifiedDot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  emailText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#EAF8E8',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1F2D9',
    marginBottom: 12,
  },
  roleBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  customizeBtn: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  customizeBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  aboutCard: {
    backgroundColor: '#EAF8E8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1F2D9',
  },
  aboutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  aboutBody: {
    fontSize: 12,
    color: '#065F46',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  sectionLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  commRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  commRowMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  commRowArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  modalClose: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
  },
  presetChip: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  presetChipText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
