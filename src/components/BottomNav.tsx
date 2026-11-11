import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import CreateCommunityModal from './CreateCommunityModal';

export type BottomTabKey = 'Home' | 'Discover' | 'Activity' | 'Profile';

interface BottomNavProps {
  activeTab: BottomTabKey;
  navigation: any;
  onCreatePress?: () => void;
  onCommunityCreated?: (community: any) => void;
  unreadCount?: number;
}

export default function BottomNav({
  activeTab,
  navigation,
  onCreatePress,
  onCommunityCreated,
  unreadCount = 0,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (onCreatePress) {
      onCreatePress();
    } else {
      setShowCreate(true);
    }
  };

  const go = (route: BottomTabKey) => {
    if (activeTab !== route) {
      navigation.navigate(route);
    }
  };

  return (
    <>
    <View style={[styles.bottomNav, { paddingBottom: bottomPad }]}>
      {/* 1. My Space */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => go('Home')}
        activeOpacity={0.7}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1V9.5z"
            stroke={activeTab === 'Home' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'Home' ? 2.1 : 1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'Home' && styles.navLabelActive,
          ]}
        >
          My Space
        </Text>
      </TouchableOpacity>

      {/* 2. Discover */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => go('Discover')}
        activeOpacity={0.7}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle
            cx={12}
            cy={12}
            r={9}
            stroke={activeTab === 'Discover' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'Discover' ? 2.1 : 1.7}
          />
          <Path
            d="M15.5 8.5l-2 5-5 2 2-5 5-2z"
            stroke={activeTab === 'Discover' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'Discover' ? 2.1 : 1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'Discover' && styles.navLabelActive,
          ]}
        >
          Discover
        </Text>
      </TouchableOpacity>

      {/* 3. Create (Center Black Circle) */}
      <TouchableOpacity
        style={styles.navCenterItem}
        onPress={handleCreate}
        activeOpacity={0.85}
      >
        <View style={styles.navCreateCircle}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 5v14M5 12h14"
              stroke="#CEF26D"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <Text style={styles.navLabel}>Create</Text>
      </TouchableOpacity>

      {/* 4. Activity */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => go('Activity')}
        activeOpacity={0.7}
      >
        <View style={styles.iconWrap}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
              stroke={activeTab === 'Activity' ? '#111827' : '#9CA3AF'}
              strokeWidth={activeTab === 'Activity' ? 2.1 : 1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          {unreadCount > 0 ? <View style={styles.navBadgeDot} /> : null}
        </View>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'Activity' && styles.navLabelActive,
          ]}
        >
          Activity
        </Text>
      </TouchableOpacity>

      {/* 5. Me */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => go('Profile')}
        activeOpacity={0.7}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
            stroke={activeTab === 'Profile' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'Profile' ? 2.1 : 1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx={12}
            cy={7}
            r={4}
            stroke={activeTab === 'Profile' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'Profile' ? 2.1 : 1.7}
          />
        </Svg>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'Profile' && styles.navLabelActive,
          ]}
        >
          Me
        </Text>
      </TouchableOpacity>
    </View>

    <CreateCommunityModal
      visible={showCreate}
      onClose={() => setShowCreate(false)}
      navigation={navigation}
      onCreated={onCommunityCreated}
    />
    </>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
    gap: 3,
  },
  navCenterItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -16,
    gap: 3,
  },
  navCreateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  iconWrap: {
    position: 'relative',
  },
  navBadgeDot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  navLabelActive: {
    fontWeight: '800',
    color: '#111827',
  },
});
