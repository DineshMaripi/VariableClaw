import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export function FadeInView({
  children,
  delay = 0,
  duration = 500,
  style,
  direction = 'up',
  distance = 20,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(
    direction === 'up' ? distance :
    direction === 'down' ? -distance :
    direction === 'left' ? distance :
    direction === 'right' ? -distance : 0
  )).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
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
    ]).start();
  }, []);

  const isHorizontal = direction === 'left' || direction === 'right';

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: isHorizontal
            ? [{ translateX: slideAnim }]
            : [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
