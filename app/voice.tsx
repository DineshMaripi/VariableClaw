import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { useVoiceRecognition } from '../src/hooks/useVoiceRecognition';
import { useSettings } from '../src/hooks/useSettings';
import { useBluetooth } from '../src/hooks/useBluetooth';
import { VoiceButton } from '../src/components/VoiceButton';
import { CommandLog, LogEntry } from '../src/components/CommandLog';
import { ConnectedDevicesBar } from '../src/components/ConnectedDevicesBar';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { GlassCard } from '../src/components/GlassCard';
import { FadeInView } from '../src/components/FadeInView';
import { ScalePress } from '../src/components/ScalePress';
import { ollamaService, OllamaStatus } from '../src/services/OllamaService';
import { onDeviceLLM } from '../src/services/OnDeviceLLM';
import { agentOrchestrator } from '../src/services/agents';
import { bluetoothHID } from '../src/services/BluetoothHID';
import { useAIGate } from '../src/hooks/useAIGate';
import { ListeningState } from '../src/types';

export default function VoiceScreen() {
  const { listeningState, transcript, error, startListening, stopListening, resetTranscript } = useVoiceRecognition();
  const { settings } = useSettings();
  const { status: btStatus, connectedDevices, connectedCount } = useBluetooth();
  const { activeAI, modelStatus } = useAIGate();
  const [commandLog, setCommandLog] = useState<LogEntry[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [currentState, setCurrentState] = useState<ListeningState>('idle');
  const [targetDevice, setTargetDevice] = useState<string>('all');
  const [aiStatus, setAiStatus] = useState<OllamaStatus>('disconnected');

  // Connect to Ollama as fallback when settings change
  useEffect(() => {
    if (settings.aiEndpoint && settings.aiEnabled) {
      ollamaService.configure(settings.aiEndpoint, settings.aiModel);
      ollamaService.testConnection();
    }
    const unsub = ollamaService.onStatusChange(setAiStatus);
    setAiStatus(ollamaService.status);
    return unsub;
  }, [settings.aiEndpoint, settings.aiModel, settings.aiEnabled]);

  useEffect(() => {
    if (listeningState === 'processing' && transcript) {
      processCommand(transcript);
    }
  }, [listeningState, transcript]);

  const speakTTS = useCallback((text: string) => {
    if (settings.ttsEnabled) {
      setCurrentState('speaking');
      Speech.speak(text, {
        rate: settings.ttsRate,
        pitch: settings.ttsPitch,
        language: 'en-US',
        onDone: () => setCurrentState('idle'),
        onError: () => setCurrentState('idle'),
      });
    }
  }, [settings]);

  const processCommand = useCallback(async (text: string) => {
    const entryId = Date.now().toString();

    setCommandLog(prev => [{
      id: entryId,
      timestamp: new Date(),
      command: text,
      action: 'Processing...',
      status: 'pending' as const,
    }, ...prev]);

    try {
      // Use AgentOrchestrator — routes to Conversation, Routine, or Voice agent
      const orchResult = await agentOrchestrator.process(text, {
        targetDevice,
        keystrokeDelay: settings.keystrokeDelay,
      });

      const { result, agent, routineSteps } = orchResult;

      // Handle routine execution (sequential steps)
      if (routineSteps && routineSteps.length > 0) {
        speakTTS(result.ttsResponse);
        setCommandLog(prev => prev.map(entry =>
          entry.id === entryId
            ? { ...entry, action: `${result.message}`, status: 'success' as const }
            : entry
        ));
        // Execute routine steps in background
        agentOrchestrator.executeRoutineSteps(routineSteps, {
          targetDevice,
          keystrokeDelay: settings.keystrokeDelay,
        });
        resetTranscript();
        return;
      }

      // Handle help command (show in log without TTS for full text)
      if (result.action === 'help') {
        setCommandLog(prev => prev.map(entry =>
          entry.id === entryId
            ? { ...entry, action: result.message, status: 'success' as const }
            : entry
        ));
        speakTTS(result.ttsResponse);
        resetTranscript();
        return;
      }

      // Handle dangerous action confirmation
      if (result.data?.requiresConfirmation || orchResult.result.data?.requiresConfirmation) {
        const cmd = result.data;
        Alert.alert(
          'Confirm Action',
          `${result.message}. Are you sure?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {
              setCommandLog(prev => prev.map(entry =>
                entry.id === entryId
                  ? { ...entry, action: `${result.message} — cancelled`, status: 'error' as const }
                  : entry
              ));
            }},
            { text: 'Yes, do it', style: 'destructive', onPress: async () => {
              speakTTS(result.ttsResponse);
              setCommandLog(prev => prev.map(entry =>
                entry.id === entryId
                  ? { ...entry, action: result.message, status: 'success' as const }
                  : entry
              ));
            }},
          ]
        );
        resetTranscript();
        return;
      }

      // Standard result
      if (result.success) {
        speakTTS(result.ttsResponse);
      } else {
        speakTTS(result.ttsResponse || "Sorry, I didn't understand that.");
      }

      const badge = agent !== 'VoiceCommandAgent' ? ` [${agent}]` : '';
      setCommandLog(prev => prev.map(entry =>
        entry.id === entryId
          ? { ...entry, action: `${result.message}${badge}`, status: result.success ? 'success' as const : 'error' as const }
          : entry
      ));
    } catch (err) {
      setCommandLog(prev => prev.map(entry =>
        entry.id === entryId
          ? { ...entry, action: `Error: ${err}`, status: 'error' as const }
          : entry
      ));
    }

    if (!settings.ttsEnabled) {
      setCurrentState('idle');
    }
    resetTranscript();
  }, [settings, resetTranscript, targetDevice, connectedDevices]);

  const handleVoicePress = useCallback(async () => {
    if (listeningState === 'listening') {
      await stopListening();
    } else {
      await startListening();
    }
  }, [listeningState, startListening, stopListening]);

  const handleManualSubmit = useCallback(() => {
    if (manualInput.trim()) {
      processCommand(manualInput.trim());
      setManualInput('');
    }
  }, [manualInput, processCommand]);

  const effectiveState = currentState !== 'idle' ? currentState : listeningState;
  const isConnected = btStatus === 'connected';

  return (
    <AnimatedBackground variant="voice" particleCount={10}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
                Not connected — commands will be logged but not sent
              </Text>
            </View>
          </FadeInView>
        )}

        {/* AI Status Indicator */}
        <FadeInView delay={100}>
          <View style={styles.aiStatusBar}>
            <View style={[
              styles.aiStatusDot,
              { backgroundColor: activeAI !== 'regex' ? Colors.success : Colors.textMuted }
            ]} />
            <Text style={styles.aiStatusText}>
              {activeAI === 'on-device' ? 'AI: On-Device (offline)'
                : activeAI === 'ollama' ? `AI: Ollama (${ollamaService.config.model})`
                : modelStatus === 'downloading' ? `AI: Downloading ${onDeviceLLM.downloadProgress.percent}%`
                : modelStatus === 'loading' ? 'AI: Loading model...'
                : 'AI: Regex mode (download AI in Settings)'}
            </Text>
          </View>
        </FadeInView>

        {/* Voice Button Area */}
        <FadeInView delay={200} style={styles.voiceArea}>
          {transcript ? (
            <FadeInView delay={0} direction="down">
              <GlassCard style={styles.transcriptCard} animate={false}>
                <View style={styles.transcriptContent}>
                  <Ionicons name="chatbubble" size={14} color={Colors.primary} />
                  <Text style={styles.transcriptText}>"{transcript}"</Text>
                </View>
              </GlassCard>
            </FadeInView>
          ) : null}

          <VoiceButton state={effectiveState} onPress={handleVoicePress} />

          {error && (
            <FadeInView>
              <Text style={styles.errorText}>{error}</Text>
            </FadeInView>
          )}
        </FadeInView>

        {/* Manual Input */}
        <FadeInView delay={400} direction="up" style={styles.manualInput}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Or type a command..."
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={handleManualSubmit}
              returnKeyType="send"
            />
            <ScalePress
              onPress={handleManualSubmit}
              disabled={!manualInput.trim()}
              style={{...styles.sendButton, ...(!manualInput.trim() ? styles.sendButtonDisabled : {})}}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </ScalePress>
          </View>
        </FadeInView>

        {/* Command History */}
        <FadeInView delay={500} style={styles.logSection}>
          <Text style={styles.logTitle}>COMMAND HISTORY</Text>
          <CommandLog entries={commandLog} />
        </FadeInView>
      </KeyboardAvoidingView>
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
  voiceArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    minHeight: 280,
  },
  transcriptCard: {
    marginBottom: Spacing.md,
    maxWidth: 300,
  },
  transcriptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  transcriptText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  manualInput: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingLeft: Spacing.md,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  logSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  aiStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  aiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  aiStatusText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  aiRetryBtn: {
    padding: Spacing.xs,
  },
  logTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 1.5,
  },
});
