import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { figmaColors } from '../theme/figmaTheme';

interface BrandHeaderProps {
  initials?: string;
  avatarUrl?: string;
  avatarColor?: string;
  onPressAvatar?: () => void;
}

export default function BrandHeader({
  initials = 'U',
  avatarUrl,
  avatarColor,
  onPressAvatar,
}: BrandHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Text style={styles.brandText}>c</Text>
        <View style={styles.brandLimeCircle} />
        <Text style={styles.brandText}>mmon</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressAvatar}
        style={styles.avatarWrap}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View
            style={[
              styles.avatarCircle,
              avatarColor ? { backgroundColor: avatarColor } : null,
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: figmaColors.bg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: figmaColors.ink,
    lineHeight: 26,
  },
  brandLimeCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: figmaColors.brandLime,
    borderWidth: 2,
    borderColor: figmaColors.ink,
    marginHorizontal: 1.5,
    marginTop: 2,
  },
  avatarWrap: {
    position: 'relative',
    width: 38,
    height: 38,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: figmaColors.inkDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: figmaColors.onlineGreen,
    borderWidth: 2,
    borderColor: figmaColors.bg,
  },
});

