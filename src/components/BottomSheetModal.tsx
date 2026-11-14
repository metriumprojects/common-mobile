import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Animated,
  PanResponder,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: 'bottom' | 'center';
  maxHeight?: DimensionValue;
  sheetStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

/**
 * Reusable keyboard-safe, swipe-to-close, tap-outside-to-close modal
 * with a clean transparent backdrop (no dark/black half-screen shadow).
 */
export default function BottomSheetModal({
  visible,
  onClose,
  children,
  variant = 'bottom',
  maxHeight = '86%',
  sheetStyle,
  scrollable = true,
}: BottomSheetModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        variant === 'bottom' &&
        gestureState.dy > 8 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 65 || gestureState.vy > 0.55) {
          Animated.timing(translateY, {
            toValue: 320,
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={variant === 'bottom' ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={[
            styles.backdrop,
            variant === 'center' ? styles.backdropCenter : styles.backdropBottom,
          ]}
          onPress={onClose}
        >
          <Animated.View
            style={[
              variant === 'bottom' ? styles.bottomSheet : styles.centerSheet,
              variant === 'bottom' ? { maxHeight } : null,
              { transform: [{ translateY }] },
              sheetStyle,
            ]}
            {...(variant === 'bottom' ? panResponder.panHandlers : {})}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {variant === 'bottom' ? (
                <View style={styles.dragHandleWrap}>
                  <View style={styles.dragHandle} />
                </View>
              ) : null}

              {scrollable && variant === 'bottom' ? (
                <ScrollView
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              ) : (
                children
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    // Nearly invisible tap-catcher so there is zero black half-screen shadow
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  backdropBottom: {
    justifyContent: 'flex-end',
  },
  backdropCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  centerSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
    maxWidth: 360,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 2,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
});
