import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { ListeningState } from '../types';
import { ScalePress } from './ScalePress';

interface Props {
  state: ListeningState;
  onPress: () => void;
  disabled?: boolean;
}

const RING_COUNT = 4;

export function VoiceButton({ state, onPress, disabled }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rings = useRef(
    Array.from({ length: RING_COUNT }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0),
    }))
  ).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'listening') {
      // Expanding ripple rings
      rings.forEach((ring, i) => {
        const delay = i * 400;
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(ring.scale, {
                toValue: 2.2,
                duration: 1800,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(ring.opacity, {
                  toValue: 0.5,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(ring.opacity, {
                  toValue: 0,
                  duration: 1500,
                  useNativeDriver: true,
                }),
              ]),
            ]),
            Animated.parallel([
              Animated.timing(ring.scale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(ring.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ])
        ).start();
      });

      // Button breathe
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breatheAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();

      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'processing') {
      // Spinning animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'speaking') {
      // Bounce animation for speaking
      Animated.loop(
        Animated.sequence([
          Animated.spring(pulseAnim, { toValue: 1.1, tension: 80, friction: 4, useNativeDriver: true }),
          Animated.spring(pulseAnim, { toValue: 0.95, tension: 80, friction: 4, useNativeDriver: true }),
        ])
      ).start();

      Animated.timing(glowAnim, { toValue: 0.7, duration: 300, useNativeDriver: true }).start();
    } else {
      // Idle - gentle breathe
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      rotateAnim.setValue(0);
      breatheAnim.setValue(1);
      rings.forEach(r => { r.scale.setValue(1); r.opacity.setValue(0); });

      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1.03, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breatheAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [state]);

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (state) {
      case 'listening': return 'mic';
      case 'processing': return 'hourglass';
      case 'speaking': return 'volume-high';
      default: return 'mic-outline';
    }
  };

  const getGradient = (): [string, string] => {
    switch (state) {
      case 'listening': return ['#ff4757', '#ff6b81'];
      case 'processing': return ['#ffa502', '#eccc68'];
      case 'speaking': return ['#00d4aa', '#7bed9f'];
      default: return ['#6c63ff', '#a29bfe'];
    }
  };

  const getRingColor = () => {
    switch (state) {
      case 'listening': return 'rgba(255, 71, 87, 0.4)';
      case 'speaking': return 'rgba(0, 212, 170, 0.3)';
      default: return 'rgba(108, 99, 255, 0.3)';
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap to speak';
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const [gradStart, gradEnd] = getGradient();
  const ringColor = getRingColor();

  return (
    <View style={styles.container}>
      {/* Ripple rings */}
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              borderColor: ringColor,
              opacity: ring.opacity,
              transform: [{ scale: ring.scale }],
            },
          ]}
        />
      ))}

      {/* Outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            backgroundColor: gradStart,
            opacity: Animated.multiply(glowAnim, new Animated.Value(0.25)),
          },
        ]}
      />

      {/* Main button */}
      <ScalePress onPress={onPress} disabled={disabled || state === 'processing' || state === 'speaking'}>
        <Animated.View
          style={[
            styles.buttonOuter,
            {
              transform: [
                { scale: state === 'listening' ? breatheAnim : pulseAnim },
                ...(state === 'processing' ? [{ rotate: spin }] : []),
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[gradStart, gradEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {/* Inner shine */}
            <View style={styles.innerShine} />
            <Ionicons name={getIcon()} size={44} color="white" />
          </LinearGradient>
        </Animated.View>
      </ScalePress>

      {/* Label */}
      <Animated.Text
        style={[
          styles.label,
          { color: gradStart, opacity: breatheAnim },
        ]}
      >
        {getLabel()}
      </Animated.Text>
    </View>
  );
}

const BUTTON_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    width: 240,
  },
  ring: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
  },
  outerGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  buttonOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    elevation: 12,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  buttonGradient: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerShine: {
    position: 'absolute',
    top: 6,
    left: 14,
    right: 14,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
