import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { useBluetooth } from '../src/hooks/useBluetooth';
import { useSettings } from '../src/hooks/useSettings';
import { StatusBadge } from '../src/components/StatusBadge';
import { DeviceCard } from '../src/components/DeviceCard';
import { GlassCard } from '../src/components/GlassCard';
import { FadeInView } from '../src/components/FadeInView';
import { ScalePress } from '../src/components/ScalePress';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { bluetoothHID } from '../src/services/BluetoothHID';
import { deviceConnectionAgent, deviceTypeDetectorAgent } from '../src/services/agents';
import { ollamaService } from '../src/services/OllamaService';
import { onDeviceLLM, AVAILABLE_MODELS } from '../src/services/OnDeviceLLM';
import { useAIGate } from '../src/hooks/useAIGate';
import { HID_KEY } from '../src/constants/keycodes';
import { DeviceType } from '../src/types';
import { BluetoothDevice } from '../src/types';

const MAX_DEVICES = 5;

export default function ConnectScreen() {
  const { settings } = useSettings();
  const {
    status, devices, connectedDevices, connectedCount, initError,
    scan, connect, disconnectDevice, disconnectAll, refreshDevices, isDeviceConnected,
  } = useBluetooth(settings.autoReconnect);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});
  const { activeAI, modelStatus, downloadPercent, isOnDeviceReady } = useAIGate();

  const handleTestConnection = async (address: string) => {
    setTestResult(prev => ({ ...prev, [address]: 'testing' }));
    try {
      const ok = await deviceConnectionAgent.testConnection(address);
      setTestResult(prev => ({ ...prev, [address]: ok ? 'success' : 'failed' }));
    } catch (e) {
      setTestResult(prev => ({ ...prev, [address]: 'failed' }));
    }
    // Clear result after 3 seconds
    setTimeout(() => {
      setTestResult(prev => {
        const next = { ...prev };
        delete next[address];
        return next;
      });
    }, 3000);
  };
  // Logo animation
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 1, duration: 800, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-20deg', '0deg'],
  });

  const isMaxReached = connectedCount >= MAX_DEVICES;

  // Filter out already-connected devices from the available list
  const availableDevices = devices.filter(d => !isDeviceConnected(d.address));

  const handleConnect = async (device: BluetoothDevice) => {
    if (isMaxReached) return;
    setConnectingId(device.id);
    await connect(device);
    // AI-powered device type detection for new connections
    if (!device.deviceType || device.deviceType === 'unknown') {
      const detected = await deviceTypeDetectorAgent.detectWithAI(device);
      if (detected !== 'unknown') {
        bluetoothHID.setDeviceType(device.address, detected);
      }
    }
    setConnectingId(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshDevices();
    setRefreshing(false);
  };

  return (
    <AnimatedBackground variant="connect" particleCount={15}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.logoContainer,
              { transform: [{ scale: logoScale }, { rotate: spin }] },
            ]}
          >
            <LinearGradient
              colors={['rgba(108, 99, 255, 0.3)', 'rgba(0, 212, 170, 0.2)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="hand-left" size={52} color={Colors.primary} />
          </Animated.View>

          <Animated.View style={{ opacity: titleFade, alignItems: 'center' }}>
            <Text style={styles.title}>Variable Claw</Text>
            <Text style={styles.subtitle}>Voice-controlled laptop assistant</Text>
            <View style={{ marginTop: Spacing.md }}>
              <StatusBadge status={status} />
            </View>
          </Animated.View>
        </View>

        {/* Quick Setup Card — shows when app needs configuration */}
        {connectedCount === 0 && (
          <FadeInView delay={150} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
            <GlassCard glowColor={Colors.primary}>
              <View style={{ padding: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                  <Ionicons name="rocket-outline" size={22} color={Colors.primary} />
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginLeft: Spacing.sm }}>
                    Quick Setup
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons
                    name={connectedCount > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={connectedCount > 0 ? Colors.success : Colors.textMuted}
                  />
                  <Text style={{ color: connectedCount > 0 ? Colors.success : Colors.textSecondary, fontSize: FontSize.sm, marginLeft: Spacing.xs }}>
                    {connectedCount > 0 ? 'Device connected' : '1. Connect a Bluetooth device (tap Scan below)'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={ollamaService.isConnected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={ollamaService.isConnected ? Colors.success : Colors.textMuted}
                  />
                  <Text style={{ color: ollamaService.isConnected ? Colors.success : Colors.textSecondary, fontSize: FontSize.sm, marginLeft: Spacing.xs }}>
                    {ollamaService.isConnected ? 'AI connected' : '2. Setup AI in Settings (optional, for smarter commands)'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </FadeInView>
        )}

        {/* On-Device AI Card */}
        <FadeInView delay={200} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
          <GlassCard
            glowColor={
              isOnDeviceReady ? Colors.success
              : modelStatus === 'downloading' || modelStatus === 'loading' ? Colors.warning
              : Colors.primary
            }
          >
            <View style={styles.aiCard}>
              <View style={styles.aiCardHeader}>
                <View style={[styles.aiIconBubble, {
                  backgroundColor: isOnDeviceReady ? 'rgba(0,212,170,0.15)'
                    : modelStatus === 'none' ? 'rgba(108,99,255,0.15)'
                    : 'rgba(255,165,2,0.15)'
                }]}>
                  <Ionicons
                    name={isOnDeviceReady ? 'checkmark-circle'
                      : modelStatus === 'downloading' ? 'cloud-download'
                      : modelStatus === 'loading' ? 'hardware-chip-outline'
                      : 'sparkles-outline'}
                    size={22}
                    color={isOnDeviceReady ? Colors.success
                      : modelStatus === 'downloading' || modelStatus === 'loading' ? Colors.warning
                      : Colors.primary}
                  />
                </View>
                <View style={styles.aiCardInfo}>
                  <Text style={styles.aiCardTitle}>
                    {isOnDeviceReady ? 'AI Ready — Works Offline'
                      : modelStatus === 'loading' ? 'Loading AI...'
                      : modelStatus === 'downloading' ? 'Downloading AI...'
                      : modelStatus === 'downloaded' ? 'AI Downloaded'
                      : modelStatus === 'error' ? 'AI Download Failed'
                      : 'On-Device AI'}
                  </Text>
                  <Text style={styles.aiCardSubtitle}>
                    {isOnDeviceReady ? 'Voice commands work without WiFi or laptop'
                      : modelStatus === 'loading' ? 'Loading into memory...'
                      : modelStatus === 'downloading' ? `${downloadPercent}% complete`
                      : modelStatus === 'downloaded' ? 'Ready to load'
                      : modelStatus === 'error' ? (onDeviceLLM.lastError || 'Tap to retry')
                      : 'Download AI for smarter voice commands'}
                  </Text>
                </View>
              </View>

              {modelStatus === 'downloading' && (
                <View style={styles.aiProgressBg}>
                  <Animated.View style={[styles.aiProgressFill, { width: `${downloadPercent}%` }]} />
                </View>
              )}

              {modelStatus === 'none' && (
                <ScalePress onPress={async () => {
                  const model = AVAILABLE_MODELS.find(m => m.recommended) || AVAILABLE_MODELS[0];
                  const ok = await onDeviceLLM.downloadModel(model);
                  if (ok) await onDeviceLLM.loadModel();
                }}>
                  <LinearGradient
                    colors={[Colors.primary, '#5a52e0']}
                    style={styles.aiActionBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.aiActionText}>Download Qwen 2.5 AI (400 MB)</Text>
                  </LinearGradient>
                </ScalePress>
              )}

              {modelStatus === 'error' && (
                <ScalePress onPress={async () => {
                  const model = AVAILABLE_MODELS.find(m => m.recommended) || AVAILABLE_MODELS[0];
                  const ok = await onDeviceLLM.downloadModel(model);
                  if (ok) await onDeviceLLM.loadModel();
                }}>
                  <LinearGradient
                    colors={[Colors.warning, '#e09600']}
                    style={styles.aiActionBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.aiActionText}>Retry Download</Text>
                  </LinearGradient>
                </ScalePress>
              )}

              {isOnDeviceReady && (
                <View style={styles.aiReadyRow}>
                  <View style={styles.aiReadyDot} />
                  <Text style={styles.aiReadyText}>AI active — understands natural speech offline</Text>
                </View>
              )}

              {modelStatus === 'none' && (
                <Text style={styles.aiHint}>
                  One-time WiFi download. Works completely offline after.
                </Text>
              )}
            </View>
          </GlassCard>
        </FadeInView>

        {/* HID Init Error Banner */}
        {initError && (
          <FadeInView delay={150} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
            <GlassCard glowColor={Colors.error}>
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={22} color={Colors.error} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.errorBannerTitle}>Bluetooth HID Not Available</Text>
                  <Text style={styles.errorBannerText}>{initError}</Text>
                  <Text style={styles.errorBannerHint}>
                    Running in demo mode. Try enabling "Bluetooth HID Device" in Developer Options.
                  </Text>
                </View>
              </View>
            </GlassCard>
          </FadeInView>
        )}

        {/* Connected Devices Banner */}
        {connectedCount > 0 && (
          <FadeInView delay={200} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
            <GlassCard glowColor={Colors.success}>
              <View style={styles.connectedContent}>
                <View style={styles.connectedHeader}>
                  <View style={styles.connectedDot} />
                  <Text style={styles.connectedTitle}>
                    {connectedCount}/{MAX_DEVICES} device{connectedCount > 1 ? 's' : ''} connected
                  </Text>
                  {connectedCount > 1 && (
                    <TouchableOpacity onPress={disconnectAll} style={styles.disconnectAllBtn}>
                      <Text style={styles.disconnectAllText}>Disconnect All</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {connectedDevices.map((device, i) => (
                  <FadeInView key={device.address} delay={300 + i * 100} direction="left">
                    <View style={styles.connectedRow}>
                      <Ionicons
                        name={device.deviceType === 'tv' ? 'tv' : device.deviceType === 'desktop' ? 'desktop' : 'laptop'}
                        size={16}
                        color={Colors.accent}
                      />
                      <Text style={styles.connectedName}>{device.name}</Text>
                      {/* Device type selector chips */}
                      <View style={styles.deviceTypeChips}>
                        {(['laptop', 'tv', 'desktop', 'phone'] as DeviceType[]).map(dt => (
                          <TouchableOpacity
                            key={dt}
                            onPress={() => bluetoothHID.setDeviceType(device.address, dt)}
                            style={[
                              styles.deviceTypeChip,
                              device.deviceType === dt && styles.deviceTypeChipActive,
                            ]}
                          >
                            <Text style={[
                              styles.deviceTypeChipText,
                              device.deviceType === dt && styles.deviceTypeChipTextActive,
                            ]}>
                              {dt === 'tv' ? 'TV' : dt === 'desktop' ? 'PC' : dt === 'phone' ? 'Phone' : 'Laptop'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleTestConnection(device.address)}
                        style={[
                          styles.testBtn,
                          testResult[device.address] === 'success' && styles.testBtnSuccess,
                          testResult[device.address] === 'failed' && styles.testBtnFailed,
                        ]}
                      >
                        <Ionicons
                          name={
                            testResult[device.address] === 'testing' ? 'sync'
                            : testResult[device.address] === 'success' ? 'checkmark'
                            : testResult[device.address] === 'failed' ? 'close'
                            : 'pulse'
                          }
                          size={12}
                          color={
                            testResult[device.address] === 'success' ? Colors.success
                            : testResult[device.address] === 'failed' ? Colors.error
                            : Colors.primary
                          }
                        />
                        <Text style={[
                          styles.testBtnText,
                          testResult[device.address] === 'success' && { color: Colors.success },
                          testResult[device.address] === 'failed' && { color: Colors.error },
                        ]}>
                          {testResult[device.address] === 'testing' ? 'Testing...'
                            : testResult[device.address] === 'success' ? 'Connected!'
                            : testResult[device.address] === 'failed' ? 'Failed'
                            : 'Test'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => disconnectDevice(device.address)} style={{ marginLeft: Spacing.xs }}>
                        <Ionicons name="close-circle" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </FadeInView>
                ))}
              </View>
            </GlassCard>
          </FadeInView>
        )}

        {/* Devices List */}
        <View style={styles.section}>
          <FadeInView delay={400}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Devices</Text>
              <TouchableOpacity onPress={scan} style={styles.scanButton} activeOpacity={0.7}>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.scanText}>Scan</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>

          {availableDevices.length === 0 ? (
            <FadeInView delay={500}>
              <View style={styles.emptyState}>
                <Ionicons name="bluetooth-outline" size={52} color={Colors.textMuted} />
                <Text style={styles.emptyText}>
                  {connectedCount > 0 ? 'All paired devices are connected' : 'No paired devices found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {connectedCount > 0
                    ? 'Tap Scan to discover more devices'
                    : 'Pair your laptop via system Bluetooth\nsettings first, then tap Scan'}
                </Text>
              </View>
            </FadeInView>
          ) : (
            availableDevices.map((device, i) => (
              <DeviceCard
                key={device.id}
                device={device}
                index={i}
                isConnecting={connectingId === device.id}
                isConnected={false}
                onConnect={() => handleConnect(device)}
                onDisconnect={() => disconnectDevice(device.address)}
              />
            ))
          )}
        </View>

        {/* Instructions */}
        <FadeInView delay={700} style={{ marginTop: Spacing.md }}>
          <GlassCard style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
            <View style={styles.instructions}>
              <Text style={styles.instructionTitle}>
                {connectedCount > 0 ? 'Multi-device connected!' : 'How to connect'}
              </Text>
              {connectedCount === 0 ? (
                [1, 2, 3, 4].map((num, i) => (
                  <FadeInView key={num} delay={800 + i * 100} direction="left">
                    <View style={styles.step}>
                      <LinearGradient
                        colors={['#6c63ff', '#00d4aa']}
                        style={styles.stepBadge}
                      >
                        <Text style={styles.stepNum}>{num}</Text>
                      </LinearGradient>
                      <Text style={styles.stepText}>
                        {num === 1 ? 'Go to laptop Bluetooth settings' :
                         num === 2 ? 'Make sure Bluetooth is ON' :
                         num === 3 ? 'Tap "Scan" above and select your laptop' :
                         'Accept the pairing request on your laptop'}
                      </Text>
                    </View>
                  </FadeInView>
                ))
              ) : (
                <Text style={styles.multiHint}>
                  Commands are sent to all connected devices by default.{'\n'}
                  Select a specific device from Voice or Remote tabs.
                </Text>
              )}
            </View>
          </GlassCard>
        </FadeInView>
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.4)',
    overflow: 'hidden',
  },
  title: {
    fontSize: FontSize.xxl + 4,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    letterSpacing: 0.3,
  },
  connectedContent: {
    padding: Spacing.md,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  connectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  connectedTitle: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.success,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  disconnectAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  disconnectAllText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.xl,
  },
  connectedName: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
    flexShrink: 1,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    marginLeft: Spacing.xs,
    gap: 3,
  },
  testBtnSuccess: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  testBtnFailed: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  testBtnText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  deviceTypeChips: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
  },
  deviceTypeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceTypeChipActive: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderColor: Colors.primary,
  },
  deviceTypeChipText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  deviceTypeChipTextActive: {
    color: Colors.primary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.3,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  scanText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 22,
  },
  instructions: {
    padding: Spacing.md,
  },
  instructionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  stepNum: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  stepText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },
  multiHint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  aiCard: {
    padding: Spacing.md,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  aiIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  aiCardInfo: {
    flex: 1,
  },
  aiCardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  aiCardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  aiProgressBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  aiProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  aiActionText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  aiReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  aiReadyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  aiReadyText: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: '500',
  },
  aiRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255, 165, 2, 0.08)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 2, 0.2)',
    gap: Spacing.xs,
  },
  aiRequiredText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
    flex: 1,
  },
  aiHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  errorBannerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.error,
  },
  errorBannerText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  errorBannerHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
