import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';
import { mobileSocket } from '../api/socket';
import { Community, PrivateSideChat } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeftIcon,
  LockIcon,
  SearchIcon,
  CloseIcon,
} from '../components/FigmaIcons';
import { figmaColors } from '../theme/figmaTheme';

export default function CommunityInboxScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { communityId } = route.params || {};

  const [community, setCommunity] = useState<Community | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Start New Side-Chat Modal State
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('Community Member');
  const [firstMessage, setFirstMessage] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const all = await mobileApi.getCommunities(user?.id);
      const found = all.find((c) => c.id === communityId) || all[0];
      if (found) {
        setCommunity(found);
      }
    } catch (err) {
      console.warn('Error fetching community inbox:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId, user?.id]);

  useEffect(() => {
    fetchInbox();

    const handleNewPrivMsg = () => {
      fetchInbox();
    };

    const handleChatRead = () => {
      fetchInbox();
    };

    mobileSocket.on('new-private-message', handleNewPrivMsg);
    mobileSocket.on('private-chat-read', handleChatRead);

    return () => {
      mobileSocket.off('new-private-message', handleNewPrivMsg);
      mobileSocket.off('private-chat-read', handleChatRead);
    };
  }, [fetchInbox]);

  const handleOpenChat = async (chat: PrivateSideChat) => {
    try {
      if (chat.unreadCount > 0 && community) {
        await mobileApi.markPrivateChatRead(community.id, chat.recipient.id);
      }
    } catch (_) {}

    navigation.navigate('PrivateChat', {
      communityId: community?.id || communityId,
      recipientId: chat.recipient.id,
      recipientName: chat.recipient.name,
      recipientRole: chat.recipient.role,
      recipientAvatarColor: chat.recipient.avatarColor,
    });
  };

  const handleStartNewSideChat = async () => {
    if (!memberName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Member Name Required',
        text2: 'Enter the name of the community member to message',
      });
      return;
    }

    setStartingChat(true);
    try {
      const recipientId = `member-${memberName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const initials = memberName
        .trim()
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B', '#10B981'];
      const avatarColor = colors[memberName.length % colors.length];

      const senderData = {
        id: user?.id || 'me',
        name: user?.name || user?.fullName || 'Community Member',
        initials: (user?.name || user?.fullName || 'U')[0].toUpperCase(),
        avatarColor: '#059669',
      };

      const msgText =
        firstMessage.trim() ||
        `Hey ${memberName.trim()}! Great connecting with you in ${
          community?.name || 'this community'
        }.`;

      await mobileApi.sendPrivateMessage(
        community?.id || communityId,
        recipientId,
        msgText,
        senderData,
        undefined,
        {
          name: memberName.trim(),
          initials,
          avatarColor,
          role: memberRole.trim() || 'Community Member',
        }
      );

      setShowNewChatModal(false);
      const targetName = memberName.trim();
      const targetRole = memberRole.trim() || 'Community Member';
      setMemberName('');
      setFirstMessage('');

      await fetchInbox();

      navigation.navigate('PrivateChat', {
        communityId: community?.id || communityId,
        recipientId,
        recipientName: targetName,
        recipientRole: targetRole,
        recipientAvatarColor: avatarColor,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error Starting Side-Chat',
        text2: 'Please try again',
      });
    } finally {
      setStartingChat(false);
    }
  };

  // Extract unique members from group messages so user can also tap to message them
  const activeGroupSenders = React.useMemo(() => {
    if (!community?.groupMessages) return [];
    const map = new Map<
      string,
      { id: string; name: string; initials: string; avatarColor: string; role: string }
    >();
    community.groupMessages.forEach((m) => {
      if (user?.id ? m.senderId !== user.id : true) {
        map.set(m.senderId, {
          id: m.senderId,
          name: m.senderName,
          initials: m.senderInitials || m.senderName[0] || 'M',
          avatarColor: m.senderAvatarColor || '#6366F1',
          role: m.senderRole || 'Community Member',
        });
      }
    });
    return Array.from(map.values());
  }, [community, user?.id]);

  const sideChats = community?.privateChats || [];
  const totalUnread = sideChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const filteredChats = sideChats.filter((chat) => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      chat.recipient.name.toLowerCase().includes(term) ||
      (chat.recipient.role || '').toLowerCase().includes(term) ||
      (chat.lastMessage || '').toLowerCase().includes(term)
    );
  });

  const renderChatRow = ({ item }: { item: PrivateSideChat }) => (
    <TouchableOpacity
      style={[
        styles.chatRow,
        item.unreadCount > 0 && styles.chatRowUnread,
      ]}
      onPress={() => handleOpenChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: item.recipient.avatarColor || '#6366F1' },
          ]}
        >
          <Text style={styles.avatarText}>
            {item.recipient.initials || item.recipient.name[0]}
          </Text>
        </View>
        {item.recipient.online ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.chatDetails}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.recipientName}>{item.recipient.name}</Text>
          <Text style={styles.timeText}>{item.lastMessageTime || 'Just now'}</Text>
        </View>

        <Text
          style={[
            styles.lastMessageText,
            item.unreadCount > 0 && styles.lastMessageUnread,
          ]}
          numberOfLines={1}
        >
          {item.lastMessage || 'Scoped private conversation'}
        </Text>

        <Text style={styles.roleText} numberOfLines={1}>
          {item.recipient.role || 'Community Member'}
        </Text>
      </View>

      {item.unreadCount > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={20} color={figmaColors.ink} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Private chats</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {community?.name || 'Community Inbox'}
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={figmaColors.ink} />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Scoped Community Inbox Banner */}
              <View style={styles.inboxBanner}>
                <Image
                  source={{
                    uri:
                      community?.imageUrl ||
                      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=150',
                  }}
                  style={styles.bannerImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Community inbox</Text>
                  <Text style={styles.bannerCommName}>
                    {community?.name || 'Scoped Space'}
                  </Text>
                  <View style={styles.bannerLockRow}>
                    <LockIcon size={12} color={figmaColors.inkSecondary} />
                    <Text style={styles.bannerLockText}>
                      {sideChats.length} private chats · {totalUnread} unread
                    </Text>
                  </View>
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBox}>
                <SearchIcon size={17} color={figmaColors.inkMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search private chats"
                  placeholderTextColor={figmaColors.inkInactive}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                {searchTerm.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <CloseIcon size={15} color={figmaColors.inkMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent</Text>
                <View style={styles.visibilityTag}>
                  <View style={styles.greenDotSmall} />
                  <Text style={styles.visibilityText}>Only visible to you</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={{ marginBottom: 10 }}>
                <LockIcon size={28} color={figmaColors.inkMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchTerm
                  ? `No chats matching "${searchTerm}"`
                  : 'No scoped private chats yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Tap any member's name inside the community chat room to start a 1-on-1 private chat with them.
              </Text>
              <TouchableOpacity
                style={styles.startFirstBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Text style={styles.startFirstBtnText}>
                  Back to Community Room
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Start New Scoped Side-Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start Scoped Side-Chat</Text>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <CloseIcon size={18} color={figmaColors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={[styles.scopedNote, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <LockIcon size={14} color={figmaColors.inkOlive} />
                <Text style={[styles.scopedNoteText, { flex: 1 }]}>
                  This 1-on-1 conversation will be scoped inside{' '}
                  <Text style={{ fontWeight: '800', color: figmaColors.inkOlive }}>
                    {community?.name}
                  </Text>
                  .
                </Text>
              </View>

              {activeGroupSenders.length > 0 ? (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.label}>QUICK PICK FROM CHANNEL MEMBERS</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  >
                    {activeGroupSenders.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.memberChip}
                        onPress={() => {
                          setMemberName(m.name);
                          setMemberRole(m.role);
                        }}
                      >
                        <View
                          style={[
                            styles.memberChipAvatar,
                            { backgroundColor: m.avatarColor },
                          ]}
                        >
                          <Text style={styles.memberChipInitials}>
                            {m.initials}
                          </Text>
                        </View>
                        <Text style={styles.memberChipName}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <Text style={styles.label}>MEMBER NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maya Chen, Jordan Vance"
                placeholderTextColor="#64748B"
                value={memberName}
                onChangeText={setMemberName}
              />

              <Text style={styles.label}>MEMBER ROLE / TAGLINE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pace Leader • 8:30/mi, Product Designer"
                placeholderTextColor="#64748B"
                value={memberRole}
                onChangeText={setMemberRole}
              />

              <Text style={styles.label}>FIRST MESSAGE</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                placeholder="Say hello or ask a question..."
                placeholderTextColor="#64748B"
                value={firstMessage}
                onChangeText={setFirstMessage}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  startingChat && { opacity: 0.6 },
                ]}
                onPress={handleStartNewSideChat}
                disabled={startingChat}
                activeOpacity={0.85}
              >
                {startingChat ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Launch Private Side-Chat
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
  backBtn: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backBtnText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  newChatBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newChatBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  inboxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: figmaColors.sageBanner,
    borderWidth: 1,
    borderColor: figmaColors.borderAccent,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  bannerImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: figmaColors.inkSecondary,
  },
  bannerCommName: {
    fontSize: 15,
    color: figmaColors.ink,
    fontWeight: '700',
  },
  bannerLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  bannerLockText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    paddingVertical: 2,
  },
  clearBtn: {
    color: '#9CA3AF',
    fontSize: 14,
    paddingHorizontal: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  visibilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  visibilityText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chatRowUnread: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatDetails: {
    flex: 1,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  lastMessageText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 3,
  },
  lastMessageUnread: {
    color: '#111827',
    fontWeight: '700',
  },
  roleText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#0F172A',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  startFirstBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    marginBottom: 14,
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
  scopedNote: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAECF0',
    marginBottom: 12,
  },
  scopedNoteText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
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
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberChipInitials: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '800',
  },
  memberChipName: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

