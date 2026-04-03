import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { KeySequences, executeKeyActions } from '../src/services/KeyboardMapper';
import { useBluetooth } from '../src/hooks/useBluetooth';
import { useSettings } from '../src/hooks/useSettings';
import { ConnectedDevicesBar } from '../src/components/ConnectedDevicesBar';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { FadeInView } from '../src/components/FadeInView';
import { ScalePress } from '../src/components/ScalePress';
import { smartSuggestionAgent, agentOrchestrator, routineAgent, voiceCommandAgent } from '../src/services/agents';
import { DeviceType } from '../src/types';
import { KeyAction } from '../src/types';
import { RoutineDefinition } from '../src/types/agents';

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient: [string, string];
  getKeystrokes: () => KeyAction[];
  ttsResponse: string;
  dangerous?: boolean;
}

const quickActions: { title: string; actions: QuickAction[] }[] = [
  {
    title: 'BROWSER',
    actions: [
      { icon: 'globe-outline', label: 'Chrome', gradient: ['#6c63ff', '#a29bfe'], getKeystrokes: () => KeySequences.openApp('chrome'), ttsResponse: 'Opening Chrome' },
      { icon: 'add-circle-outline', label: 'New Tab', gradient: ['#6c63ff', '#a29bfe'], getKeystrokes: () => KeySequences.newTab(), ttsResponse: 'New tab' },
      { icon: 'close-circle-outline', label: 'Close Tab', gradient: ['#6c63ff', '#a29bfe'], getKeystrokes: () => KeySequences.closeTab(), ttsResponse: 'Tab closed' },
      { icon: 'refresh-outline', label: 'Refresh', gradient: ['#6c63ff', '#a29bfe'], getKeystrokes: () => KeySequences.refreshPage(), ttsResponse: 'Refreshed' },
    ],
  },
  {
    title: 'WINDOWS',
    actions: [
      { icon: 'desktop-outline', label: 'Desktop', gradient: ['#00d4aa', '#7bed9f'], getKeystrokes: () => KeySequences.minimizeAll(), ttsResponse: 'Showing desktop' },
      { icon: 'swap-horizontal', label: 'Switch', gradient: ['#00d4aa', '#7bed9f'], getKeystrokes: () => KeySequences.switchApp(), ttsResponse: 'Switched app' },
      { icon: 'expand-outline', label: 'Fullscreen', gradient: ['#00d4aa', '#7bed9f'], getKeystrokes: () => KeySequences.fullscreen(), ttsResponse: 'Fullscreen' },
      { icon: 'close-outline', label: 'Close', gradient: ['#00d4aa', '#7bed9f'], getKeystrokes: () => KeySequences.closeWindow(), ttsResponse: 'Window closed' },
    ],
  },
  {
    title: 'MEDIA',
    actions: [
      { icon: 'volume-high-outline', label: 'Vol Up', gradient: ['#2ed573', '#7bed9f'], getKeystrokes: () => [...KeySequences.volumeUp(), ...KeySequences.volumeUp(), ...KeySequences.volumeUp()], ttsResponse: 'Volume up' },
      { icon: 'volume-low-outline', label: 'Vol Down', gradient: ['#2ed573', '#7bed9f'], getKeystrokes: () => [...KeySequences.volumeDown(), ...KeySequences.volumeDown(), ...KeySequences.volumeDown()], ttsResponse: 'Volume down' },
      { icon: 'volume-mute-outline', label: 'Mute', gradient: ['#2ed573', '#7bed9f'], getKeystrokes: () => KeySequences.mute(), ttsResponse: 'Mute toggled' },
      { icon: 'play-outline', label: 'Play/Pause', gradient: ['#2ed573', '#7bed9f'], getKeystrokes: () => KeySequences.playPause(), ttsResponse: 'Play pause' },
    ],
  },
  {
    title: 'APPS',
    actions: [
      { icon: 'code-slash-outline', label: 'VS Code', gradient: ['#007ACC', '#45a3e6'], getKeystrokes: () => KeySequences.openApp('code'), ttsResponse: 'Opening VS Code' },
      { icon: 'folder-outline', label: 'Files', gradient: ['#E8A317', '#f0c040'], getKeystrokes: () => KeySequences.openFileExplorer(), ttsResponse: 'Opening files' },
      { icon: 'document-text-outline', label: 'Notepad', gradient: ['#7B68EE', '#9b8fef'], getKeystrokes: () => KeySequences.openApp('notepad'), ttsResponse: 'Opening Notepad' },
      { icon: 'camera-outline', label: 'Screenshot', gradient: ['#FF6B6B', '#ff9f9f'], getKeystrokes: () => KeySequences.screenshot(), ttsResponse: 'Screenshot taken' },
    ],
  },
  {
    title: 'SYSTEM',
    actions: [
      { icon: 'lock-closed-outline', label: 'Lock', gradient: ['#ffa502', '#ffc048'], getKeystrokes: () => KeySequences.lockScreen(), ttsResponse: 'Locking screen' },
      { icon: 'stats-chart-outline', label: 'Task Mgr', gradient: ['#ffa502', '#ffc048'], getKeystrokes: () => KeySequences.openTaskManager(), ttsResponse: 'Task Manager' },
      { icon: 'moon-outline', label: 'Sleep', gradient: ['#ff4757', '#ff6b81'], getKeystrokes: () => KeySequences.sleep(), ttsResponse: 'Sleep mode', dangerous: true },
      { icon: 'power-outline', label: 'Shutdown', gradient: ['#ff4757', '#ff6b81'], getKeystrokes: () => KeySequences.shutdown(), ttsResponse: 'Shutting down', dangerous: true },
    ],
  },
];

