import { ollamaService } from '../OllamaService';
import { onDeviceLLM } from '../OnDeviceLLM';
import { AgentContext, AgentResult } from '../../types/agents';

/**
 * BaseAgent — the contract every agent implements.
 *
 * Each agent:
 * - Declares what it handles via canHandle()
 * - Processes input with shared context via process()
 * - Works offline (AI enhances but never gates)
 */
export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Can this agent handle the given input?
   * Must be FAST (no async, no AI calls).
   * Used by AgentOrchestrator to route input to the right agent.
   */
  abstract canHandle(input: string, context: AgentContext): boolean;

  /**
   * Process the input and return a result.
   * Receives the shared AgentContext assembled by ContextManager.
   */
  abstract process(input: string, context: AgentContext): Promise<AgentResult | null>;

  /** Check if any AI is available (on-device or Ollama) */
  get isAIAvailable(): boolean {
    return onDeviceLLM.isReady || ollamaService.isConnected;
  }
}

// Re-export AgentResult for backwards compatibility
export type { AgentResult } from '../../types/agents';
