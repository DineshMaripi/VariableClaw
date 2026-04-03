import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { ScalePress } from './ScalePress';
import { onDeviceLLM, AVAILABLE_MODELS } from '../services/OnDeviceLLM';
import { ModelStatus } from '../services/OnDeviceLLM';

interface Props {
  modelStatus: ModelStatus;
  downloadPercent: number;
}

/**
 * Full-screen overlay that blocks Voice/Remote tabs until AI model is downloaded.
 * Shows download button when no model, progress when downloading.
 */
export function AILockOverlay({ modelStatus, downloadPercent }: Props) {
  const handleDownload = async () => {
    const model = AVAILABLE_MODELS.find(m => m.recommended) || AVAILABLE_MODELS[0];
    const ok = await onDeviceLLM.downloadModel(model);
    if (ok) {
      await onDeviceLLM.loadModel();
    }
  };

  const isDownloading = modelStatus === 'downloading';
  const isLoading = modelStatus === 'loading';
  const isError = modelStatus === 'error';

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {/* Lock icon */}
        <View style={styles.lockIconContainer}>
          <LinearGradient
            colors={['rgba(108, 99, 255, 0.2)', 'rgba(0, 212, 170, 0.1)']}
            style={styles.lockIconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={isDownloading ? 'cloud-download' : isLoading ? 'hardware-chip' : 'lock-closed'}
              size={48}
              color={isDownloading ? Colors.warning : Colors.primary}
            />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isDownloading ? 'Downloading AI Model...'
            : isLoading ? 'Loading AI Model...'
            : isError ? 'AI Download Failed'
            : 'AI Model Required'}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {isDownloading
            ? `${downloadPercent}% complete — please wait`
            : isLoading
            ? 'Preparing AI for voice commands...'
            : isError
            ? (onDeviceLLM.lastError || 'Something went wrong. Tap to retry.')
            : 'Download the on-device AI to unlock\nVoice Control and Quick Actions'}
        </Text>

        {/* Progress bar when downloading */}
        {isDownloading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${downloadPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{downloadPercent}%</Text>
          </View>
        )}

        {/* Loading spinner text */}
        {isLoading && (
          <View style={styles.loadingRow}>
            <View style={styles.loadingDot} />
            <Text style={styles.loadingText}>This takes a few seconds...</Text>
          </View>
        )}

        {/* Download button */}
        {(modelStatus === 'none' || isError) && (
          <ScalePress onPress={handleDownload}>
            <LinearGradient
              colors={[Colors.primary, '#5a52e0']}
              style={styles.downloadBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={isError ? 'refresh' : 'download-outline'} size={20} color="#fff" />
              <Text style={styles.downloadBtnText}>
                {isError ? 'Retry Download' : 'Download Qwen 2.5 AI (400 MB)'}
              </Text>
            </LinearGradient>
          </ScalePress>
        )}

        {/* Info */}
        {(modelStatus === 'none' || isError) && (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="wifi-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.infoText}>One-time download via WiFi</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cloud-offline-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.infoText}>Works completely offline after</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="flash-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.infoText}>Runs directly on your phone</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 26, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    maxWidth: 340,
  },
  lockIconContainer: {
    marginBottom: Spacing.lg,
  },
  lockIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'monospace',
    minWidth: 40,
    textAlign: 'right',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    minWidth: 280,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  infoSection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
