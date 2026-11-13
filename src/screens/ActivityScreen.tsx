import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { mobileApi } from '../api/client';
import { mobileSocket } from '../api/socket';
import { Community } from '../types';
import BottomNav from '../components/BottomNav';
import {
  ChevronLeftIcon,
  BellIcon,
  CalendarIcon,
  LockIcon,
  ChatBubbleIcon,
  ReplyIcon,
} from '../components/FigmaIcons';
import { figmaColors } from '../theme/figmaTheme';

interface ActivityItem {
  id: string;
  type: 'event' | 'sidechat' | 'reply' | 'like' | 'message';
  icon: string;
  badgeColor: string;
  title: string;
  description: string;
  timestamp: string;
  rawTime: number;
  communityId: string;
  communityName: string;
  recipientId?: string;
  recipientName?: string;
}

export default function ActivityScreen() {
  const navigation = useNavigation<any>();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [filter, setFilter] = useState<'all' | 'mentions' | 'sidechats' | 'events'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await mobileApi.getCommunities();
      if (Array.isArray(data)) {
        setCommunities(data);
      }
    } catch (err) {
      console.warn('Error fetching activity:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    const refresh = () => fetchActivity();

    mobileSocket.on('new-group-message', refresh);
    mobileSocket.on('new-private-message', refresh);
    mobileSocket.on('message-liked', refresh);
    mobileSocket.on('new-comment', refresh);
    mobileSocket.on('event-rsvp-updated', refresh);
    mobileSocket.on('community-created', refresh);

    return () => {
      mobileSocket.off('new-group-message', refresh);
      mobileSocket.off('new-private-message', refresh);
      mobileSocket.off('message-liked', refresh);
      mobileSocket.off('new-comment', refresh);
      mobileSocket.off('event-rsvp-updated', refresh);
      mobileSocket.off('community-created', refresh);
    };
  }, [fetchActivity]);

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    communities.forEach((comm) => {
      // 1. Upcoming Community Events
      if (comm.event) {
        items.push({
          id: `evt-${comm.id}-${comm.event.id}`,
          type: 'event',
          icon: '📅',
          badgeColor: '#065F46',
          title: `${comm.event.title} (${comm.event.tag})`,
          description: `${comm.event.location} • ${comm.event.attendeesCount} going in ${comm.name}`,
          timestamp: comm.event.isJoined ? 'Joined ✓' : 'RSVP Open',
          rawTime: Date.now() - 120000,
          communityId: comm.id,
          communityName: comm.name,
        });
      }

      // 2. Scoped Private Side-Chats
      (comm.privateChats || []).forEach((sc) => {
        if (sc.lastMessage) {
          items.push({
            id: `sc-${comm.id}-${sc.id}`,
            type: 'sidechat',
            icon: '🔒',
            badgeColor: '#3B0764',
            title: `${sc.recipient.name} in ${comm.name}`,
            description: `"${sc.lastMessage}"`,
            timestamp: sc.lastMessageTime || 'Just now',
            rawTime: sc.rawTime || Date.now() - 300000,
            communityId: comm.id,
            communityName: comm.name,
            recipientId: sc.recipient.id,
            recipientName: sc.recipient.name,
          });
        }
      });

      // 3. Group Messages, Likes, Replies, and Thread Comments
      (comm.groupMessages || []).forEach((msg) => {
        if (msg.likes > 0) {
          items.push({
            id: `like-${msg.id}`,
            type: 'like',
            icon: '❤️',
            badgeColor: '#7F1D1D',
            title: `${msg.likes} ${msg.likes === 1 ? 'person' : 'people'} liked ${msg.senderName}'s post`,
            description: `"${msg.body}" in ${comm.name}`,
            timestamp: msg.timestamp || 'Recent',
            rawTime: (msg.rawTime || Date.now()) + 100,
            communityId: comm.id,
            communityName: comm.name,
          });
        }

        if (msg.comments && msg.comments.length > 0) {
          const latestComment = msg.comments[msg.comments.length - 1];
          items.push({
            id: `comment-${msg.id}-${latestComment.id}`,
            type: 'reply',
            icon: '💬',
            badgeColor: '#1E3A8A',
            title: `${latestComment.senderName} replied in thread`,
            description: `"${latestComment.body}" on "${msg.body}"`,
            timestamp: latestComment.timestamp || 'Just now',
            rawTime: (msg.rawTime || Date.now()) + 200,
            communityId: comm.id,
            communityName: comm.name,
          });
        }

        if (msg.replyTo) {
          items.push({
            id: `reply-${msg.id}`,
            type: 'reply',
            icon: '↩️',
            badgeColor: '#1E3A8A',
            title: `${msg.senderName} replied to ${msg.replyTo.senderName}`,
            description: `"${msg.body}" in ${comm.name}`,
            timestamp: msg.timestamp || 'Just now',
            rawTime: msg.rawTime || Date.now(),
            communityId: comm.id,
            communityName: comm.name,
          });
        } else {
          items.push({
            id: `msg-${msg.id}`,
            type: 'message',
            icon: '📣',
            badgeColor: '#1E293B',
            title: `${msg.senderName} posted in ${comm.name}`,
            description: msg.body,
            timestamp: msg.timestamp || 'Just now',
            rawTime: msg.rawTime || Date.now(),
            communityId: comm.id,
            communityName: comm.name,
          });
        }
      });
    });

    return items.sort((a, b) => b.rawTime - a.rawTime);
  }, [communities]);

  const filteredActivities = activities.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'mentions') return a.type === 'reply' || a.type === 'like' || a.type === 'message';
    if (filter === 'sidechats') return a.type === 'sidechat';
    if (filter === 'events') return a.type === 'event';
    return true;
  });

  const handlePressActivity = (item: ActivityItem) => {
    if (item.type === 'sidechat' && item.recipientId) {
      navigation.navigate('PrivateChat', {
        communityId: item.communityId,
        recipientId: item.recipientId,
        recipientName: item.recipientName,
      });
    } else {
      navigation.navigate('CommunityChat', {
        communityId: item.communityId,
      });
    }
  };

  const renderActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'event':
        return <CalendarIcon size={18} color={figmaColors.ink} />;
      case 'sidechat':
        return <LockIcon size={17} color={figmaColors.ink} />;
      case 'reply':
        return <ReplyIcon size={17} color={figmaColors.ink} />;
      case 'message':
      default:
        return <ChatBubbleIcon size={17} color={figmaColors.ink} />;
    }
  };

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePressActivity(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: item.badgeColor }]}>
        {renderActivityIcon(item.type)}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.timeText}>{item.timestamp}</Text>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.commTagRow}>
          <Text style={styles.commTagText}>#{item.communityName}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={20} color={figmaColors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Activity & Updates</Text>
          <Text style={styles.headerSubtitle}>
            Live events, thread replies, likes & scoped side-chats
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'mentions', label: 'Channels & Likes' },
          { key: 'sidechats', label: 'Side-Chats' },
          { key: 'events', label: 'Events' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tabPill,
              filter === t.key && styles.tabPillActive,
            ]}
            onPress={() => setFilter(t.key as any)}
          >
            <Text
              style={[
                styles.tabPillText,
                filter === t.key && styles.tabPillTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchActivity();
              }}
              tintColor="#10B981"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={{ marginBottom: 10 }}>
                <BellIcon size={32} color={figmaColors.inkMuted} />
              </View>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySubtitle}>
                Messages, likes, thread comments, events, and private side-chats will appear here in real time.
              </Text>
            </View>
          }
        />
      )}

      {/* Unified Figma Bottom Navigation Bar */}
      <BottomNav
        activeTab="Activity"
        navigation={navigation}
        onCommunityCreated={() => fetchActivity()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 6,
  },
  backBtnText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  tabPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 36,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 6,
  },
  commTagRow: {
    flexDirection: 'row',
  },
  commTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
});

