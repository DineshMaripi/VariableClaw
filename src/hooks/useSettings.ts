import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = '@openclaw_settings';

const DEFAULT_SETTINGS: AppSettings = {
  aiEndpoint: '', // e.g., http://192.168.1.100:11434 (Ollama base URL)
  aiModel: 'qwen2.5',
  aiEnabled: true,
  keystrokeDelay: 50,
  ttsEnabled: true,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  autoReconnect: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoaded(true);
  };

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [settings]);

  return { settings, updateSettings, loaded };
}
