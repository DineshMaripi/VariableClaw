import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  scaleTo?: number;
  disabled?: boolean;
}

export function ScalePress({ children, onPress, style, scaleTo = 0.92, disabled }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 40,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
