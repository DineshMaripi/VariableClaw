import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';

export interface LogEntry {
  id: string;
  timestamp: Date;
  command: string;
  action: string;
  status: 'success' | 'error' | 'pending';
}

function AnimatedLogEntry({ entry, index }: { entry: LogEntry; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, delay: index * 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const statusColors = {
    success: ['rgba(46, 213, 115, 0.15)', 'rgba(46, 213, 115, 0.02)'],
    error: ['rgba(255, 71, 87, 0.15)', 'rgba(255, 71, 87, 0.02)'],
    pending: ['rgba(255, 165, 2, 0.15)', 'rgba(255, 165, 2, 0.02)'],
  };

  const borderColors = {
    success: Colors.success,
    error: Colors.error,
    pending: Colors.warning,
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        marginBottom: Spacing.sm,
      }}
    >
      <View style={[styles.entry, { borderLeftColor: borderColors[entry.status] }]}>
        <LinearGradient
          colors={statusColors[entry.status] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.entryHeader}>
          <Ionicons
            name={
              entry.status === 'success' ? 'checkmark-circle' :
              entry.status === 'error' ? 'close-circle' : 'time'
            }
            size={16}
            color={borderColors[entry.status]}
          />
          <Text style={styles.time}>
            {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.command}>"{entry.command}"</Text>
        <Text style={styles.action}>{entry.action}</Text>
      </View>
    </Animated.View>
  );
}

interface Props {
  entries: LogEntry[];
}

export function CommandLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={44} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Your command history will appear here</Text>
        <Text style={styles.emptySubtext}>Try saying "Open Chrome" or "Play music on YouTube"</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {entries.map((entry, index) => (
        <AnimatedLogEntry key={entry.id} entry={entry} index={index} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtext: {
    color: 'rgba(108, 108, 132, 0.6)',
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  entry: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  time: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginLeft: Spacing.xs,
    fontFamily: 'monospace',
  },
  command: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  action: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
});
