import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateCommunityModal from './CreateCommunityModal';
import {
  HomeIcon,
  CompassIcon,
  PlusIcon,
  BellIcon,
  UserIcon,
} from './FigmaIcons';
import { figmaColors, figmaShadows } from '../theme/figmaTheme';

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
  const bottomPad = Math.max(insets.bottom, 12);
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
          accessibilityRole="tab"
          accessibilityLabel="My Space"
          accessibilityState={{ selected: activeTab === 'Home' }}
        >
          <HomeIcon
            size={21}
            color={activeTab === 'Home' ? figmaColors.ink : figmaColors.inkInactive}
            strokeWidth={activeTab === 'Home' ? 1.85 : 1.55}
          />
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
          accessibilityRole="tab"
          accessibilityLabel="Discover"
          accessibilityState={{ selected: activeTab === 'Discover' }}
        >
          <CompassIcon
            size={21}
            color={
              activeTab === 'Discover' ? figmaColors.ink : figmaColors.inkInactive
            }
            strokeWidth={activeTab === 'Discover' ? 1.85 : 1.55}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'Discover' && styles.navLabelActive,
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>

        {/* 3. Create (Center Dark Circle with Lime Plus) */}
        <TouchableOpacity
          style={styles.navCenterItem}
          onPress={handleCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Create community"
        >
          <View style={styles.navCreateCircle}>
            <PlusIcon size={22} color={figmaColors.brandLime} strokeWidth={1.85} />
          </View>
          <Text style={styles.navLabel}>Create</Text>
        </TouchableOpacity>

        {/* 4. Activity */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => go('Activity')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Activity"
          accessibilityState={{ selected: activeTab === 'Activity' }}
        >
          <View style={styles.iconWrap}>
            <BellIcon
              size={21}
              color={
                activeTab === 'Activity' ? figmaColors.ink : figmaColors.inkInactive
              }
              strokeWidth={activeTab === 'Activity' ? 1.85 : 1.55}
            />
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
          accessibilityRole="tab"
          accessibilityLabel="Profile"
          accessibilityState={{ selected: activeTab === 'Profile' }}
        >
          <UserIcon
            size={21}
            color={
              activeTab === 'Profile' ? figmaColors.ink : figmaColors.inkInactive
            }
            strokeWidth={activeTab === 'Profile' ? 1.85 : 1.55}
          />
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
    backgroundColor: figmaColors.bg,
    borderTopWidth: 1,
    borderTopColor: figmaColors.borderHairline,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
    gap: 4,
  },
  navCenterItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -18,
    gap: 4,
  },
  navCreateCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: figmaColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...figmaShadows.floating,
  },
  iconWrap: {
    position: 'relative',
  },
  navBadgeDot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: figmaColors.onlineGreen,
    borderWidth: 1.5,
    borderColor: figmaColors.bg,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: figmaColors.inkInactive,
  },
  navLabelActive: {
    fontWeight: '800',
    color: figmaColors.ink,
  },
});
