import { Platform, ViewStyle } from 'react-native';

export const figmaColors = {
  // Backgrounds & Surfaces
  bg: '#FFFFFF',
  surfaceMuted: '#F5F6F2',
  surfaceSoft: '#F7F8F4',
  surfacePill: '#F1F3EE',
  sageSoft: '#EDF3E3',
  sagePill: '#EDF2E7',
  sageBanner: '#EDF6DC',
  limeSoft: '#E5F5B7',
  limeBadge: '#E8F6C7',
  sentBubble: '#DDF6A8',
  sentBubbleBorder: '#CBE98A',

  // Brand & Accents
  brandLime: '#D8FF5F',
  onlineGreen: '#4FD276',
  onlineDot: '#51D977',
  onlineBright: '#55DE7A',

  // Inks & Text
  ink: '#182019',
  inkDark: '#253128',
  inkButton: '#293524',
  inkForest: '#33432F',
  inkOlive: '#445A31',
  inkSecondary: '#65705F',
  inkMuted: '#727A70',
  inkSubtle: '#7D857A',
  inkInactive: '#8D948A',

  // Borders
  border: '#DFE3DB',
  borderLight: '#E5E8E1',
  borderHairline: '#ECEFE8',
  borderAccent: '#DDEBC3',

  // Status
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
};

export const figmaRadii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const figmaShadows: Record<'card' | 'floating' | 'subtle', ViewStyle> = {
  card: Platform.select({
    ios: {
      shadowColor: '#1B281B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }) as ViewStyle,
  floating: Platform.select({
    ios: {
      shadowColor: '#182019',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
    },
    android: {
      elevation: 5,
    },
    default: {},
  }) as ViewStyle,
  subtle: Platform.select({
    ios: {
      shadowColor: '#1B281B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }) as ViewStyle,
};
