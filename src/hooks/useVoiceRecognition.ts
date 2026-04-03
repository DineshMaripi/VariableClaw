import { useState, useCallback, useRef } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { ListeningState } from '../types';

interface VoiceRecognitionHook {
  listeningState: ListeningState;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useVoiceRecognition(): VoiceRecognitionHook {
  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognizerRef = useRef<any>(null);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setListeningState('listening');

    try {
      if (Platform.OS !== 'android') {
        setError('Voice recognition is only supported on Android');
        setListeningState('idle');
        return;
      }

      const VoiceModule = NativeModules.VoiceRecognitionModule;
      if (!VoiceModule) {
        setError('VoiceRecognitionModule not found. Build with expo-dev-client (npx expo run:android).');
        setListeningState('idle');
        return;
      }

      const emitter = new NativeEventEmitter(VoiceModule);

      recognizerRef.current = {
        onResult: emitter.addListener('onSpeechResult', (event: { text: string }) => {
          setTranscript(event.text);
          setListeningState('processing');
        }),
        onPartial: emitter.addListener('onSpeechPartialResult', (event: { text: string }) => {
          setTranscript(event.text);
        }),
        onError: emitter.addListener('onSpeechError', (event: { error: string }) => {
          setError(event.error);
          setListeningState('idle');
        }),
      };

      await VoiceModule.startListening('en-US');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice recognition');
      setListeningState('idle');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const VoiceModule = NativeModules.VoiceRecognitionModule;
        if (VoiceModule) {
          await VoiceModule.stopListening();
        }
      }
      // Clean up event listeners
      if (recognizerRef.current) {
        recognizerRef.current.onResult?.remove();
        recognizerRef.current.onPartial?.remove();
        recognizerRef.current.onError?.remove();
        recognizerRef.current = null;
      }
    } catch (err) {
      console.error('Failed to stop listening:', err);
    }
    if (listeningState === 'listening') {
      setListeningState('idle');
    }
  }, [listeningState]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setListeningState('idle');
    setError(null);
  }, []);

  return {
    listeningState,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
