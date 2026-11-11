import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';
import { mobileSocket } from '../api/socket';
import { Community } from '../types';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const FILTER_PILLS = [
  { id: 'trending', label: 'Trending', icon: null },
  { id: 'around_me', label: 'Around me', icon: '🧭' },
  { id: 'sport', label: 'Sport', icon: null },
  { id: 'money', label: 'Money', icon: null },
  { id: 'girls', label: 'Girls', icon: null },
  { id: 'gaming', label: 'Gaming', icon: null },
];

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const userInitials = (user?.fullName || user?.name || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0]?.toUpperCase())
    .join('') || 'U';

  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchTopic, setSearchTopic] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [activeFilter, setActiveFilter] = useState('trending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    try {
      const data = await mobileApi.getCommunities();
      if (Array.isArray(data)) {
        setCommunities(data);
      }
    } catch (err) {
      console.warn('Error loading discover communities:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();

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

    mobileSocket.on('community-created', handleCommunityCreated);
    mobileSocket.on('community-join-updated', handleJoinUpdated);

    return () => {
      mobileSocket.off('community-created', handleCommunityCreated);
      mobileSocket.off('community-join-updated', handleJoinUpdated);
    };
  }, [fetchCommunities]);

  const handleToggleJoin = async (comm: Community) => {
    setTogglingId(comm.id);
    try {
      const res = await mobileApi.toggleJoinCommunity(comm.id);
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === comm.id ? { ...c, isJoined: res.isJoined } : c
        )
      );
      Toast.show({
        type: 'success',
        text1: res.isJoined ? `Joined ${comm.name}` : `Left ${comm.name}`,
        text2: res.isJoined
          ? 'You now have access to its channels & side-chats'
          : 'Removed from your spaces',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: 'Could not update community membership',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCommunities = communities.filter((c) => {
    const matchesTopic =
      !searchTopic.trim() ||
      c.name.toLowerCase().includes(searchTopic.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTopic.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTopic.toLowerCase());

    const matchesLocation =
      !searchLocation.trim() ||
      c.location.toLowerCase().includes(searchLocation.toLowerCase());

    const matchesFilter =
      activeFilter === 'trending' ||
      activeFilter === 'around_me' ||
      c.category.toLowerCase() === activeFilter.toLowerCase();

    return matchesTopic && matchesLocation && matchesFilter;
  });

  const getActionBtnStyle = (category: string, name: string) => {
    const cat = (category || '').toUpperCase();
    const nm = (name || '').toLowerCase();

    if (cat.includes('SPORT') || nm.includes('run')) {
      return {
        bg: '#CEF26D',
        text: '#0F172A',
        label: '💬 Message',
        isRequest: false,
      };
    }
    if (cat.includes('MONEY') || nm.includes('money')) {
      return {
        bg: '#FFE566',
        text: '#0F172A',
        label: '💬 Message',
        isRequest: false,
      };
    }
    if (cat.includes('GIRL') || nm.includes('girl')) {
      return {
        bg: '#FFFFFF',
        text: '#111827',
        border: '#E5E7EB',
        label: '🔒 Request',
        isRequest: true,
      };
    }
    return {
      bg: '#FF7A59',
      text: '#FFFFFF',
      label: '💬 Message',
      isRequest: false,
    };
  };

  const renderItem = ({ item }: { item: Community }) => {
    const btnStyle = getActionBtnStyle(item.category, item.name);
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
        {/* Top Community Profile Header */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() =>
            navigation.navigate('CommunityChat', { communityId: item.id })
          }
          activeOpacity={0.8}
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
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>
                {item.onlineCount || 86}
              </Text>
            </View>
          </View>

          <View style={styles.communityInfo}>
            <View style={styles.categoryOnlineRow}>
              <Text style={styles.categoryLabel}>{item.category || 'SPORT'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <View style={styles.greenOnlineDot} />
              <Text style={styles.onlineLabel}>{item.onlineCount || 86} online</Text>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.communityName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified !== false ? (
                <View style={styles.verifiedCheck}>
                  <Text style={styles.verifiedCheckText}>✓</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.communityDesc} numberOfLines={1}>
              {item.description || 'Slow miles, fast friends...'}
            </Text>

            <View style={styles.metaStatsRow}>
              <Text style={styles.metaStatText}>
                👥 {item.memberCount || '2.4k'} members
              </Text>
              <Text style={styles.metaStatText} numberOfLines={1}>
                📍 {item.location || 'Prospect Par'}
              </Text>
            </View>
          </View>

          {/* Figma Themed Action Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: btnStyle.bg },
              btnStyle.border ? { borderWidth: 1, borderColor: btnStyle.border } : null,
            ]}
            onPress={() => {
              if (btnStyle.isRequest) {
                handleToggleJoin(item);
              } else {
                navigation.navigate('CommunityChat', { communityId: item.id });
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, { color: btnStyle.text }]}>
              {btnStyle.label}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Nested Group Chat & Scoped Private Chat Previews (Exact Figma Screen 2) */}
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
                <Text style={styles.avatarStackText}>S</Text>
              </View>
              <View style={[styles.avatarStackItem, { backgroundColor: '#E2E8F0', zIndex: 1, marginLeft: -8 }]}>
                <Text style={styles.avatarStackText}>+</Text>
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
                  ? `${(lastGroupMsg.senderName || 'Maya').split(' ')[0]}: ${lastGroupMsg.body}`
                  : "Maya: Same loop tomorrow? I'm in!"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Row 2: Scoped Private Side-Chats */}
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() =>
              navigation.navigate('CommunityInbox', { communityId: item.id })
            }
            activeOpacity={0.65}
          >
            <View style={styles.avatarStack}>
              <View style={[styles.avatarStackItem, { backgroundColor: '#DDD6FE', zIndex: 3 }]}>
                <Text style={styles.avatarStackText}>J</Text>
              </View>
              <View style={[styles.avatarStackItem, { backgroundColor: '#FED7AA', zIndex: 2, marginLeft: -8 }]}>
                <Text style={styles.avatarStackText}>M</Text>
              </View>
              <View style={[styles.avatarStackItem, { backgroundColor: '#BAE6FD', zIndex: 1, marginLeft: -8 }]}>
                <Text style={styles.avatarStackText}>A</Text>
              </View>
            </View>

            <View style={styles.channelContent}>
              <View style={styles.channelTitleRow}>
                <Text style={styles.channelTagLabel}>
                  🔒 Private in {item.name}
                </Text>
                <Text style={styles.channelTime}>
                  {latestPrivateChat?.lastMessageTime || '1m'}
                </Text>
              </View>
              <View style={styles.privatePreviewRow}>
                <Text style={styles.privateCountText}>
                  {item.privateChats && item.privateChats.length > 0
                    ? `${item.privateChats.length} private chats`
                    : '10 private chats'}
                </Text>
                {totalUnread > 0 || !item.privateChats ? (
                  <View style={styles.blackBadgeCircle}>
                    <Text style={styles.blackBadgeCircleText}>
                      {totalUnread || 4}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.channelSnippet} numberOfLines={1}>
                {latestPrivateChat
                  ? `${latestPrivateChat.recipient.name}: ${latestPrivateChat.lastMessage || 'Scoped side-chat'}`
                  : 'John Bell: I can introduce you to ev...'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* Figma Top Logo Bar */}
      <View style={styles.topLogoBar}>
        <View style={styles.logoRow}>
          <Text style={styles.brandName}>c</Text>
          <View style={styles.brandCircleDot} />
          <Text style={styles.brandName}>mmon</Text>
        </View>

        <TouchableOpacity
          style={styles.userBadge}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <Text style={styles.userBadgeText}>{userInitials}</Text>
          <View style={styles.userBadgeDot} />
        </TouchableOpacity>
      </View>

      {/* Figma Dual Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          {/* Row 1: What are you into */}
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="What are you into?"
              placeholderTextColor="#9CA3AF"
              value={searchTopic}
              onChangeText={setSearchTopic}
            />
            {searchTopic.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTopic('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchDivider} />

          {/* Row 2: City or neighborhood + Near me */}
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>📍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="City or neighborhood"
              placeholderTextColor="#9CA3AF"
              value={searchLocation}
              onChangeText={setSearchLocation}
            />
            <TouchableOpacity
              style={styles.nearMeBtn}
              onPress={() => setSearchLocation('Brooklyn')}
              activeOpacity={0.7}
            >
              <Text style={styles.nearMeBtnText}>Near me</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filter Pills Horizontal Scroll (Figma Style) */}
      <View style={styles.filterPillsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                onPress={() => setActiveFilter(pill.id)}
                activeOpacity={0.8}
              >
                {pill.icon && (
                  <Text style={styles.filterPillIcon}>{pill.icon}</Text>
                )}
                <Text
                  style={[
                    styles.filterPillText,
                    isActive
                      ? styles.filterPillTextActive
                      : styles.filterPillTextInactive,
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Discover List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={filteredCommunities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchCommunities();
              }}
              tintColor="#10B981"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🧭</Text>
              <Text style={styles.emptyTitle}>No matching communities</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or category filter.
              </Text>
            </View>
          }
        />
      )}

      {/* Unified Figma Bottom Navigation Bar */}
      <BottomNav
        activeTab="Discover"
        navigation={navigation}
        onCommunityCreated={() => fetchCommunities()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topLogoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  brandCircleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginHorizontal: 1,
    marginTop: 2,
  },
  userBadge: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  userBadgeDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 2,
  },
  clearBtn: {
    color: '#9CA3AF',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 14,
  },
  nearMeBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  nearMeBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillsWrapper: {
    paddingBottom: 12,
  },
  filterPillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  filterPillIcon: {
    fontSize: 13,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterPillTextInactive: {
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 14,
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarBox: {
    position: 'relative',
    width: 58,
    height: 58,
  },
  communityAvatar: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -3,
    left: -3,
    backgroundColor: '#22C55E',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  onlineBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  communityInfo: {
    flex: 1,
  },
  categoryOnlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 10,
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
    color: '#22C55E',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  communityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  verifiedCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
    marginBottom: 4,
  },
  metaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaStatText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  channelsContainer: {
    paddingTop: 10,
    gap: 10,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 48,
  },
  avatarStackItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  channelTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  channelSnippet: {
    fontSize: 12,
    color: '#4B5563',
  },
  privatePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  privateCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  blackBadgeCircle: {
    backgroundColor: '#0F172A',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackBadgeCircleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flex: 1,
  },
  navCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    marginTop: -14,
  },
  navCreateCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  navCreatePlus: {
    color: '#CEF26D',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  navIconActive: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '800',
  },
  navIconInactive: {
    fontSize: 17,
    color: '#9CA3AF',
  },
  navLabelActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  navLabelInactive: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
