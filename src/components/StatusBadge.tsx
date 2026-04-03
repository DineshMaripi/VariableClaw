import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';
import { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string }> = {
  disconnected: { label: 'Disconnected', color: Colors.textMuted },
  scanning: { label: 'Scanning...', color: Colors.warning },
  pairing: { label: 'Pairing...', color: Colors.warning },
  connected: { label: 'Connected', color: Colors.success },
  error: { label: 'Error', color: Colors.error },
};

export function StatusBadge({ status }: Props) {
  const config = statusConfig[status];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dot entrance
    Animated.spring(dotScale, {
      toValue: 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // Pulse for active states
    if (status === 'scanning' || status === 'pairing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else if (status === 'connected') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  return (
    <View style={[styles.badge, { borderColor: config.color + '40' }]}>
      <View style={styles.dotContainer}>
        <Animated.View
          style={[
            styles.dotPulse,
            {
              backgroundColor: config.color + '30',
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: config.color,
              transform: [{ scale: dotScale }],
              shadowColor: config.color,
            },
          ]}
        />
      </View>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  dotContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  dotPulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
