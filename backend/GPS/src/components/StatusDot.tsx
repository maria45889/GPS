import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

interface StatusDotProps {
  online: boolean;
}

export default function StatusDot({ online }: StatusDotProps) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (online) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [online]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: online ? colors.online : colors.offline,
            opacity: online ? pulseAnim : 1,
            transform: [
              {
                scale: online ? pulseAnim.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: [1, 1.3],
                }) : 1,
              },
            ],
          },
        ]}
      />
      <View
        style={[
          styles.innerDot,
          { backgroundColor: online ? colors.online : colors.offline },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#ffffff50',
  },
});
