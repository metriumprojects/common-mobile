import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';
import { mobileSocket } from '../api/socket';
import { Community, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create Community Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Community Form
  const [newCommName, setNewCommName] = useState('');
  const [newCommCategory, setNewCommCategory] = useState('SPORT');
  const [newCommLocation, setNewCommLocation] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCommunities = useCallback(async () => {
    try {
      const data = await mobileApi.getCommunities();
      if (data && Array.isArray(data)) {
        setCommunities(data);
      }
      const userRes = await mobileApi.getCurrentUser(user?.id);
      if (userRes) {
        setCurrentUser(userRes);
      }
    } catch (err) {
      console.warn('Error fetching communities:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCommunities();

    const handleNewGroupMessage = (msg: any) => {
      setCommunities((prev) =>
        prev.map((c) => {
          if (c.id !== msg.communityId) return c;
          if (c.groupMessages?.some((m) => m.id === msg.id)) return c;
          return {
            ...c,
            groupMessages: [...(c.groupMessages || []), msg],
          };
        })
      );
    };

    const handleNewPrivateMessage = () => {
      fetchCommunities();
    };

    const handleCommunityCreated = (newComm: Community) => {
      setCommunities((prev) => {
        if (prev.some((c) => c.id === newComm.id)) return prev;
        return [newComm, ...prev];
      });
    };

    const handleJoinUpdated = ({ communityId, isJoined }: any) => {
      setCommunities((prev) =>
        prev.map((c) => (c.id === communityId ? { ...c, isJoined } : c))
      );
    };

    const handleEventUpdated = ({ communityId, event }: any) => {
      setCommunities((prev) =>
        prev.map((c) => (c.id === communityId ? { ...c, event } : c))
      );
    };

    const handleUserUpdated = (updatedUser: UserProfile) => {
      if (user?.id && updatedUser.id === user.id) {
        setCurrentUser(updatedUser);
      }
    };

    mobileSocket.on('new-group-message', handleNewGroupMessage);
    mobileSocket.on('new-private-message', handleNewPrivateMessage);
    mobileSocket.on('private-chat-read', handleNewPrivateMessage);
    mobileSocket.on('community-created', handleCommunityCreated);
    mobileSocket.on('community-join-updated', handleJoinUpdated);
    mobileSocket.on('event-rsvp-updated', handleEventUpdated);
    mobileSocket.on('user-updated', handleUserUpdated);

    return () => {
      mobileSocket.off('new-group-message', handleNewGroupMessage);
      mobileSocket.off('new-private-message', handleNewPrivateMessage);
      mobileSocket.off('private-chat-read', handleNewPrivateMessage);
      mobileSocket.off('community-created', handleCommunityCreated);
      mobileSocket.off('community-join-updated', handleJoinUpdated);
      mobileSocket.off('event-rsvp-updated', handleEventUpdated);
      mobileSocket.off('user-updated', handleUserUpdated);
    };
  }, [fetchCommunities, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommunities();
  };

  const handleCreateCommunity = async () => {
    if (!newCommName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a community name',
      });
      return;
    }
    setCreating(true);
    try {
      const created = await mobileApi.createCommunity({
        name: newCommName.trim(),
        category: newCommCategory || 'GENERAL',
        location: newCommLocation.trim() || 'Local & Online',
        description: newCommDesc.trim() || 'A vibrant community space.',
      });
      setShowCreateModal(false);
      setNewCommName('');
      setNewCommLocation('');
      setNewCommDesc('');
      Toast.show({
        type: 'success',
        text1: 'Community Created!',
        text2: `Welcome to ${created.name}`,
      });
      fetchCommunities();
      navigation.navigate('CommunityChat', { communityId: created.id });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: err?.message || 'Failed to create community',
      });
    } finally {
      setCreating(false);
    }
  };

  const joinedCommunities = communities.filter((c) => c.isJoined !== false);
  const filteredCommunities = joinedCommunities.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  const totalGlobalUnread = joinedCommunities.reduce(
    (sum, c) =>
      sum +
      (c.privateChats?.reduce((acc, pc) => acc + (pc.unreadCount || 0), 0) || 0),
    0
  );

  const renderCommunityCard = ({ item }: { item: Community }) => {
    const totalUnread =
      item.privateChats?.reduce((acc, pc) => acc + (pc.unreadCount || 0), 0) || 0;
    const lastGroupMsg =
      item.groupMessages && item.groupMessages.length > 0
        ? item.groupMessages[item.groupMessages.length - 1]
        : null;
    const latestPrivateChat =
      item.privateChats && item.privateChats.length > 0
        ? item.privateChats[0]
        : null;

    return (
      <View style={styles.communityCard}>
        {/* Community Header Row */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() =>
            navigation.navigate('CommunityChat', { communityId: item.id })
          }
          activeOpacity={0.75}
        >
          <View style={styles.avatarBox}>
            <Image
              source={{
                uri:
                  item.imageUrl ||
                  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=150',
              }}
              style={styles.communityAvatar}
            />
            <View style={styles.onlineCountBadge}>
              <Text style={styles.onlineCountBadgeText}>
                {item.onlineCount || 1}
              </Text>
            </View>
          </View>

          <View style={styles.communityInfo}>
            <View style={styles.categoryOnlineRow}>
              <Text style={styles.categoryLabel}>{item.category}</Text>
              <Text style={styles.metaDot}>•</Text>
              <View style={styles.greenOnlineDot} />
              <Text style={styles.onlineLabel}>{item.onlineCount || 1} online</Text>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.communityName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified ? (
                <View style={styles.verifiedCheck}>
                  <Text style={styles.verifiedCheckText}>✓</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.communityDesc} numberOfLines={1}>
              {item.description || 'Scoped community room and side-chats'}
            </Text>

            <View style={styles.metaStatsRow}>
              <Text style={styles.metaStatText}>
                👥 {item.memberCount || '1.2k'} members
              </Text>
              <Text style={styles.metaStatText} numberOfLines={1}>
                📍 {item.location || 'Global'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.messageActionBtn}
            onPress={() =>
              navigation.navigate('CommunityChat', { communityId: item.id })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.messageActionBtnText}>💬 Message</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Channels & Scoped Side-Chats Section */}
        <View style={styles.channelsContainer}>
          {/* Row 1: Main Group Chat */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() =>
              navigation.navigate('CommunityChat', { communityId: item.id })
            }
            activeOpacity={0.65}
          >
            <View style={styles.avatarStack}>
              <View style={[styles.avatarStackItem, { backgroundColor: '#A7F3D0', zIndex: 3 }]}>
                <Text style={styles.avatarStackText}>A</Text>
              </View>
              <View style={[styles.avatarStackItem, { backgroundColor: '#FEF08A', zIndex: 2, marginLeft: -8 }]}>
                <Text style={styles.avatarStackText}>P</Text>
              </View>
              <View style={[styles.avatarStackItem, { backgroundColor: '#DDD6FE', zIndex: 1, marginLeft: -8 }]}>
                <Text style={styles.avatarStackText}>L</Text>
              </View>
            </View>

            <View style={styles.channelContent}>
              <View style={styles.channelTitleRow}>
                <Text style={styles.channelTagLabel}>GROUP CHAT</Text>
                <Text style={styles.channelTime}>
                  {lastGroupMsg?.timestamp || '2m'}
                </Text>
              </View>
              <Text style={styles.channelSnippet} numberOfLines={1}>
                {lastGroupMsg
                  ? `${lastGroupMsg.senderName.split(' ')[0]}: ${lastGroupMsg.body}`
                  : "Maya: Same loop tomorrow? I'm in!"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Row 2: Private in this community (opens Community Inbox) */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() =>
              navigation.navigate('CommunityInbox', { communityId: item.id })
            }
            activeOpacity={0.7}
          >
            <View style={styles.avatarStack}>
              <View style={[styles.avatarStackItem, { backgroundColor: '#DDD6FE', zIndex: 3 }]}>
                <Text style={styles.avatarStackText}>J</Text>
              </View>
              <View style={[styles.avatarStackItem, { backgroundColor: '#FEF08A', zIndex: 2, marginLeft: -8 }]}>
                <Text style={styles.avatarStackText}>M</Text>
              </View>
              <View style={[styles.avatarStackItem, { backgroundColor: '#A7F3D0', zIndex: 1, marginLeft: -8 }]}>
                <Text style={styles.avatarStackText}>A</Text>
              </View>
            </View>

            <View style={styles.channelContent}>
              <View style={styles.channelTitleRow}>
                <Text style={styles.privateInLabel}>
                  🔒 Private in {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.channelTime}>
                    {latestPrivateChat?.lastMessageTime || '1m'}
                  </Text>
                  <View style={styles.blackBadgeCircle}>
                    <Text style={styles.blackBadgeCircleText}>
                      {totalUnread > 0 ? totalUnread : (item.privateChats?.length || 1)}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.privateCountTitle}>
                {item.privateChats?.length || 10} private chats
              </Text>
              <Text style={styles.channelSnippet} numberOfLines={1}>
                {latestPrivateChat
                  ? `${latestPrivateChat.recipient.name}: ${latestPrivateChat.lastMessage}`
                  : 'John Bell: I can introduce you to everyone when you arri...'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>common</Text>
          <View style={styles.brandDot} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={styles.createHeaderBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createHeaderBtnText}>+ Create</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.userAvatar,
                { backgroundColor: currentUser?.avatarColor || '#059669' },
              ]}
            >
              <Text style={styles.userAvatarText}>
                {currentUser?.initials || user?.name?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.avatarOnlineBadge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Title & Discover Action */}
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderTopRow}>
          <View>
            <Text style={styles.pageTitle}>MY COMMUNITIES</Text>
            <Text style={styles.pageSubtitle}>
              {joinedCommunities.length} joined communities
            </Text>
          </View>

          <TouchableOpacity
            style={styles.discoverMoreBtn}
            onPress={() => navigation.navigate('Discover')}
            activeOpacity={0.8}
          >
            <Text style={styles.discoverMoreBtnText}>🧭 Discover more</Text>
          </TouchableOpacity>
        </View>

        {/* Search My Space */}
        {joinedCommunities.length > 0 ? (
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Filter your communities..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={filteredCommunities}
          keyExtractor={(item) => item.id}
          renderItem={renderCommunityCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={{ fontSize: 28 }}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching communities' : 'No communities yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try another search term or browse Discover.'
                  : 'Create your first community or discover existing spaces to start live channels and scoped side-chats.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  style={styles.emptyCreateButton}
                  onPress={() => setShowCreateModal(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyCreateButtonText}>
                    + Create Space
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emptyDiscoverButton}
                  onPress={() => navigation.navigate('Discover')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyDiscoverButtonText}>
                    🧭 Discover
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}

      {/* Global Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Text style={styles.navIconActive}>🏠</Text>
          <Text style={styles.navLabelActive}>My Space</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Discover')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>🧭</Text>
          <Text style={styles.navLabel}>Discover</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCenterCreateBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.navCenterPlus}>＋</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Activity')}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.navIcon}>🔔</Text>
            {totalGlobalUnread > 0 ? (
              <View style={styles.navBadgeDot} />
            ) : null}
          </View>
          <Text style={styles.navLabel}>Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Me</Text>
        </TouchableOpacity>
      </View>

      {/* Create New Community Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Community</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>COMMUNITY NAME *</Text>
              <TextInput
                style={styles.inputField}
                value={newCommName}
                onChangeText={setNewCommName}
                placeholder="Enter community name..."
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryPillsRow}>
                {['SPORT', 'TECH', 'RUNNING', 'DESIGN', 'MONEY', 'GENERAL'].map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPill,
                        newCommCategory === cat && styles.categoryPillActive,
                      ]}
                      onPress={() => setNewCommCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          newCommCategory === cat &&
                            styles.categoryPillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>LOCATION / REGION</Text>
              <TextInput
                style={styles.inputField}
                value={newCommLocation}
                onChangeText={setNewCommLocation}
                placeholder="City or Online"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput
                style={[
                  styles.inputField,
                  { height: 75, textAlignVertical: 'top' },
                ]}
                value={newCommDesc}
                onChangeText={setNewCommDesc}
                placeholder="What is this community about?"
                placeholderTextColor="#64748B"
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.createSubmitButton,
                  creating && { opacity: 0.7 },
                ]}
                onPress={handleCreateCommunity}
                disabled={creating}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <Text style={styles.createSubmitButtonText}>
                    Create Community
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.6,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginTop: 4,
  },
  avatarButton: {
    position: 'relative',
    padding: 2,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  avatarOnlineBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pageHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  pageHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    marginTop: 2,
  },
  discoverMoreBtn: {
    backgroundColor: '#EBF8EE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  discoverMoreBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    paddingVertical: 2,
  },
  clearSearchText: {
    color: '#9CA3AF',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EAECF0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  avatarBox: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
  },
  communityAvatar: {
    width: '100%',
    height: '100%',
  },
  onlineCountBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#C6F158',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineCountBadgeText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '800',
  },
  communityInfo: {
    flex: 1,
  },
  categoryOnlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  metaDot: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  greenOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    flexShrink: 1,
  },
  verifiedCheck: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheckText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  communityDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  metaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaStatText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  messageActionBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  messageActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  channelsContainer: {
    paddingVertical: 8,
    gap: 4,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarStackItem: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStackText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  channelContent: {
    flex: 1,
  },
  channelTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  channelTagLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  channelTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  channelSnippet: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
  privateInLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  blackBadgeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackBadgeCircleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  privateCountTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  createHeaderBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  createHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBF8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyCreateButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyDiscoverButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyDiscoverButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    flex: 1,
  },
  navIcon: {
    fontSize: 18,
    opacity: 0.65,
  },
  navIconActive: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  navLabelActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  navCenterCreateBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  navCenterPlus: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  navBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  modalTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  modalTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  modalTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalTabBtnTextActive: {
    color: '#111827',
    fontWeight: '800',
  },
  modalScroll: {
    paddingBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  inputField: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryPillText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  createSubmitButton: {
    backgroundColor: '#111827',
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  createSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
