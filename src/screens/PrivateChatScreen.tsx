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
  Modal,
  Linking,
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
import { Community, ChatMessage, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  MoreHorizontalIcon,
  CloseIcon,
  LockIcon,
  CheckIcon,
  ReplyIcon,
  ChatBubbleIcon,
  PlusIcon,
  SendIcon,
  ThumbsUpIcon,
  SmileIcon,
  TrashIcon,
  PinIcon,
  CalendarIcon,
} from '../components/FigmaIcons';
import { figmaColors } from '../theme/figmaTheme';

export default function PrivateChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    communityId,
    recipientId,
    recipientName: paramRecipientName,
    recipientRole: paramRecipientRole,
    recipientAvatarColor: paramAvatarColor,
  } = route.params || {};

  const initialCachedCommunity = (() => {
    const cached = getCachedCommunities(user?.id);
    return cached?.find((c) => c.id === communityId) || null;
  })();
  const initialSideChat = initialCachedCommunity?.privateChats?.find(
    (pc) => pc.recipient.id === recipientId
  );

  const [community, setCommunity] = useState<Community | null>(initialCachedCommunity);
  const [recipient, setRecipient] = useState<UserProfile>(
    () =>
      initialSideChat?.recipient || {
        id: recipientId || 'member',
        name: paramRecipientName || 'Member',
        initials: (paramRecipientName || 'M')[0].toUpperCase(),
        avatarColor: paramAvatarColor || '#8B5CF6',
        role: paramRecipientRole || 'Community Member',
        online: true,
        joinedDate: 'Nov 2026',
      }
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialSideChat?.messages || []
  );
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(!initialSideChat);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [muted, setMuted] = useState(false);

  // Search & Multi-Emoji Reactions
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reactionTargetMessage, setReactionTargetMessage] = useState<ChatMessage | null>(null);
  const EMOJI_LIST = ['👍', '❤️', '🔥', '😂', '🎉', '👏'];

  // Modals
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);

  const fetchPrivateMessages = useCallback(async () => {
    try {
      setLoadError(false);
      if (!getCachedCommunities(user?.id)) {
        const disk = await hydrateCommunitiesFromDisk(user?.id);
        const diskComm = disk?.find((c) => c.id === communityId);
        if (diskComm) {
          setCommunity(diskComm);
          const diskSide = diskComm.privateChats?.find(
            (pc) => pc.recipient.id === recipientId
          );
          if (diskSide) {
            setRecipient(diskSide.recipient);
            setMessages(diskSide.messages || []);
            setLoading(false);
          }
        }
      }
      const all = await mobileApi.getCommunities(user?.id);
      if (Array.isArray(all)) {
        setCachedCommunities(user?.id, all);
      }
      const current = all.find((c) => c.id === communityId) || all[0];
      if (current) {
        setCommunity(current);
        const sideChat = current.privateChats?.find(
          (pc) => pc.recipient.id === recipientId
        );
        if (sideChat) {
          setRecipient(sideChat.recipient);
          setMessages(sideChat.messages || []);
          if (sideChat.unreadCount > 0) {
            mobileApi.markPrivateChatRead(current.id, recipientId).catch(() => {});
          }
        }
        setLoadError(false);
      }
    } catch (err) {
      console.warn('Error fetching private messages:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [communityId, recipientId, user?.id]);

  useEffect(() => {
    fetchPrivateMessages();

    const joinPrivateRoom = () => {
      if (communityId) {
        mobileSocket.emit('join-community', communityId);
      }
      if (user?.id) {
        mobileSocket.emit('user-online', user.id);
      }
    };
    joinPrivateRoom();

    const handleNewPrivateMessage = ({
      communityId: cId,
      recipientId: rId,
      message,
    }: any) => {
      if (cId !== communityId || !message) return;
      const currentUserId = user?.id;
      const isRelevant =
        (message.senderId === currentUserId && rId === recipientId) ||
        (message.senderId === recipientId && rId === currentUserId);

      if (isRelevant) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          const tempIdx = prev.findIndex(
            (m) =>
              m.id.startsWith('temp-') &&
              m.senderId === message.senderId &&
              m.body === message.body
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = message;
            return next;
          }
          return [...prev, message];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 60);
      }
    };

    const handleMessageLiked = ({ messageId, likes, userLiked }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, likes, userLiked } : m))
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

    const handleUserTyping = (payload: any) => {
      if (
        payload?.communityId === communityId &&
        payload?.isPrivate &&
        payload?.senderId === recipientId &&
        payload?.recipientId === user?.id
      ) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (payload: any) => {
      if (
        payload?.communityId === communityId &&
        payload?.isPrivate &&
        payload?.senderId === recipientId
      ) {
        setIsTyping(false);
      }
    };

    mobileSocket.on('connect', joinPrivateRoom);
    mobileSocket.on('new-private-message', handleNewPrivateMessage);
    mobileSocket.on('message-liked', handleMessageLiked);
    mobileSocket.on('message-reaction-updated', handleReactionUpdated);
    mobileSocket.on('message-deleted', handleMessageDeleted);
    mobileSocket.on('user-typing', handleUserTyping);
    mobileSocket.on('user-stop-typing', handleUserStopTyping);

    return () => {
      mobileSocket.off('connect', joinPrivateRoom);
      mobileSocket.off('new-private-message', handleNewPrivateMessage);
      mobileSocket.off('message-liked', handleMessageLiked);
      mobileSocket.off('message-reaction-updated', handleReactionUpdated);
      mobileSocket.off('message-deleted', handleMessageDeleted);
      mobileSocket.off('user-typing', handleUserTyping);
      mobileSocket.off('user-stop-typing', handleUserStopTyping);
    };
  }, [communityId, recipientId, user?.id, fetchPrivateMessages]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    mobileSocket.emit('typing', {
      communityId,
      isPrivate: true,
      senderId: user?.id,
      recipientId,
      userName: user?.name || 'Member',
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      mobileSocket.emit('stop-typing', {
        communityId,
        isPrivate: true,
        senderId: user?.id,
        recipientId,
      });
    }, 1500);
  };

  const sendOptimisticPrivateMessage = async (
    textToSend: string,
    replyTo?: { senderName: string; body: string },
    retryTempId?: string,
    mediaUrl?: string
  ) => {
    const tempId = retryTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const senderName = user?.name || user?.fullName || 'Community Member';
    const senderData = {
      id: user?.id || 'me',
      name: senderName,
      initials: senderName[0].toUpperCase(),
      avatarColor: '#059669',
    };

    if (retryTempId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === retryTempId ? { ...m, status: 'sending' } : m))
      );
    } else {
      const optimisticMsg: ChatMessage = {
        id: tempId,
        communityId,
        senderId: senderData.id,
        senderName: senderData.name,
        senderInitials: senderData.initials,
        senderAvatarColor: senderData.avatarColor,
        body: textToSend,
        imageUrl: mediaUrl,
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
      const sentMsg = await mobileApi.sendPrivateMessage(
        communityId,
        recipientId,
        textToSend,
        senderData,
        replyTo,
        {
          name: recipient.name,
          initials: recipient.initials,
          avatarColor: recipient.avatarColor,
          role: recipient.role,
        },
        mediaUrl,
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
      console.error('Error sending private message:', err);
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
    mobileSocket.emit('stop-typing', {
      communityId,
      isPrivate: true,
      senderId: user?.id,
      recipientId,
    });

    await sendOptimisticPrivateMessage(textToSend, replyTo);
  };

  const handleToggleLike = async (messageId: string) => {
    try {
      await mobileApi.toggleLikeMessage(
        communityId,
        messageId,
        user?.id || 'me'
      );
    } catch (err) {
      console.error('Error liking private message:', err);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setReactionTargetMessage(null);
    try {
      await mobileApi.toggleReaction(
        communityId,
        messageId,
        emoji,
        user?.id || 'me'
      );
    } catch (err) {
      console.error('Error reacting to private message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await mobileApi.deleteMessage(communityId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      Toast.show({ type: 'success', text1: 'Message deleted' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Delete failed' });
    }
  };

  const displayedMessages = messages.filter((msg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return msg.body && msg.body.toLowerCase().includes(q);
  });

  const firstName = recipient.name.split(' ')[0];

  const renderContextHeader = () => (
    <View style={styles.contextContainer}>
      {/* Scoped Explanatory Card */}
      <View style={styles.scopedPrivacyBox}>
        <View style={styles.scopedPrivacyHeader}>
          <Text style={{ fontSize: 13 }}>🔒</Text>
          <Text style={styles.scopedPrivacyTitle}>
            Just you and {firstName}
          </Text>
        </View>
        <Text style={styles.scopedPrivacyText}>
          This side-chat belongs to{' '}
          <Text style={{ fontWeight: '800', color: '#34D399' }}>
            {community?.name || 'this community'}
          </Text>
          . It's private, but stays connected to the community where you met.
        </Text>
      </View>

      {/* Overlapping Avatars Connection Card */}
      <View style={styles.connectionCard}>
        <View style={styles.overlappingAvatars}>
          <View style={[styles.overlapCircle, { backgroundColor: '#059669', zIndex: 2 }]}>
            <Text style={styles.overlapText}>
              {(user?.name || user?.fullName || 'Y')[0].toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.overlapCircle,
              {
                backgroundColor: recipient.avatarColor || '#8B5CF6',
                marginLeft: -10,
                zIndex: 1,
              },
            ]}
          >
            <Text style={styles.overlapText}>
              {recipient.initials || recipient.name[0]}
            </Text>
          </View>
        </View>
        <Text style={styles.connectionTitle}>
          You're both members of {community?.name || 'this space'}
        </Text>
        <Text style={styles.connectionRole}>{recipient.role}</Text>
      </View>

      {/* Date Divider */}
      <View style={styles.dateDivider}>
        <Text style={styles.dateDividerText}>TODAY</Text>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSelf =
      item.isSelf ||
      (user?.id && item.senderId === user.id);

    return (
      <View
        style={[
          styles.messageRow,
          isSelf ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isSelf ? (
          <View
            style={[
              styles.msgAvatar,
              { backgroundColor: recipient.avatarColor || '#8B5CF6' },
            ]}
          >
            <Text style={styles.msgAvatarText}>
              {recipient.initials || recipient.name[0]}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.messageColumn,
            isSelf ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
          ]}
        >
          <View style={styles.senderTimeRow}>
            <Text style={styles.senderLabel}>
              {isSelf ? 'You' : item.senderName || recipient.name}
            </Text>
            <Text style={styles.timeLabel}>{item.timestamp || 'Just now'}</Text>
          </View>

          <View
            style={[
              styles.bubbleContainer,
              isSelf ? styles.myBubble : styles.otherBubble,
            ]}
          >
            {item.replyTo ? (
              <View style={styles.replyQuoteBox}>
                <Text style={styles.replyQuoteSender}>
                  {item.replyTo.senderName}:
                </Text>
                <Text style={styles.replyQuoteText} numberOfLines={2}>
                  {item.replyTo.body}
                </Text>
              </View>
            ) : null}

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

          <View style={styles.msgFooterRow}>
            {isSelf ? (
              item.status === 'failed' ? (
                <TouchableOpacity
                  onPress={() => sendOptimisticPrivateMessage(item.body, item.replyTo, item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.readReceiptText, { color: '#DC2626', fontWeight: '700' }]}>
                    Failed · Tap to retry
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <CheckIcon size={11} color={figmaColors.inkMuted} strokeWidth={1.3} />
                  <Text style={styles.readReceiptText}>
                    {item.status === 'sending' ? 'Sending...' : 'Delivered'}
                  </Text>
                </View>
              )
            ) : null}

            <TouchableOpacity
              onPress={() => handleToggleLike(item.id)}
              style={styles.msgActionBtn}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ThumbsUpIcon
                  size={12}
                  color={item.userLiked ? figmaColors.inkOlive : figmaColors.inkMuted}
                />
                <Text
                  style={[
                    styles.msgActionText,
                    item.userLiked && styles.msgActionLiked,
                  ]}
                >
                  Like {item.likes ? `· ${item.likes}` : ''}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReactionTargetMessage(item)}
              style={[styles.msgActionBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <SmileIcon size={12} color={figmaColors.inkMuted} />
              <Text style={styles.msgActionText}>React</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReplyTarget(item)}
              style={[styles.msgActionBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <ReplyIcon size={12} color={figmaColors.inkMuted} />
              <Text style={styles.msgActionText}>Reply</Text>
            </TouchableOpacity>

            {isSelf ? (
              <TouchableOpacity
                onPress={() => handleDeleteMessage(item.id)}
                style={styles.msgActionBtn}
              >
                <TrashIcon size={13} color={figmaColors.danger} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={20} color={figmaColors.ink} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <View
              style={[
                styles.headerAvatar,
                { backgroundColor: recipient.avatarColor || '#8B5CF6' },
              ]}
            >
              <Text style={styles.headerAvatarText}>
                {recipient.initials || recipient.name[0]}
              </Text>
            </View>
            <View style={styles.headerOnlineDot} />
          </View>

          <View>
            <Text style={styles.headerTitle}>{recipient.name}</Text>
            <Text style={styles.headerSubtitle}>
              {recipient.online !== false ? 'Online now' : 'Offline'}
              {muted ? ' · Muted' : ''}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <SearchIcon size={17} color={figmaColors.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => setShowOptionsModal(true)}
            activeOpacity={0.7}
          >
            <MoreHorizontalIcon size={20} color={figmaColors.ink} />
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
            placeholder={`Search messages with ${recipient.name.split(' ')[0]}...`}
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

      {/* Community Context Banner linking side-chat to parent community */}
      <TouchableOpacity
        style={styles.communityContextBanner}
        onPress={() =>
          navigation.navigate('CommunityChat', {
            communityId: community?.id || communityId,
          })
        }
        activeOpacity={0.75}
      >
        <View style={styles.contextBannerLeft}>
          {community?.imageUrl ? (
            <Image
              source={{ uri: community.imageUrl }}
              style={styles.contextCommAvatar}
            />
          ) : (
            <View style={styles.contextCommFallback}>
              <ChatBubbleIcon size={13} color={figmaColors.inkOlive} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.contextBannerTitle} numberOfLines={1}>
              Private side-chat in {community?.name || 'Community'}
            </Text>
            <Text style={styles.contextBannerSub}>View community room</Text>
          </View>
        </View>
        <ChevronRightIcon size={16} color={figmaColors.inkMuted} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.contentArea}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={figmaColors.ink} />
          </View>
        ) : !community && messages.length === 0 && loadError ? (
          <View style={styles.loadingContainer}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: figmaColors.ink, marginBottom: 6 }}>
              Could not load private chat
            </Text>
            <Text style={{ fontSize: 13, color: figmaColors.inkMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 32 }}>
              Connection timed out or server is waking up.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                fetchPrivateMessages();
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
            ListHeaderComponent={renderContextHeader}
            contentContainerStyle={styles.messageList}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={30}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {/* Typing Indicator */}
        {isTyping ? (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>
              ✍️ {firstName} is typing...
            </Text>
          </View>
        ) : null}

        {/* Plus Quick-Action Menu */}
        {showPlusMenu ? (
          <View style={styles.plusMenuPopup}>
            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={async () => {
                setShowPlusMenu(false);
                try {
                  const ImagePicker = require('expo-image-picker');
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!perm.granted) {
                    Toast.show({ type: 'info', text1: 'Permission needed to access photos' });
                    return;
                  }
                  const picked = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images', 'videos'],
                    quality: 0.85,
                  });
                  if (picked.canceled || !picked.assets?.[0]) return;
                  const asset = picked.assets[0];
                  Toast.show({ type: 'info', text1: 'Uploading media...' });
                  const uploaded = await mobileApi.uploadFileDirect(
                    asset.uri,
                    asset.fileName || `media-${Date.now()}.jpg`,
                    asset.mimeType || 'image/jpeg',
                    asset.fileSize
                  );
                  await sendOptimisticPrivateMessage('', undefined, undefined, uploaded.url);
                } catch (err: any) {
                  Toast.show({
                    type: 'error',
                    text1: 'Media upload unavailable on this build',
                    text2: err?.message || 'Rebuild native app (Build 18) for gallery picker',
                  });
                }
              }}
            >
              <Text style={styles.plusMenuItemText}>📷 Share Photo / Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={async () => {
                setShowPlusMenu(false);
                try {
                  const DocumentPicker = require('expo-document-picker');
                  const picked = await DocumentPicker.getDocumentAsync({
                    type: ['application/pdf', 'text/plain', 'text/csv', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                    copyToCacheDirectory: true,
                  });
                  if (picked.canceled || !picked.assets?.[0]) return;
                  const asset = picked.assets[0];
                  Toast.show({ type: 'info', text1: `Uploading ${asset.name}...` });
                  const uploaded = await mobileApi.uploadFileDirect(
                    asset.uri,
                    asset.name,
                    asset.mimeType || 'application/octet-stream',
                    asset.size
                  );
                  await sendOptimisticPrivateMessage('', undefined, undefined, uploaded.url);
                } catch (err: any) {
                  Toast.show({
                    type: 'error',
                    text1: 'Document picker unavailable on this build',
                    text2: err?.message || 'Rebuild native app (Build 18) for file picker',
                  });
                }
              }}
            >
              <Text style={styles.plusMenuItemText}>📎 Share Document / File</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                setInputText(`Hey ${firstName}! Are you going to this week's meetup?`);
              }}
            >
              <CalendarIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>
                Ask About Weekly Meetup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                setInputText(`Let's meet near the entrance 10 mins before start!`);
              }}
            >
              <PinIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>
                Share Meetup Spot
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.plusMenuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={() => {
                setShowPlusMenu(false);
                setInputText(`Down for a quick coffee catchup after the session?`);
              }}
            >
              <ChatBubbleIcon size={15} color={figmaColors.ink} />
              <Text style={styles.plusMenuItemText}>
                Suggest 1-on-1 Catchup
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Docked Reply Quote Banner */}
        {replyTarget ? (
          <View style={styles.replyBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyBannerAuthor}>
                Replying to {replyTarget.senderName}
              </Text>
              <Text style={styles.replyBannerBody} numberOfLines={1}>
                {replyTarget.body}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyTarget(null)}
              style={{ padding: 6 }}
            >
              <CloseIcon size={15} color={figmaColors.inkMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Bottom Composer */}
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
            placeholder={`Message ${firstName} privately...`}
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
              color={!inputText.trim() ? figmaColors.inkInactive : figmaColors.brandLime}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              Options with {recipient.name}
            </Text>

            <TouchableOpacity
              style={styles.optionRowBtn}
              onPress={() => {
                setShowOptionsModal(false);
                navigation.navigate('CommunityChat', {
                  communityId: community?.id || communityId,
                });
              }}
            >
              <Text style={styles.optionRowText}>
                💬 Go to {community?.name || 'Community'} Room
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRowBtn}
              onPress={() => {
                setShowOptionsModal(false);
                navigation.navigate('CommunityInbox', {
                  communityId: community?.id || communityId,
                });
              }}
            >
              <Text style={styles.optionRowText}>
                🔒 View All Private Chats in {community?.name || 'Community'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRowBtn}
              onPress={() => {
                setMuted(!muted);
                setShowOptionsModal(false);
                Toast.show({
                  type: 'info',
                  text1: !muted ? 'Notifications Muted' : 'Notifications Unmuted',
                  text2: `Side-chat with ${recipient.name}`,
                });
              }}
            >
              <Text style={styles.optionRowText}>
                {muted ? '🔔 Unmute Notifications' : '🔕 Mute Notifications'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
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
              backgroundColor: '#1E293B',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              gap: 12,
              alignSelf: 'center',
              marginBottom: 100,
              borderWidth: 1,
              borderColor: '#334155',
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
    backgroundColor: '#F8F9FA',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 16,
    fontWeight: '800',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerAvatarWrap: {
    position: 'relative',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  optionsButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  optionsButtonText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  communityContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  contextBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  contextCommAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  contextCommFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  contextBannerSub: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  contextChevron: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
  },
  contextContainer: {
    marginBottom: 14,
    gap: 12,
  },
  scopedPrivacyBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 16,
    padding: 12,
  },
  scopedPrivacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scopedPrivacyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  scopedPrivacyText: {
    fontSize: 11.5,
    color: '#6B7280',
    lineHeight: 17,
  },
  connectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  overlappingAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  overlapCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  overlapText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  connectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  connectionRole: {
    fontSize: 11,
    color: '#6B7280',
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
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  msgAvatarText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
  messageColumn: {
    maxWidth: '78%',
  },
  senderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  timeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  bubbleContainer: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: figmaColors.sentBubble,
    borderWidth: 1,
    borderColor: figmaColors.sentBubbleBorder,
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: figmaColors.bg,
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderTopLeftRadius: 4,
  },
  replyQuoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    paddingLeft: 8,
    paddingVertical: 3,
    marginBottom: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  replyQuoteSender: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  replyQuoteText: {
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
  msgFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  readReceiptText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  msgActionBtn: {
    paddingVertical: 1,
  },
  msgActionText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  msgActionLiked: {
    color: '#22C55E',
    fontWeight: '800',
  },
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
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
  replyBannerAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  replyBannerBody: {
    fontSize: 11,
    color: '#6B7280',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
    gap: 8,
  },
  plusBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtnText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#111827',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  optionRowBtn: {
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  optionRowText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  closeModalBtn: {
    backgroundColor: '#0F172A',
    padding: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
