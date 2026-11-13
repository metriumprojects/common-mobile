import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';
import {
  getCachedCommunities,
  setCachedCommunities,
  hydrateCommunitiesFromDisk,
} from '../api/dataCache';
import { mobileSocket } from '../api/socket';
import { Community, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeftIcon,
  InfoIcon,
  SearchIcon,
  CloseIcon,
  PinIcon,
  UsersIcon,
  LockIcon,
  CalendarIcon,
  CheckIcon,
  ReplyIcon,
  ChatBubbleIcon,
  PlusIcon,
  SendIcon,
  ThumbsUpIcon,
  SmileIcon,
  TrashIcon,
  FlagIcon,
  BookmarkIcon,
  ShieldIcon,
} from '../components/FigmaIcons';
import { figmaColors, figmaShadows } from '../theme/figmaTheme';

export default function CommunityChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { communityId } = route.params || {};

  const initialCommunity = (() => {
    const cached = getCachedCommunities(user?.id);
    return cached?.find((c) => c.id === communityId) || null;
  })();

  const [community, setCommunity] = useState<Community | null>(initialCommunity);
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialCommunity?.groupMessages || []
  );
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(!initialCommunity);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // In-Chat Search & Online Presence
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // Multi-Emoji Reactions
  const [reactionTargetMessage, setReactionTargetMessage] = useState<ChatMessage | null>(null);
  const EMOJI_LIST = ['👍', '❤️', '🔥', '😂', '🎉', '👏'];

  // Modals & Popovers
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    initials: string;
    avatarColor: string;
    role: string;
  } | null>(null);
  const [commentingMessage, setCommentingMessage] = useState<ChatMessage | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Pin / Event / Edit Community Modal
  const [manageMode, setManageMode] = useState<'pin' | 'event' | 'edit' | null>(null);
  const [pinText, setPinText] = useState('');
  const [eventTag, setEventTag] = useState('TONIGHT • 6:30 PM');
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const isCommunityAdmin = Boolean(
    user?.id &&
      community &&
      (community.creatorId === user.id ||
        (Array.isArray(community.moderators) && community.moderators.includes(user.id)) ||
        (!community.creatorId && community.isJoined))
  );

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);

  const fetchCommunityData = useCallback(async () => {
    try {
      setLoadError(false);
      if (!getCachedCommunities(user?.id)) {
        const disk = await hydrateCommunitiesFromDisk(user?.id);
        const diskComm = disk?.find((c) => c.id === communityId);
        if (diskComm) {
          setCommunity(diskComm);
          setMessages(diskComm.groupMessages || []);
          setLoading(false);
        }
      }
      const all = await mobileApi.getCommunities(user?.id);
      if (Array.isArray(all)) {
        setCachedCommunities(user?.id, all);
      }
      const current = all.find((c) => c.id === communityId) || all[0];
      if (current) {
        setCommunity(current);
        setMessages(current.groupMessages || []);
        setLoadError(false);
      }
    } catch (err) {
      console.warn('Error loading community chat:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [communityId, user?.id]);

  useEffect(() => {
    fetchCommunityData();

    const joinRoom = () => {
      if (communityId) {
        mobileSocket.emit('join-community', communityId);
      }
      if (user?.id) {
        mobileSocket.emit('user-online', user.id);
      }
    };
    joinRoom();

    const handleNewGroupMessage = (msg: ChatMessage) => {
      if (msg.communityId !== communityId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const tempIdx = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.senderId === msg.senderId &&
            m.body === msg.body
        );
        if (tempIdx !== -1) {
          const next = [...prev];
          next[tempIdx] = msg;
          return next;
        }
        return [...prev, msg];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 60);
    };

    const handleMessageLiked = ({ messageId, likes, userLiked }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, likes, userLiked } : m))
      );
      setCommentingMessage((prev) =>
        prev && prev.id === messageId ? { ...prev, likes, userLiked } : prev
      );
    };

    const handleReactionUpdated = ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleMessageDeleted = ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleOnlineUsers = ({ onlineUserIds: uids }: any) => {
      if (Array.isArray(uids)) {
        setOnlineUserIds(uids);
      }
    };

    const handleNewComment = ({ messageId, comment }: any) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.comments || [];
          if (existing.some((c) => c.id === comment.id)) return m;
          const updated = [...existing, comment];
          return {
            ...m,
            comments: updated,
            commentCount: updated.length,
          };
        })
      );
      setCommentingMessage((prev) => {
        if (!prev || prev.id !== messageId) return prev;
        const existing = prev.comments || [];
        if (existing.some((c) => c.id === comment.id)) return prev;
        const updated = [...existing, comment];
        return {
          ...prev,
          comments: updated,
          commentCount: updated.length,
        };
      });
    };

    const handleRsvpUpdated = ({ communityId: commId, event }: any) => {
      if (commId === communityId) {
        setCommunity((prev) => (prev ? { ...prev, event } : prev));
      }
    };

    const handlePinUpdated = ({ communityId: commId, pinnedNotice }: any) => {
      if (commId === communityId) {
        setCommunity((prev) => (prev ? { ...prev, pinnedNotice } : prev));
      }
    };

    const handleNewPrivMsg = ({ communityId: commId }: any) => {
      if (commId === communityId) {
        fetchCommunityData();
      }
    };

    const handleUserTyping = (payload: any) => {
      if (
        payload?.communityId === communityId &&
        !payload?.isPrivate &&
        payload?.userName
      ) {
        setTypingUser(payload.userName);
      }
    };

    const handleUserStopTyping = (payload: any) => {
      if (payload?.communityId === communityId && !payload?.isPrivate) {
        setTypingUser(null);
      }
    };

    mobileSocket.on('connect', joinRoom);
    mobileSocket.on('new-group-message', handleNewGroupMessage);
    mobileSocket.on('message-liked', handleMessageLiked);
    mobileSocket.on('message-reaction-updated', handleReactionUpdated);
    mobileSocket.on('message-deleted', handleMessageDeleted);
    mobileSocket.on('online-users-updated', handleOnlineUsers);
    mobileSocket.on('new-comment', handleNewComment);
    mobileSocket.on('event-rsvp-updated', handleRsvpUpdated);
    mobileSocket.on('community-pin-updated', handlePinUpdated);
    mobileSocket.on('new-private-message', handleNewPrivMsg);
    mobileSocket.on('user-typing', handleUserTyping);
    mobileSocket.on('user-stop-typing', handleUserStopTyping);

    if (user?.id) {
      mobileSocket.emit('user-online', user.id);
    }

    return () => {
      mobileSocket.off('connect', joinRoom);
      mobileSocket.off('new-group-message', handleNewGroupMessage);
      mobileSocket.off('message-liked', handleMessageLiked);
      mobileSocket.off('message-reaction-updated', handleReactionUpdated);
      mobileSocket.off('message-deleted', handleMessageDeleted);
      mobileSocket.off('online-users-updated', handleOnlineUsers);
      mobileSocket.off('new-comment', handleNewComment);
      mobileSocket.off('event-rsvp-updated', handleRsvpUpdated);
      mobileSocket.off('community-pin-updated', handlePinUpdated);
      mobileSocket.off('new-private-message', handleNewPrivMsg);
      mobileSocket.off('user-typing', handleUserTyping);
      mobileSocket.off('user-stop-typing', handleUserStopTyping);
    };
  }, [communityId, fetchCommunityData]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    const senderName = user?.name || user?.fullName || 'Member';
    mobileSocket.emit('typing', {
      communityId,
      isPrivate: false,
      userName: senderName.split(' ')[0],
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      mobileSocket.emit('stop-typing', { communityId, isPrivate: false });
    }, 1500);
  };

  const sendOptimisticGroupMessage = async (
    textToSend: string,
    replyTo?: { senderName: string; body: string },
    retryTempId?: string
  ) => {
    const tempId = retryTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const senderName = user?.name || user?.fullName || 'Community Member';
    const senderData = {
      id: user?.id || 'me',
      name: senderName,
      initials: senderName[0].toUpperCase(),
      avatarColor: '#059669',
      role: 'Member',
    };

    if (retryTempId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === retryTempId ? { ...m, status: 'sending' } : m))
      );
    } else {
      const optimisticMsg: ChatMessage = {
        id: tempId,
        communityId: community?.id || communityId,
        senderId: senderData.id,
        senderName: senderData.name,
        senderInitials: senderData.initials,
        senderAvatarColor: senderData.avatarColor,
        senderRole: senderData.role,
        body: textToSend,
        timestamp: 'Sending...',
        rawTime: Date.now(),
        replyTo,
        likes: 0,
        reactions: {},
        commentCount: 0,
        comments: [],
        status: 'sending',
        isSelf: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 40);
    }

    try {
      const sentMsg = await mobileApi.sendGroupMessage(
        community?.id || communityId,
        textToSend,
        replyTo,
        senderData,
        undefined,
        tempId
      );
      setMessages((prev) => {
        const alreadyHasReal = prev.some((m) => m.id === sentMsg.id);
        if (alreadyHasReal) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? sentMsg : m));
      });
    } catch (err: any) {
      console.error('Error sending message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
      const serverMsg = err?.response?.data?.error;
      Toast.show({
        type: 'error',
        text1: 'Message not sent',
        text2: serverMsg || 'Check your connection and tap the message to retry.',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    const replyTo = replyTarget
      ? { senderName: replyTarget.senderName, body: replyTarget.body }
      : undefined;

    setInputText('');
    setReplyTarget(null);
    mobileSocket.emit('stop-typing', { communityId, isPrivate: false });

    await sendOptimisticGroupMessage(textToSend, replyTo);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setReactionTargetMessage(null);
    try {
      await mobileApi.toggleReaction(
        community?.id || communityId,
        messageId,
        emoji,
        user?.id || 'me'
      );
    } catch (err) {
      console.error('Error reacting:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await mobileApi.deleteMessage(community?.id || communityId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      Toast.show({ type: 'success', text1: 'Message deleted' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Delete failed' });
    }
  };

  const handleReportMessage = async (messageId: string) => {
    try {
      await mobileApi.reportMessage(
        community?.id || communityId,
        messageId,
        user?.id,
        'Reported by member'
      );
      Toast.show({ type: 'success', text1: 'Message reported to moderators' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Report failed' });
    }
  };

  const handleAddToCalendar = () => {
    if (!community?.event) return;
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      community.event.title
    )}&details=${encodeURIComponent(
      `Event in ${community.name}`
    )}&location=${encodeURIComponent(community.event.location || '')}`;
    Linking.openURL(gcalUrl).catch(() => {
      Toast.show({ type: 'info', text1: 'Opening calendar' });
    });
  };

  const displayedMessages = messages.filter((msg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (msg.body && msg.body.toLowerCase().includes(q)) ||
      (msg.senderName && msg.senderName.toLowerCase().includes(q))
    );
  });

  const handleToggleLike = async (messageId: string) => {
    try {
      await mobileApi.toggleLikeMessage(
        community?.id || communityId,
        messageId,
        user?.id || 'me'
      );
    } catch (err) {
      console.error('Error liking message:', err);
    }
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !commentingMessage || sendingComment) return;
    setSendingComment(true);
    try {
      const senderName = user?.name || user?.fullName || 'Community Member';
      await mobileApi.addComment(
        community?.id || communityId,
        commentingMessage.id,
        commentInput.trim(),
        {
          name: senderName,
          initials: senderName[0]?.toUpperCase() || 'U',
          avatarColor: '#059669',
        }
      );
      setCommentInput('');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Comment Failed',
        text2: 'Unable to post reply in thread',
      });
    } finally {
      setSendingComment(false);
    }
  };

  const handleToggleRsvp = async () => {
    try {
      const updatedEvent = await mobileApi.toggleEventRSVP(
        community?.id || communityId
      );
      Toast.show({
        type: 'success',
        text1: updatedEvent.isJoined ? 'RSVP Confirmed! 🎉' : 'RSVP Cancelled',
        text2: updatedEvent.isJoined
          ? `You are attending ${updatedEvent.title}`
          : 'Removed from attendee list',
      });
    } catch (err) {
      console.error('Error toggling RSVP:', err);
    }
  };

  const handleToggleMembership = async () => {
    if (!community) return;
    try {
      const res = await mobileApi.toggleJoinCommunity(community.id);
      setCommunity((prev) =>
        prev ? { ...prev, isJoined: res.isJoined } : prev
      );
      Toast.show({
        type: 'info',
        text1: res.isJoined ? `Joined ${community.name}` : `Left ${community.name}`,
      });
    } catch (_) {}
  };

  const handleSavePinOrEvent = async () => {
    if (!community) return;
    try {
      if (manageMode === 'pin' && pinText.trim()) {
        const authorName = (
          user?.name ||
          user?.fullName ||
          'ADMIN'
        ).split(' ')[0];
        await mobileApi.updatePinnedNotice(
          community.id,
          authorName,
          pinText.trim()
        );
        Toast.show({ type: 'success', text1: 'Pinned Notice Updated' });
      } else if (manageMode === 'event' && eventTitle.trim()) {
        await mobileApi.updateCommunityEvent(community.id, {
          tag: eventTag.trim() || 'UPCOMING MEETUP',
          title: eventTitle.trim(),
          location: eventLocation.trim() || community.location || 'Online',
        });
        Toast.show({ type: 'success', text1: 'Community Event Scheduled' });
      } else if (manageMode === 'edit' && editName.trim()) {
        const updated = await mobileApi.updateCommunity(community.id, {
          name: editName.trim(),
          category: editCategory.trim() || community.category,
          location: editLocation.trim() || community.location,
          description: editDescription.trim(),
        });
        setCommunity((prev) => (prev ? { ...prev, ...updated } : prev));
        Toast.show({ type: 'success', text1: 'Community Updated' });
      }
      setManageMode(null);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.error || 'Update Failed',
      });
    }
  };

  const handleOpenMemberSideChat = async (
    recipientId: string,
    recipientName: string,
    recipientRole?: string,
    recipientAvatarColor?: string
  ) => {
    if (recipientId === user?.id) return;
    try {
      await mobileApi.initPrivateChat(community?.id || communityId, recipientId, {
        name: recipientName,
        role: recipientRole || 'Community Member',
        avatarColor: recipientAvatarColor || '#6366F1',
      });
    } catch (_) {}
    navigation.navigate('PrivateChat', {
      communityId: community?.id || communityId,
      recipientId,
      recipientName,
      recipientRole: recipientRole || 'Community Member',
      recipientAvatarColor: recipientAvatarColor || '#6366F1',
    });
  };

  const totalUnreadPrivate =
    community?.privateChats?.reduce(
      (acc, chat) => acc + (chat.unreadCount || 0),
      0
    ) || 0;

  const renderHeaderFeed = () => {
    if (!community) return null;

    return (
      <View style={styles.feedHeaderContainer}>
        {/* SECTION 1: Scoped Private Chats in this Community */}
        <View style={styles.privateSection}>
          <View style={styles.privateSectionHeader}>
            <View style={styles.privateSectionTitleRow}>
              <LockIcon size={13} color={figmaColors.inkSecondary} />
              <Text style={styles.privateSectionTitle}>
                Private chats in this community
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() =>
                navigation.navigate('CommunityInbox', {
                  communityId: community.id,
                })
              }
            >
              <Text style={styles.viewAllText}>
                View all {community.privateChats?.length || 0}
              </Text>
              {totalUnreadPrivate > 0 ? (
                <View style={styles.unreadCountPill}>
                  <Text style={styles.unreadCountPillText}>
                    {totalUnreadPrivate}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.privateHorizontalScroll}
          >
            {(community.privateChats || []).map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={styles.privateMiniCard}
                onPress={() =>
                  handleOpenMemberSideChat(
                    chat.recipient.id,
                    chat.recipient.name,
                    chat.recipient.role,
                    chat.recipient.avatarColor
                  )
                }
                activeOpacity={0.75}
              >
                <View style={styles.privateMiniAvatarWrap}>
                  <View
                    style={[
                      styles.privateMiniAvatar,
                      {
                        backgroundColor:
                          chat.recipient.avatarColor || '#6366F1',
                      },
                    ]}
                  >
                    <Text style={styles.privateMiniInitials}>
                      {chat.recipient.initials || chat.recipient.name[0]}
                    </Text>
                  </View>
                  {chat.unreadCount > 0 ? (
                    <View style={styles.privateMiniUnreadBadge}>
                      <Text style={styles.privateMiniUnreadText}>
                        {chat.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.privateMiniName} numberOfLines={1}>
                    {chat.recipient.name}
                  </Text>
                  <Text style={styles.privateMiniMsg} numberOfLines={1}>
                    {chat.lastMessage || 'Scoped chat'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* + New Side-Chat Card */}
            <TouchableOpacity
              style={styles.newSideChatMiniCard}
              onPress={() =>
                navigation.navigate('CommunityInbox', {
                  communityId: community.id,
                })
              }
              activeOpacity={0.75}
            >
              <View style={styles.newSideChatPlusCircle}>
                <Text style={styles.newSideChatPlusText}>＋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.privateMiniName}>New Side-Chat</Text>
                <Text style={styles.privateMiniMsg}>Message a member</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* SECTION 2: Pinned Announcement Banner */}
        {community.pinnedNotice ? (
          <TouchableOpacity
            style={styles.pinnedBox}
            onPress={() => {
              setPinText(community.pinnedNotice?.text || '');
              setManageMode('pin');
            }}
            activeOpacity={0.75}
          >
            <View style={styles.pinIconBox}>
              <BookmarkIcon size={13} color={figmaColors.inkOlive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pinnedAuthor}>
                PINNED BY {community.pinnedNotice.author}
              </Text>
              <Text style={styles.pinnedText} numberOfLines={2}>
                {community.pinnedNotice.text}
              </Text>
            </View>
            <Text style={styles.pinnedChevron}>›</Text>
          </TouchableOpacity>
        ) : null}

        {/* Date Divider */}
        <View style={styles.dateDivider}>
          <Text style={styles.dateDividerText}>TODAY</Text>
        </View>

        {/* SECTION 4: Pinned Event RSVP Card */}
        {community.event ? (
          <View style={styles.eventBanner}>
            <View style={styles.eventIconBox}>
              <CalendarIcon size={19} color="#26331C" />
            </View>
            <View style={styles.eventDetails}>
              <Text style={styles.eventTag}>{community.event.tag}</Text>
              <Text style={styles.eventTitle}>{community.event.title}</Text>
              <Text style={styles.eventMeta}>
                {community.event.location} • {community.event.attendeesCount}{' '}
                going
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={[styles.rsvpBtn, { backgroundColor: figmaColors.surfacePill, borderWidth: 1, borderColor: figmaColors.border, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                onPress={handleAddToCalendar}
                activeOpacity={0.75}
              >
                <CalendarIcon size={13} color={figmaColors.ink} />
                <Text style={[styles.rsvpBtnText, { color: figmaColors.ink }]}>Sync</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rsvpBtn,
                  community.event.isJoined ? styles.rsvpBtnActive : null,
                  { flexDirection: 'row', alignItems: 'center', gap: 4 },
                ]}
                onPress={handleToggleRsvp}
                activeOpacity={0.75}
              >
                {community.event.isJoined ? (
                  <CheckIcon size={11} color="#FFFFFF" strokeWidth={1.6} />
                ) : null}
                <Text
                  style={[
                    styles.rsvpBtnText,
                    community.event.isJoined ? styles.rsvpBtnTextActive : null,
                  ]}
                >
                  {community.event.isJoined ? 'Joined' : 'Join'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSelf =
      item.isSelf ||
      (user?.id && item.senderId === user.id);
    const isOwnerOrMod = Boolean(
      user?.id === community?.creatorId ||
        (user?.id && community?.moderators?.includes(user.id))
    );
    const isOnline = onlineUserIds.includes(item.senderId);

    return (
      <View
        style={[
          styles.messageRow,
          isSelf ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isSelf ? (
          <TouchableOpacity
            onPress={() =>
              setSelectedMember({
                id: item.senderId,
                name: item.senderName,
                initials: item.senderInitials || item.senderName[0],
                avatarColor: item.senderAvatarColor || '#334155',
                role: item.senderRole || 'Community Member',
              })
            }
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.avatarSmall,
                { backgroundColor: item.senderAvatarColor || '#334155', position: 'relative' },
              ]}
            >
              <Text style={styles.avatarSmallText}>
                {item.senderInitials || item.senderName[0]}
              </Text>
              {isOnline ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#16A34A',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                  }}
                />
              ) : null}
            </View>
          </TouchableOpacity>
        ) : null}

        <View
          style={[
            styles.messageColumn,
            isSelf ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
          ]}
        >
          {/* Sender Header */}
          {!isSelf ? (
            <TouchableOpacity
              style={styles.bubbleHeader}
              onPress={() =>
                setSelectedMember({
                  id: item.senderId,
                  name: item.senderName,
                  initials: item.senderInitials || item.senderName[0],
                  avatarColor: item.senderAvatarColor || '#334155',
                  role: item.senderRole || 'Community Member',
                })
              }
            >
              <Text style={styles.senderName}>{item.senderName}</Text>
              {community?.moderators?.includes(item.senderId) ? (
                <Text style={[styles.senderRoleBadge, { backgroundColor: '#DBEAFE', color: '#1D4ED8' }]}>MOD</Text>
              ) : null}
              {community?.creatorId === item.senderId ? (
                <Text style={[styles.senderRoleBadge, { backgroundColor: '#FEF3C7', color: '#B45309' }]}>HOST</Text>
              ) : item.senderRole ? (
                <Text style={styles.senderRoleBadge}>{item.senderRole}</Text>
              ) : null}
              <Text style={styles.headerTimeText}>
                {item.timestamp || 'Just now'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <View
            style={[
              styles.bubbleContainer,
              isSelf ? styles.myBubble : styles.otherBubble,
            ]}
          >
            {/* Reply Quote Preview */}
            {item.replyTo ? (
              <View
                style={[
                  styles.replyQuote,
                  isSelf && { backgroundColor: 'rgba(0,0,0,0.2)' },
                ]}
              >
                <Text style={styles.replyQuoteAuthor}>
                  {item.replyTo.senderName}:
                </Text>
                <Text style={styles.replyQuoteBody} numberOfLines={2}>
                  {item.replyTo.body}
                </Text>
              </View>
            ) : null}

            {/* Cloudflare Image / Document Attachment */}
            {item.imageUrl ? (
              /\.(png|jpe?g|webp|gif)(\?|$)/i.test(item.imageUrl) ||
              item.imageUrl.startsWith('data:image/') ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setPreviewImageUrl(item.imageUrl || null)}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 220, height: 160, borderRadius: 12, marginBottom: item.body ? 6 : 0 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => item.imageUrl && Linking.openURL(item.imageUrl).catch(() => {})}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSelf ? 'rgba(255,255,255,0.14)' : '#F1F5F9',
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 10,
                    marginBottom: item.body ? 6 : 0,
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>📎</Text>
                  <View style={{ flexShrink: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: isSelf ? '#FFFFFF' : '#0F172A',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {decodeURIComponent(item.imageUrl.split('/').pop()?.split('?')[0] || 'Attachment')}
                    </Text>
                    <Text style={{ color: isSelf ? '#CBD5E1' : '#64748B', fontSize: 11 }}>
                      Tap to open file
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            ) : null}

            {/* Body */}
            {item.body ? (
              <Text
                style={[
                  styles.messageText,
                  isSelf ? styles.myMessageText : styles.otherMessageText,
                ]}
              >
                {item.body}
              </Text>
            ) : null}

            {isSelf ? (
              item.status === 'failed' ? (
                <TouchableOpacity
                  onPress={() => sendOptimisticGroupMessage(item.body, item.replyTo, item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selfTimestampText, { color: '#DC2626', fontWeight: '700' }]}>
                    Failed · Tap to retry
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.selfTimestampText}>
                  {item.status === 'sending' ? 'Sending...' : item.timestamp || 'Just now'}
                </Text>
              )
            ) : null}
          </View>

          {/* Multi-Emoji Reaction Chips */}
          {item.reactions && Object.keys(item.reactions).length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {Object.entries(item.reactions).map(([emoji, uids]) => {
                if (!Array.isArray(uids) || uids.length === 0) return null;
                const reacted = user?.id && uids.includes(user.id);
                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleToggleReaction(item.id, emoji)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: reacted ? '#DCFCE7' : '#F1F5F9',
                      borderColor: reacted ? '#16A34A' : '#CBD5E1',
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      gap: 3,
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>{emoji}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: reacted ? '#15803D' : '#475569' }}>
                      {uids.length}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Actions Row: Like • React • Reply • Comments • Delete • Report */}
          <View style={styles.actionsBar}>
            <TouchableOpacity
              onPress={() => handleToggleLike(item.id)}
              style={styles.actionBtn}
              activeOpacity={0.6}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ThumbsUpIcon
                  size={12}
                  color={item.userLiked ? figmaColors.inkOlive : figmaColors.inkMuted}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    item.userLiked && styles.actionBtnTextLiked,
                  ]}
                >
                  Like · {item.likes || 0}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReactionTargetMessage(item)}
              style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              activeOpacity={0.6}
            >
              <SmileIcon size={12} color={figmaColors.inkMuted} />
              <Text style={styles.actionBtnText}>React</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReplyTarget(item)}
              style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              activeOpacity={0.6}
            >
              <ReplyIcon size={12} color={figmaColors.inkMuted} />
              <Text style={styles.actionBtnText}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCommentingMessage(item)}
              style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              activeOpacity={0.6}
            >
              <ChatBubbleIcon size={12} color={figmaColors.inkMuted} />
              <Text style={styles.actionBtnText}>
                {item.commentCount || item.comments?.length || 0}
              </Text>
            </TouchableOpacity>

            {(isSelf || isOwnerOrMod) ? (
              <TouchableOpacity
                onPress={() => handleDeleteMessage(item.id)}
                style={styles.actionBtn}
                activeOpacity={0.6}
              >
                <TrashIcon size={13} color={figmaColors.danger} />
              </TouchableOpacity>
            ) : null}

            {!isSelf ? (
              <TouchableOpacity
                onPress={() => handleReportMessage(item.id)}
                style={styles.actionBtn}
                activeOpacity={0.6}
              >
                <FlagIcon size={13} color={figmaColors.inkInactive} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={20} color={figmaColors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenterBox}
          onPress={() => setShowInfoModal(true)}
          activeOpacity={0.75}
        >
          {community?.imageUrl ? (
            <Image
              source={{ uri: community.imageUrl }}
              style={styles.headerCommAvatar}
            />
          ) : null}
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {community?.name || 'Community Channel'}
            </Text>
            <View style={styles.headerStatsRow}>
              <View style={styles.headerOnlineDot} />
              <Text style={styles.headerSubtitle}>
                {community?.onlineCount || 1} online ·{' '}
                {community?.memberCount || '1.2k'} members
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.infoIconButton}
            onPress={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <SearchIcon size={17} color={figmaColors.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoIconButton}
            onPress={() => setShowInfoModal(true)}
            activeOpacity={0.7}
          >
            <InfoIcon size={19} color={figmaColors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* In-Chat Search Bar */}
      {isSearching ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: figmaColors.surfaceSoft,
            borderBottomWidth: 1,
            borderBottomColor: figmaColors.border,
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          <SearchIcon size={16} color={figmaColors.inkMuted} />
          <TextInput
            style={{
              flex: 1,
              fontSize: 13,
              color: '#0F172A',
              paddingVertical: 4,
            }}
            placeholder="Search messages in chat..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <Text style={{ fontSize: 11, color: '#64748B' }}>
              {displayedMessages.length} found
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}
            style={{ padding: 4 }}
          >
            <Text style={{ fontSize: 14, color: '#64748B' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Sub-bar (Location & Category) */}
      <View style={styles.subHeaderBar}>
        <View style={styles.subHeaderLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <PinIcon size={12} color={figmaColors.inkMuted} />
            <Text style={styles.subHeaderMeta}>
              {community?.location || 'Global'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <UsersIcon size={12} color={figmaColors.inkMuted} />
            <Text style={styles.subHeaderMeta}>
              {community?.isJoined === false ? 'Members only' : 'Open hangout'}
            </Text>
          </View>
        </View>
      </View>

      {!loading && community && community.isJoined === false ? (
        <View style={styles.joinGateContainer}>
          <View style={styles.joinGateCard}>
            <View style={styles.joinGateBadge}>
              <LockIcon size={14} color={figmaColors.inkOlive} />
              <Text style={styles.joinGateBadgeText}>MEMBERS ONLY</Text>
            </View>
            <Text style={styles.joinGateTitle}>{community.name}</Text>
            <Text style={styles.joinGateMeta}>
              {community.category} · {community.location} · {community.memberCount || '1'} members
            </Text>
            <Text style={styles.joinGateDesc}>
              {community.description ||
                'Join this community to read channel messages, participate in discussions, and start scoped side-chats.'}
            </Text>
            <TouchableOpacity
              style={styles.joinGateBtn}
              onPress={handleToggleMembership}
              activeOpacity={0.85}
            >
              <Text style={styles.joinGateBtnText}>+ Join Community</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.contentArea}
      >
        {/* Message Stream */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={figmaColors.ink} />
          </View>
        ) : !community && loadError ? (
          <View style={styles.loadingContainer}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: figmaColors.ink, marginBottom: 6 }}>
              Could not load chat
            </Text>
            <Text style={{ fontSize: 13, color: figmaColors.inkMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 32 }}>
              Connection timed out or server is waking up.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                fetchCommunityData();
              }}
              style={{
                backgroundColor: figmaColors.ink,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 999,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                Tap to Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            ListHeaderComponent={renderHeaderFeed}
            contentContainerStyle={styles.messageList}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={30}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {/* Typing Indicator */}
        {typingUser ? (
          <View style={styles.typingBanner}>
            <Text style={styles.typingBannerText}>
              {typingUser} is typing...
            </Text>
          </View>
        ) : null}

        {/* Popover Plus Quick-Actions Menu */}
        {showPlusMenu ? (
          <View style={styles.plusMenuPopup}>
            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                setInputText(
                  "Sharing route for tonight's meetup: 5 miles loop starting at main arch"
                );
              }}
            >
              <PinIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>
                Share Route / Location
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                setInputText(
                  'Quick poll: Who prefers 6:30 PM vs 7:00 PM for this week?'
                );
              }}
            >
              <ChatBubbleIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>Create Quick Poll</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                setPinText(community?.pinnedNotice?.text || '');
                setManageMode('pin');
              }}
            >
              <BookmarkIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>
                Update Pinned Notice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                setEventTitle(community?.event?.title || '');
                setEventLocation(
                  community?.event?.location || community?.location || ''
                );
                setManageMode('event');
              }}
            >
              <CalendarIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>
                Schedule Community Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                if (community) {
                  navigation.navigate('CommunityInbox', {
                    communityId: community.id,
                  });
                }
              }}
            >
              <LockIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>
                Start Scoped Side-Chat
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Reply Bar Preview */}
        {replyTarget ? (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerContent}>
              <Text style={styles.replyBannerTitle}>
                Replying to {replyTarget.senderName}
              </Text>
              <Text style={styles.replyBannerSnippet} numberOfLines={1}>
                {replyTarget.body}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyTarget(null)}
              style={styles.replyCloseBtn}
            >
              <Text style={styles.replyCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Composer Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.plusBtn}
            onPress={() => setShowPlusMenu(!showPlusMenu)}
            activeOpacity={0.75}
          >
            {showPlusMenu ? (
              <CloseIcon size={17} color={figmaColors.ink} />
            ) : (
              <PlusIcon size={18} color={figmaColors.ink} strokeWidth={1.75} />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Message the community..."
            placeholderTextColor={figmaColors.inkInactive}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.75}
          >
            <SendIcon
              size={16}
              color={!inputText.trim() ? figmaColors.inkInactive : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      )}

      {/* Thread Comments Drawer Modal */}
      <Modal
        visible={Boolean(commentingMessage)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Thread Discussion</Text>
                <Text style={styles.modalSubtitle}>
                  {commentingMessage?.comments?.length || 0} replies to{' '}
                  {commentingMessage?.senderName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCommentingMessage(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Original Message Quote */}
            {commentingMessage ? (
              <View style={styles.originalPostBox}>
                <Text style={styles.originalPostAuthor}>
                  {commentingMessage.senderName}
                </Text>
                <Text style={styles.originalPostBody}>
                  {commentingMessage.body}
                </Text>
              </View>
            ) : null}

            {/* Comments List */}
            <ScrollView
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              {(commentingMessage?.comments || []).map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <View
                    style={[
                      styles.commentAvatar,
                      { backgroundColor: c.senderAvatarColor || '#059669' },
                    ]}
                  >
                    <Text style={styles.commentAvatarText}>
                      {c.senderInitials || c.senderName[0]}
                    </Text>
                  </View>
                  <View style={styles.commentBubble}>
                    <View style={styles.commentHeaderRow}>
                      <Text style={styles.commentSender}>{c.senderName}</Text>
                      <Text style={styles.commentTime}>{c.timestamp}</Text>
                    </View>
                    <Text style={styles.commentBody}>{c.body}</Text>
                  </View>
                </View>
              ))}

              {(!commentingMessage?.comments ||
                commentingMessage.comments.length === 0) && (
                <Text style={styles.noCommentsText}>
                  No replies yet. Be the first to chime in!
                </Text>
              )}
            </ScrollView>

            {/* Add Comment Input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Reply in thread..."
                placeholderTextColor="#64748B"
                value={commentInput}
                onChangeText={setCommentInput}
              />
              <TouchableOpacity
                style={[
                  styles.commentSendBtn,
                  !commentInput.trim() && { opacity: 0.5 },
                ]}
                onPress={handleSendComment}
                disabled={!commentInput.trim() || sendingComment}
              >
                <Text style={styles.commentSendBtnText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Member Action Sheet Modal */}
      <Modal
        visible={Boolean(selectedMember)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={[
                    styles.avatarSmall,
                    {
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: selectedMember?.avatarColor || '#3B82F6',
                    },
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                    {selectedMember?.initials || 'M'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>{selectedMember?.name}</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedMember?.role} • Member of {community?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.messageMemberBtn}
              onPress={() => {
                if (selectedMember) {
                  const m = selectedMember;
                  setSelectedMember(null);
                  handleOpenMemberSideChat(m.id, m.name, m.role, m.avatarColor);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.messageMemberBtnText}>
                🔒 Message {selectedMember?.name} Privately
              </Text>
            </TouchableOpacity>

            {/* Owner / Moderator Controls */}
            {(user?.id === community?.creatorId ||
              (user?.id && community?.moderators?.includes(user.id))) &&
            selectedMember &&
            selectedMember.id !== user?.id &&
            selectedMember.id !== community?.creatorId ? (
              <>
                {user?.id === community?.creatorId ? (
                  <TouchableOpacity
                    style={[
                      styles.messageMemberBtn,
                      {
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        marginTop: 8,
                      },
                    ]}
                    onPress={async () => {
                      if (!selectedMember) return;
                      const isMod = community?.moderators?.includes(selectedMember.id);
                      try {
                        await mobileApi.manageModerator(
                          community?.id || communityId,
                          selectedMember.id,
                          isMod ? 'demote' : 'promote',
                          user?.id || 'me'
                        );
                        fetchCommunityData();
                        setSelectedMember(null);
                        Toast.show({
                          type: 'success',
                          text1: isMod ? 'Demoted from Moderator' : 'Promoted to Moderator',
                        });
                      } catch (e) {
                        Toast.show({ type: 'error', text1: 'Action failed' });
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.messageMemberBtnText, { color: '#0F172A' }]}>
                      {community?.moderators?.includes(selectedMember?.id)
                        ? '🛡️ Demote from Moderator'
                        : '⭐ Make Community Moderator'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.messageMemberBtn,
                    {
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      marginTop: 8,
                    },
                  ]}
                  onPress={() => {
                    if (!selectedMember) return;
                    const memberToRemove = selectedMember;
                    setSelectedMember(null);
                    setTimeout(() => {
                      Alert.alert(
                        'Remove Member',
                        `Remove ${memberToRemove.name} from ${community?.name || 'this community'}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await mobileApi.removeMember(
                                  community?.id || communityId,
                                  memberToRemove.id
                                );
                                fetchCommunityData();
                                Toast.show({
                                  type: 'success',
                                  text1: `${memberToRemove.name} removed`,
                                });
                              } catch (e: any) {
                                Toast.show({
                                  type: 'error',
                                  text1: e?.response?.data?.error || 'Could not remove member',
                                });
                              }
                            },
                          },
                        ]
                      );
                    }, 320);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.messageMemberBtnText, { color: '#DC2626' }]}>
                    Remove from Community
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Emoji Reaction Modal */}
      <Modal
        visible={Boolean(reactionTargetMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionTargetMessage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setReactionTargetMessage(null)}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              gap: 12,
              alignSelf: 'center',
              marginTop: 'auto',
              marginBottom: 100,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {EMOJI_LIST.map((em) => (
              <TouchableOpacity
                key={em}
                onPress={() => {
                  if (reactionTargetMessage) {
                    handleToggleReaction(reactionTargetMessage.id, em);
                  }
                }}
                style={{ padding: 6 }}
              >
                <Text style={{ fontSize: 24 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Community Info & Group Details Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{community?.name}</Text>
                <Text style={styles.modalSubtitle}>
                  {community?.category} • {community?.location} •{' '}
                  {community?.memberCount} members
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
              <Text style={styles.infoDescText}>
                {community?.description ||
                  'Welcome to this community space! Connect in the main channel or start scoped 1-on-1 side-chats.'}
              </Text>

              <View style={styles.rulesCard}>
                <Text style={styles.rulesTitle}>Community Guidelines</Text>
                <Text style={styles.ruleBullet}>
                  • Be supportive, welcoming, and respectful of all members.
                </Text>
                <Text style={styles.ruleBullet}>
                  • Private 1-on-1 side-chats remain linked to this community context.
                </Text>
                <Text style={styles.ruleBullet}>
                  • RSVP to weekly meetups so hosts can organize groups.
                </Text>
              </View>

              {isCommunityAdmin ? (
                <>
                  <TouchableOpacity
                    style={styles.infoActionPrimary}
                    onPress={() => {
                      setEditName(community?.name || '');
                      setEditCategory(community?.category || 'COMMUNITY');
                      setEditLocation(community?.location || '');
                      setEditDescription(community?.description || '');
                      setShowInfoModal(false);
                      setTimeout(() => setManageMode('edit'), 320);
                    }}
                  >
                    <Text style={styles.infoActionPrimaryText}>
                      Edit Community Details
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.infoActionSecondary,
                      { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
                    ]}
                    onPress={() => {
                      const targetId = community?.id || communityId;
                      const targetName = community?.name;
                      setShowInfoModal(false);
                      setTimeout(() => {
                        Alert.alert(
                          'Delete Community',
                          `Permanently delete "${targetName}" and all its messages? This cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await mobileApi.deleteCommunity(targetId);
                                  Toast.show({
                                    type: 'success',
                                    text1: 'Community deleted',
                                  });
                                  navigation.goBack();
                                } catch (e: any) {
                                  Toast.show({
                                    type: 'error',
                                    text1: e?.response?.data?.error || 'Could not delete community',
                                  });
                                }
                              },
                            },
                          ]
                        );
                      }, 320);
                    }}
                  >
                    <Text style={[styles.infoActionSecondaryText, { color: '#DC2626' }]}>
                      Delete Community
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.infoActionSecondary}
                  onPress={handleToggleMembership}
                >
                  <Text style={styles.infoActionSecondaryText}>
                    {community?.isJoined === false
                      ? '+ Join Community'
                      : 'Leave Community'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manage Pin / Event Modal */}
      <Modal
        visible={Boolean(manageMode)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setManageMode(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {manageMode === 'pin'
                  ? 'Update Pinned Notice'
                  : manageMode === 'edit'
                    ? 'Edit Community'
                    : 'Schedule Community Event'}
              </Text>
              <TouchableOpacity onPress={() => setManageMode(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {manageMode === 'edit' ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.inputLabelSmall}>COMMUNITY NAME</Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="Community name"
                  placeholderTextColor="#64748B"
                  value={editName}
                  onChangeText={setEditName}
                />
                <Text style={styles.inputLabelSmall}>CATEGORY</Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="e.g. SPORT, TECH, GAMING"
                  placeholderTextColor="#64748B"
                  value={editCategory}
                  onChangeText={setEditCategory}
                />
                <Text style={styles.inputLabelSmall}>LOCATION</Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="e.g. Brooklyn or Global"
                  placeholderTextColor="#64748B"
                  value={editLocation}
                  onChangeText={setEditLocation}
                />
                <Text style={styles.inputLabelSmall}>DESCRIPTION</Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="Describe this community..."
                  placeholderTextColor="#64748B"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.infoActionPrimary, { marginTop: 8 }]}
                  onPress={handleSavePinOrEvent}
                >
                  <Text style={styles.infoActionPrimaryText}>
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>
            ) : manageMode === 'pin' ? (
              <View style={{ gap: 12 }}>
                <Text style={styles.modalSubtitle}>
                  Pinned notices appear at the top of the community channel for all members.
                </Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="Enter announcement or guidelines..."
                  placeholderTextColor="#64748B"
                  value={pinText}
                  onChangeText={setPinText}
                  multiline
                />
                <TouchableOpacity
                  style={styles.infoActionPrimary}
                  onPress={handleSavePinOrEvent}
                >
                  <Text style={styles.infoActionPrimaryText}>
                    Save Pinned Notice
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={styles.inputLabelSmall}>TIME / TAG</Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="e.g. TONIGHT • 6:30 PM"
                  placeholderTextColor="#64748B"
                  value={eventTag}
                  onChangeText={setEventTag}
                />
                <Text style={styles.inputLabelSmall}>EVENT TITLE</Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="e.g. Weekly Community Meetup"
                  placeholderTextColor="#64748B"
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
                <Text style={styles.inputLabelSmall}>LOCATION</Text>
                <TextInput
                  style={styles.manageInput}
                  placeholder="e.g. Community Center or Online"
                  placeholderTextColor="#64748B"
                  value={eventLocation}
                  onChangeText={setEventLocation}
                />
                <TouchableOpacity
                  style={[styles.infoActionPrimary, { marginTop: 8 }]}
                  onPress={handleSavePinOrEvent}
                >
                  <Text style={styles.infoActionPrimaryText}>
                    Publish Community Event
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* WhatsApp-style Image Lightbox */}
      <Modal
        visible={Boolean(previewImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.95)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={() => setPreviewImageUrl(null)}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.18)',
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={{ width: '94%', height: '78%' }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: figmaColors.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: figmaColors.bg,
    borderBottomWidth: 1,
    borderBottomColor: figmaColors.borderHairline,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  headerCenterBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerCommAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  infoIconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoIconText: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '700',
  },
  subHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  subHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subHeaderMeta: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  subHeaderLink: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  contentArea: {
    flex: 1,
  },
  feedHeaderContainer: {
    marginBottom: 14,
    gap: 10,
  },
  privateSection: {
    marginBottom: 4,
  },
  privateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  privateSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privateSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  unreadCountPill: {
    backgroundColor: '#EBF8EE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  unreadCountPillText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },
  privateHorizontalScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  privateMiniCard: {
    width: 155,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  privateMiniAvatarWrap: {
    position: 'relative',
  },
  privateMiniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateMiniInitials: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  privateMiniUnreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#0F172A',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateMiniUnreadText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  privateMiniName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  privateMiniMsg: {
    fontSize: 10,
    color: '#6B7280',
  },
  newSideChatMiniCard: {
    width: 145,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EBF8EE',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 14,
    padding: 10,
  },
  newSideChatPlusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSideChatPlusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  meetGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 16,
    padding: 12,
  },
  meetGroupImg: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  meetGroupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  meetGroupDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  meetGroupBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  meetGroupBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pinnedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 14,
    padding: 10,
  },
  pinIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EBF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedAuthor: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  pinnedChevron: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '700',
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dateDividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
    gap: 12,
  },
  eventIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    flex: 1,
  },
  eventTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  rsvpBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rsvpBtnActive: {
    backgroundColor: '#EBF8EE',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  rsvpBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rsvpBtnTextActive: {
    color: '#16A34A',
  },
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  avatarSmallText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  messageColumn: {
    maxWidth: '80%',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  senderRoleBadge: {
    fontSize: 10,
    color: '#16A34A',
    backgroundColor: '#EBF8EE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '700',
  },
  headerTimeText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  bubbleContainer: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderTopLeftRadius: 4,
  },
  replyQuote: {
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    paddingLeft: 8,
    marginBottom: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingRight: 6,
    borderRadius: 6,
  },
  replyQuoteAuthor: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  replyQuoteBody: {
    fontSize: 11,
    color: '#6B7280',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  myMessageText: {
    color: '#111827',
  },
  otherMessageText: {
    color: '#111827',
  },
  selfTimestampText: {
    fontSize: 10,
    color: '#6B7280',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  actionBtn: {
    paddingVertical: 2,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  actionBtnTextLiked: {
    color: '#22C55E',
    fontWeight: '800',
  },
  typingBanner: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#F8F9FA',
  },
  typingBannerText: {
    fontSize: 11,
    color: '#16A34A',
    fontStyle: 'italic',
  },
  plusMenuPopup: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  plusMenuItem: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  plusMenuItemText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  replyBannerContent: {
    flex: 1,
  },
  replyBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  replyBannerSnippet: {
    fontSize: 11,
    color: '#6B7280',
  },
  replyCloseBtn: {
    padding: 6,
  },
  replyCloseText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: figmaColors.bg,
    borderTopWidth: 1,
    borderTopColor: figmaColors.borderHairline,
    gap: 8,
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: figmaColors.surfacePill,
    borderWidth: 1,
    borderColor: figmaColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtnText: {
    color: figmaColors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  textInput: {
    flex: 1,
    backgroundColor: figmaColors.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: figmaColors.ink,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: figmaColors.inkButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '900',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  originalPostBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    marginBottom: 8,
  },
  originalPostAuthor: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  originalPostBody: {
    fontSize: 13,
    color: '#4B5563',
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  commentAvatarText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commentSender: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  commentTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  commentBody: {
    fontSize: 12.5,
    color: '#374151',
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
    fontSize: 13,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#111827',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentSendBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 18,
  },
  commentSendBtnText: {
    color: '#22C55E',
    fontWeight: '800',
    fontSize: 12,
  },
  infoDescText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  rulesCard: {
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
    gap: 6,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    marginBottom: 2,
  },
  ruleBullet: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  infoActionPrimary: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  infoActionSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoActionSecondaryText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  manageInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
  },
  inputLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  messageMemberBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  messageMemberBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  joinGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: figmaColors.bg,
  },
  joinGateCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: figmaColors.border,
    padding: 24,
    alignItems: 'center',
    ...figmaShadows.card,
  },
  joinGateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: figmaColors.limeSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  joinGateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: figmaColors.inkOlive,
    letterSpacing: 0.6,
  },
  joinGateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: figmaColors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  joinGateMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: figmaColors.inkSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  joinGateDesc: {
    fontSize: 14,
    color: figmaColors.inkSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  joinGateBtn: {
    width: '100%',
    backgroundColor: figmaColors.ink,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinGateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
