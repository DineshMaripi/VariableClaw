import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
  delay?: number;
  animate?: boolean;
}

export function GlassCard({ children, style, glowColor, delay = 0, animate = true }: Props) {
  const fadeAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(animate ? 30 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(animate ? 0.95 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.08)',
          'rgba(255, 255, 255, 0.02)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {glowColor && (
        <View
          style={[
            styles.glow,
            { backgroundColor: glowColor, shadowColor: glowColor },
          ]}
        />
      )}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
  },
  glow: {
    position: 'absolute',
    top: -1,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
});
