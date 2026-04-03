import { useState, useEffect } from 'react';
import { ollamaService, OllamaStatus } from '../services/OllamaService';
import { onDeviceLLM, ModelStatus } from '../services/OnDeviceLLM';

/**
 * useAIGate — tracks AI availability from both on-device and Ollama.
 * Tabs are always unlocked. This hook provides status info for UI display.
 */
export function useAIGate() {
  const [aiStatus, setAiStatus] = useState<OllamaStatus>(ollamaService.status);
  const [modelStatus, setModelStatus] = useState<ModelStatus>(onDeviceLLM.status);
  const [downloadPercent, setDownloadPercent] = useState(0);

  useEffect(() => {
    // Initialize on-device LLM
    onDeviceLLM.initialize().then(() => {
      setModelStatus(onDeviceLLM.status);
      if (onDeviceLLM.status === 'downloaded') {
        onDeviceLLM.loadModel();
      }
    });

    const unsub1 = ollamaService.onStatusChange(setAiStatus);
    const unsub2 = onDeviceLLM.onStatusChange((status) => {
      setModelStatus(status);
      if (status === 'downloaded') {
        onDeviceLLM.loadModel();
      }
    });
    const unsub3 = onDeviceLLM.onDownloadProgress(p => setDownloadPercent(p.percent));

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const isOnDeviceReady = modelStatus === 'ready';
  const isOllamaReady = aiStatus === 'connected';

  return {
    // Always unlocked
    isUnlocked: true,
    // AI status
    isReady: isOnDeviceReady || isOllamaReady,
    isOnDeviceReady,
    isOllamaReady,
    aiStatus,
    modelStatus,
    downloadPercent,
    // Which AI is active
    activeAI: isOnDeviceReady ? 'on-device' : isOllamaReady ? 'ollama' : 'regex',
  };
}
