import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { BluetoothDevice } from '../types';
import { ScalePress } from './ScalePress';

interface Props {
  connectedDevices: BluetoothDevice[];
  targetDevice: string;
  onTargetChange: (target: string) => void;
}

function AnimatedDot() {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
  );
}

function DeviceChip({
  label,
  icon,
  isActive,
  onPress,
  delay,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
  delay: number;
}) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      <ScalePress onPress={onPress} scaleTo={0.9}>
        <View style={[styles.chip, isActive && styles.chipActive]}>
          {isActive && (
            <LinearGradient
              colors={['rgba(108, 99, 255, 0.9)', 'rgba(0, 212, 170, 0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Ionicons
            name={icon}
            size={14}
            color={isActive ? '#fff' : Colors.textMuted}
          />
          <Text
            style={[styles.chipText, isActive && styles.chipTextActive]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <AnimatedDot />
        </View>
      </ScalePress>
    </Animated.View>
  );
}

export function ConnectedDevicesBar({ connectedDevices, targetDevice, onTargetChange }: Props) {
  if (connectedDevices.length === 0) return null;

  const containerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(containerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const isAll = targetDevice === 'all';

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      <LinearGradient
        colors={['rgba(26, 26, 46, 0.95)', 'rgba(10, 10, 26, 0.95)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.statusDot} />
        <Text style={styles.count}>
          {connectedDevices.length} device{connectedDevices.length > 1 ? 's' : ''} connected
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {connectedDevices.length > 1 && (
          <DeviceChip
            label="All"
            icon="globe-outline"
            isActive={isAll}
            onPress={() => onTargetChange('all')}
            delay={0}
          />
        )}
        {connectedDevices.map((device, i) => (
          <DeviceChip
            key={device.address}
            label={device.name || 'Unknown'}
            icon="laptop-outline"
            isActive={targetDevice === device.address}
            onPress={() => onTargetChange(device.address)}
            delay={(i + 1) * 100}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  count: {
    color: Colors.success,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    letterSpacing: 0.3,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxWidth: 160,
    overflow: 'hidden',
  },
  chipActive: {
    borderColor: 'rgba(108, 99, 255, 0.5)',
  },
  chipText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginLeft: Spacing.xs,
    marginRight: Spacing.xs,
  },
  chipTextActive: {
    color: '#fff',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
});
