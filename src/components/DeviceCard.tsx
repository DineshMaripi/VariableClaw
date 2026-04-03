import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';
import { BluetoothDevice } from '../types';
import { ScalePress } from './ScalePress';

interface Props {
  device: BluetoothDevice;
  isConnecting: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  index?: number;
}

export function DeviceCard({ device, isConnecting, isConnected, onConnect, onDisconnect, index = 0 }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const connectedGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(connectedGlow, {
      toValue: isConnected ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [isConnected]);

  const borderColor = connectedGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', 'rgba(0, 212, 170, 0.5)'],
  });

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        marginBottom: Spacing.sm,
      }}
    >
      <ScalePress onPress={isConnected ? onDisconnect : onConnect} disabled={isConnecting}>
        <Animated.View style={[styles.card, { borderColor }]}>
          <LinearGradient
            colors={
              isConnected
                ? ['rgba(0, 212, 170, 0.08)', 'rgba(0, 212, 170, 0.02)']
                : ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)']
            }
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.info}>
            <View style={[styles.iconContainer, isConnected && styles.iconConnected]}>
              <Ionicons
                name={isConnected ? 'laptop' : 'laptop-outline'}
                size={26}
                color={isConnected ? Colors.accent : Colors.textSecondary}
              />
              {isConnected && <View style={styles.connectedIndicator} />}
            </View>
            <View style={styles.details}>
              <Text style={styles.name}>{device.name || 'Unknown Device'}</Text>
              <Text style={styles.address}>{device.address}</Text>
            </View>
          </View>
          <View style={[styles.button, isConnected ? styles.disconnectButton : styles.connectButton]}>
            {isConnecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={isConnected ? 'close-outline' : 'link-outline'}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.buttonText}>
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Text>
              </>
            )}
          </View>
        </Animated.View>
      </ScalePress>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconConnected: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
  },
  connectedIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  details: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  address: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 110,
    justifyContent: 'center',
    gap: 4,
  },
  connectButton: {
    backgroundColor: Colors.primary,
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.8)',
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
