import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  size: number;
  color: string;
  duration: number;
}

interface Props {
  particleCount?: number;
  children: React.ReactNode;
  variant?: 'default' | 'voice' | 'connect';
}

const PARTICLE_COLORS = [
  'rgba(108, 99, 255, 0.3)',   // primary
  'rgba(0, 212, 170, 0.25)',    // accent
  'rgba(108, 99, 255, 0.15)',
  'rgba(0, 212, 170, 0.1)',
  'rgba(255, 255, 255, 0.05)',
];

const GRADIENTS: Record<string, [string, string, string]> = {
  default: ['#0a0a1a', '#0f0f2a', '#0a0a1a'],
  voice: ['#0a0a1a', '#1a0a2e', '#0a0a1a'],
  connect: ['#0a0a1a', '#0a1a2e', '#0a0a1a'],
};

export function AnimatedBackground({ particleCount = 12, children, variant = 'default' }: Props) {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        x: new Animated.Value(Math.random() * SCREEN_W),
        y: new Animated.Value(Math.random() * SCREEN_H),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.3 + Math.random() * 0.7),
        size: 4 + Math.random() * 12,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        duration: 6000 + Math.random() * 10000,
      });
    }
  }

  useEffect(() => {
    particles.current.forEach((p, i) => {
      const delay = i * 400;
      animateParticle(p, delay);
    });
  }, []);

  const animateParticle = (p: Particle, delay: number) => {
    const newX = Math.random() * SCREEN_W;
    const newY = Math.random() * SCREEN_H;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(p.opacity, {
          toValue: 0.6 + Math.random() * 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(p.scale, {
          toValue: 0.5 + Math.random() * 0.8,
          duration: p.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(p.x, {
          toValue: newX,
          duration: p.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: newY,
          duration: p.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.opacity, {
            toValue: 0.8,
            duration: p.duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0.1,
            duration: p.duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => animateParticle(p, 0));
  };

  const gradientColors = GRADIENTS[variant] || GRADIENTS.default;

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  particle: {
    position: 'absolute',
  },
});
