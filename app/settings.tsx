import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { useSettings } from '../src/hooks/useSettings';
import { useMemory } from '../src/hooks/useMemory';
import { onDeviceLLM, ModelStatus, AVAILABLE_MODELS } from '../src/services/OnDeviceLLM';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { GlassCard } from '../src/components/GlassCard';
import { FadeInView } from '../src/components/FadeInView';
import { ScalePress } from '../src/components/ScalePress';

function SettingSection({
  icon,
  iconColor,
  title,
  delay,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <FadeInView delay={delay} style={{ marginBottom: Spacing.md }}>
      <GlassCard glowColor={iconColor} delay={delay}>
        <View style={styles.sectionInner}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBubble, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          {children}
        </View>
      </GlassCard>
    </FadeInView>
  );
}

function StepperRow({
  label,
  value,
  onDecrease,
  onIncrease,
  format,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  format?: (v: number) => string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <ScalePress onPress={onDecrease} scaleTo={0.85}>
          <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.04)']} style={styles.stepperBtn}>
            <Ionicons name="remove" size={18} color={Colors.text} />
          </LinearGradient>
        </ScalePress>
        <Text style={styles.stepperValue}>{format ? format(value) : value}</Text>
        <ScalePress onPress={onIncrease} scaleTo={0.85}>
          <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.04)']} style={styles.stepperBtn}>
            <Ionicons name="add" size={18} color={Colors.text} />
          </LinearGradient>
        </ScalePress>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { totalCommands, frequentApps, timePatterns, routines, clearHistory, clearAll } = useMemory();
  const [modelStatus, setModelStatus] = useState<ModelStatus>(onDeviceLLM.status);
  const [downloadPercent, setDownloadPercent] = useState(0);

  React.useEffect(() => {
    onDeviceLLM.initialize().then(() => setModelStatus(onDeviceLLM.status));
    const unsub1 = onDeviceLLM.onStatusChange(setModelStatus);
    const unsub2 = onDeviceLLM.onDownloadProgress(p => setDownloadPercent(p.percent));
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleTestTTS = () => {
    Speech.speak('Hello! Variable Claw is working correctly.', {
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
      language: 'en-US',
    });
  };

  return (
    <AnimatedBackground particleCount={6}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* On-Device AI */}
        <SettingSection icon="hardware-chip-outline" iconColor={Colors.success} title="On-Device AI" delay={0}>
          <Text style={styles.description}>
            Download AI directly to your phone. Works offline — no WiFi, no laptop needed.
          </Text>

          <View style={styles.aiConnectionStatus}>
            <View style={[styles.aiDot, {
              backgroundColor: modelStatus === 'ready' ? Colors.success
                : modelStatus === 'loading' || modelStatus === 'downloading' ? Colors.warning
                : Colors.textMuted
            }]} />
            <Text style={[styles.aiStatusLabel, {
              color: modelStatus === 'ready' ? Colors.success : Colors.textSecondary
            }]}>
              {modelStatus === 'ready' ? 'AI ready — voice commands work offline'
                : modelStatus === 'loading' ? 'Loading model...'
                : modelStatus === 'downloading' ? `Downloading... ${downloadPercent}%`
                : modelStatus === 'downloaded' ? 'Downloaded — tap Load'
                : modelStatus === 'error' ? onDeviceLLM.lastError || 'Error'
                : 'No model — tap download below'}
            </Text>
          </View>

          {modelStatus === 'downloading' && (
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${downloadPercent}%` }]} />
            </View>
          )}

          {(modelStatus === 'none' || modelStatus === 'error') && AVAILABLE_MODELS.map(model => (
            <View key={model.id} style={styles.modelCard}>
              <View style={styles.modelInfo}>
                <Text style={styles.modelName}>
                  {model.name} {model.recommended ? '⭐' : ''}
                </Text>
                <Text style={styles.modelDesc}>{model.description}</Text>
                <Text style={styles.modelSize}>{model.sizeLabel}</Text>
              </View>
              <ScalePress onPress={async () => {
                const ok = await onDeviceLLM.downloadModel(model);
                if (ok) await onDeviceLLM.loadModel();
                else Alert.alert('Failed', onDeviceLLM.lastError || 'Download failed');
              }}>
                <LinearGradient colors={[Colors.success, '#00a884']} style={styles.downloadBtn}>
                  <Ionicons name="download-outline" size={16} color="#fff" />
                </LinearGradient>
              </ScalePress>
            </View>
          ))}

          {modelStatus === 'downloaded' && (
            <View style={styles.buttonRow}>
              <ScalePress onPress={() => onDeviceLLM.loadModel()}>
                <LinearGradient colors={[Colors.success, '#00a884']} style={styles.actionBtn}>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Load Model</Text>
                </LinearGradient>
              </ScalePress>
            </View>
          )}

          {modelStatus === 'ready' && (
            <View style={styles.buttonRow}>
              <ScalePress onPress={() => onDeviceLLM.unloadModel()}>
                <View style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Ionicons name="stop" size={16} color={Colors.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Unload</Text>
                </View>
              </ScalePress>
            </View>
          )}

          <Text style={styles.hint}>
            One-time download via WiFi (~400MB). After that, works completely offline.
          </Text>
        </SettingSection>

        {/* Voice Settings */}
        <SettingSection icon="volume-high-outline" iconColor={Colors.accent} title="Voice Settings" delay={150}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Text-to-Speech</Text>
              <Text style={styles.switchDesc}>Speak command confirmations</Text>
            </View>
            <Switch
              value={settings.ttsEnabled}
              onValueChange={(v) => updateSettings({ ttsEnabled: v })}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primaryDark }}
              thumbColor={settings.ttsEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>

          <StepperRow
            label="Speech Rate"
            value={settings.ttsRate}
            format={(v) => v.toFixed(1)}
            onDecrease={() => updateSettings({ ttsRate: Math.max(0.5, settings.ttsRate - 0.1) })}
            onIncrease={() => updateSettings({ ttsRate: Math.min(2.0, settings.ttsRate + 0.1) })}
          />

          <StepperRow
            label="Pitch"
            value={settings.ttsPitch}
            format={(v) => v.toFixed(1)}
            onDecrease={() => updateSettings({ ttsPitch: Math.max(0.5, settings.ttsPitch - 0.1) })}
            onIncrease={() => updateSettings({ ttsPitch: Math.min(2.0, settings.ttsPitch + 0.1) })}
          />

          <ScalePress onPress={handleTestTTS}>
            <View style={styles.testBtn}>
              <Ionicons name="play-circle" size={20} color={Colors.accent} />
              <Text style={styles.testBtnText}>Test Voice</Text>
            </View>
          </ScalePress>
        </SettingSection>

        {/* Bluetooth Settings */}
        <SettingSection icon="bluetooth-outline" iconColor={Colors.success} title="Bluetooth Settings" delay={300}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Auto Reconnect</Text>
              <Text style={styles.switchDesc}>Reconnect to last device on app start</Text>
            </View>
            <Switch
              value={settings.autoReconnect}
              onValueChange={(v) => updateSettings({ autoReconnect: v })}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primaryDark }}
              thumbColor={settings.autoReconnect ? Colors.primary : Colors.textMuted}
            />
          </View>

          <StepperRow
            label="Keystroke Delay"
            value={settings.keystrokeDelay}
            format={(v) => `${v}ms`}
            onDecrease={() => updateSettings({ keystrokeDelay: Math.max(10, settings.keystrokeDelay - 10) })}
            onIncrease={() => updateSettings({ keystrokeDelay: Math.min(200, settings.keystrokeDelay + 10) })}
          />
        </SettingSection>

        {/* Memory & Learning */}
        <SettingSection icon="bulb-outline" iconColor={Colors.accent} title="Memory & Learning" delay={350}>
          <Text style={styles.description}>
            Variable Claw learns from your usage to provide better suggestions and smarter commands.
          </Text>

          {/* Stats */}
          <View style={styles.aiConnectionStatus}>
            <Ionicons name="analytics-outline" size={16} color={Colors.primary} />
            <Text style={styles.aiStatusLabel}>
              {totalCommands} commands executed
            </Text>
          </View>

          {/* Frequent Apps */}
          {frequentApps.length > 0 && (
            <View style={{ marginBottom: Spacing.sm }}>
              <Text style={[styles.inputLabel, { marginBottom: 4 }]}>Most Used Apps</Text>
              {frequentApps.slice(0, 3).map((app, i) => (
                <Text key={app.name} style={{ color: Colors.textSecondary, fontSize: FontSize.xs, marginLeft: Spacing.sm }}>
                  {i + 1}. {app.name} ({app.count}x)
                </Text>
              ))}
            </View>
          )}

          {/* Time Patterns */}
          {timePatterns.length > 0 && (
            <View style={{ marginBottom: Spacing.sm }}>
              <Text style={[styles.inputLabel, { marginBottom: 4 }]}>Learned Patterns</Text>
              {timePatterns.slice(0, 3).map((p, i) => (
                <Text key={i} style={{ color: Colors.textSecondary, fontSize: FontSize.xs, marginLeft: Spacing.sm }}>
                  {p.action} at {p.hour}:00 ({p.count}x)
                </Text>
              ))}
            </View>
          )}

          {/* Routines count */}
          <View style={styles.aiConnectionStatus}>
            <Ionicons name="flash-outline" size={16} color={Colors.warning} />
            <Text style={styles.aiStatusLabel}>
              {routines.length} routine{routines.length !== 1 ? 's' : ''} saved
            </Text>
          </View>

          {/* Clear buttons */}
          <View style={styles.buttonRow}>
            <ScalePress onPress={() => {
              Alert.alert('Clear History', 'Delete all command history? Routines will be kept.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearHistory },
              ]);
            }}>
              <View style={[styles.actionBtn, { backgroundColor: 'rgba(255,82,82,0.15)' }]}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>Clear History</Text>
              </View>
            </ScalePress>
            <View style={{ width: Spacing.sm }} />
            <ScalePress onPress={() => {
              Alert.alert('Reset All', 'Delete all history, patterns, and routines?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: clearAll },
              ]);
            }}>
              <View style={[styles.actionBtn, { backgroundColor: 'rgba(255,82,82,0.15)' }]}>
                <Ionicons name="nuclear-outline" size={16} color={Colors.error} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>Reset All</Text>
              </View>
            </ScalePress>
          </View>

          <Text style={styles.hint}>
            All data stays on your phone. Nothing is sent to any server.
          </Text>
        </SettingSection>

        {/* About */}
        <SettingSection icon="information-circle-outline" iconColor={Colors.textSecondary} title="About" delay={450}>
          <View style={styles.aboutRow}>
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.aboutLogo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="hand-left" size={24} color="#fff" />
            </LinearGradient>
            <View style={styles.aboutInfo}>
              <Text style={styles.aboutName}>Variable Claw</Text>
              <Text style={styles.aboutVersion}>v1.0.0</Text>
            </View>
          </View>
          <Text style={styles.aboutDesc}>
            Voice-controlled laptop assistant using Bluetooth HID.{'\n'}
            Your phone becomes a wireless keyboard.{'\n'}
            No software installation on laptop.
          </Text>
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  sectionInner: {
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.3,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  aiConnectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.sm,
  },
  aiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  aiStatusLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  inputRow: {
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    fontSize: FontSize.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  switchDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  stepperLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepperValue: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0, 212, 170, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
    gap: Spacing.sm,
  },
  testBtnText: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    marginBottom: Spacing.md,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%' as any,
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  modelCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600' as const,
  },
  modelDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  modelSize: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  aboutLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  aboutInfo: {
    flex: 1,
  },
  aboutName: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  aboutVersion: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
  },
  aboutDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
});
