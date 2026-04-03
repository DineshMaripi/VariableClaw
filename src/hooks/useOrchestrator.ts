import { useState, useCallback } from 'react';
import { agentOrchestrator, OrchestratorResult } from '../services/agents/AgentOrchestrator';

/**
 * useOrchestrator — React hook wrapping AgentOrchestrator.
 * Handles state management for processing, results, and routine execution.
 */
export function useOrchestrator(options?: {
  targetDevice?: string;
  keystrokeDelay?: number;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OrchestratorResult | null>(null);
  const [isRunningRoutine, setIsRunningRoutine] = useState(false);

  const processCommand = useCallback(async (input: string): Promise<OrchestratorResult> => {
    setIsProcessing(true);
    try {
      const result = await agentOrchestrator.process(input, options);
      setLastResult(result);

      // If the result contains routine steps, execute them
      if (result.routineSteps && result.routineSteps.length > 0) {
        setIsRunningRoutine(true);
        await agentOrchestrator.executeRoutineSteps(result.routineSteps, options);
        setIsRunningRoutine(false);
      }

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [options?.targetDevice, options?.keystrokeDelay]);

  return {
    processCommand,
    isProcessing,
    isRunningRoutine,
    lastResult,
    lastAgent: lastResult?.agent || null,
  };
}