function ActionButton({
  action,
  index,
  rowIndex,
  onPress,
}: {
  action: QuickAction;
  index: number;
  rowIndex: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const delay = rowIndex * 100 + index * 80;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.actionWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <ScalePress onPress={onPress} scaleTo={0.85}>
        <View style={styles.actionButton}>
          <View style={styles.iconOuter}>
            <LinearGradient
              colors={action.gradient}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={action.icon} size={26} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </View>
      </ScalePress>
    </Animated.View>
  );
}

export default function RemoteScreen() {
  const { status: btStatus, connectedDevices, connectedCount } = useBluetooth();
  const { settings } = useSettings();
  const isConnected = btStatus === 'connected';
  const [targetDevice, setTargetDevice] = useState<string>('all');
  const [aiSuggestions, setAiSuggestions] = useState<import('../src/services/agents/SmartSuggestionAgent').Suggestion[]>([]);
  const [aiGreeting, setAiGreeting] = useState<string>('');
  const [routines, setRoutines] = useState<RoutineDefinition[]>([]);

  // Load AI-powered suggestions, greeting, and routines
  useEffect(() => {
    if (isConnected) {
      const deviceTypes = connectedDevices.map(d => (d.deviceType || 'laptop') as DeviceType);
      smartSuggestionAgent.getAISuggestions(deviceTypes).then(setAiSuggestions);
      smartSuggestionAgent.getGreeting().then(setAiGreeting);
    }
    setRoutines(routineAgent.getAllRoutines());
  }, [isConnected, connectedDevices.length]);

  const handleAction = useCallback(async (action: QuickAction) => {
    if (action.dangerous) {
      Alert.alert(
        `Confirm: ${action.label}`,
        `Are you sure you want to ${action.label.toLowerCase()} your laptop?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes', style: 'destructive', onPress: () => executeAction(action) },
        ]
      );
    } else {
      await executeAction(action);
    }
  }, [isConnected, settings, targetDevice]);

  const executeAction = async (action: QuickAction) => {
    if (settings.ttsEnabled) {
      Speech.speak(action.ttsResponse, { rate: settings.ttsRate, pitch: settings.ttsPitch });
    }
    if (isConnected) {
      await executeKeyActions(action.getKeystrokes(), settings.keystrokeDelay, targetDevice);
    }
  };

  return (
    <AnimatedBackground particleCount={8}>
      <View style={styles.container}>
        {/* Connected devices bar */}
        {isConnected ? (
          <ConnectedDevicesBar
            connectedDevices={connectedDevices}
            targetDevice={targetDevice}
            onTargetChange={setTargetDevice}
          />
        ) : (
          <FadeInView direction="down">
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={16} color={Colors.warning} />
              <Text style={styles.warningText}>
                Not connected — actions won't be sent
              </Text>
            </View>
          </FadeInView>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* AI Smart Suggestions */}
          {isConnected && aiSuggestions.length > 0 && (
              <View style={styles.section}>
                <FadeInView delay={0} direction="left">
                  <View style={styles.suggestHeader}>
                    <Ionicons name="sparkles" size={14} color={Colors.accent} />
                    <Text style={[styles.sectionTitle, { color: Colors.accent, marginBottom: 0, marginLeft: 6 }]}>
                      {aiGreeting || 'Hey'} — SUGGESTED FOR YOU
                    </Text>
                  </View>
                </FadeInView>
                <View style={styles.row}>
                  {aiSuggestions.slice(0, 4).map((s, i) => (
                    <FadeInView key={s.id} delay={i * 60}>
                      <ScalePress
                        scaleTo={0.85}
                        onPress={async () => {
                          if (settings.ttsEnabled) {
                            Speech.speak(s.label, { rate: settings.ttsRate, pitch: settings.ttsPitch });
                          }
                          await voiceCommandAgent.processVoiceCommand(s.voiceCommand, {
                            targetDevice,
                            keystrokeDelay: settings.keystrokeDelay,
                          });
                        }}
                      >
                        <View style={styles.actionButton}>
                          <View style={styles.iconOuter}>
                            <LinearGradient
                              colors={s.gradient}
                              style={styles.iconGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name={s.icon as any} size={26} color="#fff" />
                            </LinearGradient>
                          </View>
                          <Text style={styles.actionLabel}>{s.label}</Text>
                          <Text style={styles.suggestReason}>{s.reason}</Text>
                        </View>
                      </ScalePress>
                    </FadeInView>
                  ))}
                </View>
              </View>
          )}

          {/* Routines Section */}
          {routines.length > 0 && (
            <View style={styles.section}>
              <FadeInView delay={50} direction="left">
                <View style={styles.suggestHeader}>
                  <Ionicons name="flash-outline" size={14} color={Colors.warning} />
                  <Text style={[styles.sectionTitle, { color: Colors.warning, marginBottom: 0, marginLeft: 6 }]}>
                    ROUTINES
                  </Text>
                </View>
              </FadeInView>
              <View style={styles.row}>
                {routines.slice(0, 4).map((routine, i) => (
                  <FadeInView key={routine.id} delay={i * 60}>
                    <ScalePress
                      scaleTo={0.85}
                      onPress={async () => {
                        if (settings.ttsEnabled) {
                          Speech.speak(`Running ${routine.name}`, { rate: settings.ttsRate, pitch: settings.ttsPitch });
                        }
                        await agentOrchestrator.process(`${routine.name} mode`, {
                          targetDevice,
                          keystrokeDelay: settings.keystrokeDelay,
                        });
                      }}
                    >
                      <View style={styles.actionButton}>
                        <View style={styles.iconOuter}>
                          <LinearGradient
                            colors={routine.gradient || ['#ffa502', '#ffc048']}
                            style={styles.iconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name={(routine.icon || 'flash-outline') as any} size={26} color="#fff" />
                          </LinearGradient>
                        </View>
                        <Text style={styles.actionLabel}>{routine.name}</Text>
                        <Text style={styles.suggestReason}>{routine.steps.length} steps</Text>
                      </View>
                    </ScalePress>
                  </FadeInView>
                ))}
              </View>
            </View>
          )}

          {quickActions.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <FadeInView delay={sectionIndex * 80} direction="left">
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </FadeInView>
              <View style={styles.row}>
                {section.actions.map((action, actionIndex) => (
                  <ActionButton
                    key={actionIndex}
                    action={action}
                    index={actionIndex}
                    rowIndex={sectionIndex}
                    onPress={() => handleAction(action)}
                  />
                ))}
              </View>
            </View>
          ))}

          <FadeInView delay={600} style={styles.footer}>
            <Text style={styles.footerText}>
              Actions send keyboard shortcuts via Bluetooth HID
            </Text>
          </FadeInView>
        </ScrollView>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 165, 2, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 165, 2, 0.15)',
  },
  warningText: {
    color: Colors.warning,
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
    flex: 1,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionWrapper: {
    alignItems: 'center',
    width: 80,
  },
  actionButton: {
    alignItems: 'center',
  },
  iconOuter: {
    borderRadius: 22,
    marginBottom: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  suggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  suggestReason: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(108, 108, 132, 0.4)',
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
