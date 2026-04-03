import { BaseAgent } from './BaseAgent';
import { commandExecutionAgent, ExecutionResult } from './CommandExecutionAgent';
import { smartSuggestionAgent } from './SmartSuggestionAgent';
import { parseCommandSmart, parseCommand } from '../CommandRouter';
import { ollamaService } from '../OllamaService';
import { eventBus } from '../EventBus';
import { contextManager } from '../ContextManager';
import { ParsedCommand } from '../../types';
import { AgentContext, AgentResult } from '../../types/agents';

const ERROR_RECOVERY_PROMPT = `You are Variable Claw AI. The user gave a voice command that wasn't recognized.
Suggest what they might have meant. Give 2-3 brief alternatives as a helpful message.
Keep it under 50 words. Be conversational. No JSON, just plain text.`;

/**
 * VoiceCommandAgent — the brain of Variable Claw.
 *
 * Full pipeline:
 * 1. Receive voice text
 * 2. Parse via AI (Ollama → regex fallback)
 * 3. Validate command (check connections, dangerous actions)
 * 4. Execute via CommandExecutionAgent
 * 5. Emit events for MemoryService + SuggestionAgent
 * 6. Return result with TTS response
 */
export class VoiceCommandAgent extends BaseAgent {
  readonly name = 'VoiceCommandAgent';
  readonly description = 'Processes voice commands end-to-end with AI parsing and smart execution';

  canHandle(input: string, context: AgentContext): boolean {
    // This agent handles all general voice commands
    return input.trim().length > 0;
  }

  async process(input: string, context: AgentContext): Promise<AgentResult | null> {
    const result = await this.processVoiceCommand(input, {
      deviceType: context.connectedDevices[0]?.deviceType || 'laptop',
      targetDevice: context.activeDevice || 'all',
      useAI: context.aiAvailable,
    });

    if (result.command) {
      return {
        success: result.executed,
        action: result.command.action,
        data: result.command,
        message: result.command.description,
        ttsResponse: result.command.ttsResponse,
      };
    }

    return {
      success: false,
      action: 'unknown',
      message: result.error || 'Command not recognized',
      ttsResponse: "Sorry, I didn't understand that.",
    };
  }

  /**
   * Process a voice command end-to-end.
   * This is the main entry point for all voice/text commands.
   */
  async processVoiceCommand(
    text: string,
    options: {
      deviceType?: string;
      targetDevice?: string;
      keystrokeDelay?: number;
      useAI?: boolean;
    } = {}
  ): Promise<{
    command: ParsedCommand | null;
    executed: boolean;
    executionResult?: ExecutionResult;
    error?: string;
  }> {
    const {
      deviceType = 'laptop',
      targetDevice = 'all',
      keystrokeDelay = 50,
      useAI = true,
    } = options;

    try {
      // Step 1: Parse command (AI-first with regex fallback)
      const command = await parseCommandSmart(text, useAI, deviceType);

      if (!command) {
        // AI error recovery: suggest what user might have meant
        const suggestion = await this.getAISuggestion(text);
        // Emit failure event
        eventBus.emit({ type: 'command:failed', text, error: suggestion || 'Command not recognized' });
        return { command: null, executed: false, error: suggestion || 'Command not recognized' };
      }

      // Step 2: Handle special cases
      if (command.action === 'askDeviceType') {
        return { command, executed: false, error: 'Device type not set' };
      }

      // Step 3: Validate via CommandExecutionAgent
      const validation = commandExecutionAgent.validate(command);
      if (validation.requiresConfirmation) {
        return { command, executed: false, executionResult: validation };
      }

      if (!validation.success) {
        return { command, executed: false, error: validation.message };
      }

      // Step 4: Execute with retry
      const result = await commandExecutionAgent.executeWithRetry(command, {
        keystrokeDelay,
        targetDevice,
      });

      // Step 5: Track & emit events
      if (result.success) {
        smartSuggestionAgent.recordCommand(text);
        contextManager.recordSessionCommand(text);
        eventBus.emit({ type: 'command:executed', command, text, success: true });
      } else {
        eventBus.emit({ type: 'command:failed', text, error: result.message });
      }

      return {
        command,
        executed: result.success,
        executionResult: result,
        error: result.success ? undefined : result.message,
      };
    } catch (error: any) {
      eventBus.emit({ type: 'command:failed', text, error: error?.message || 'Unknown error' });
      return {
        command: null,
        executed: false,
        error: error?.message || 'Command execution failed',
      };
    }
  }

  /**
   * Execute a confirmed dangerous command (after user said "yes").
   */
  async executeConfirmed(
    command: ParsedCommand,
    options: { keystrokeDelay?: number; targetDevice?: string } = {}
  ): Promise<ExecutionResult> {
    const result = await commandExecutionAgent.execute(command, options);
    if (result.success) {
      eventBus.emit({ type: 'command:executed', command, text: command.description, success: true });
    }
    return result;
  }

  /** Quick text-only parse without execution */
  async parseOnly(text: string, deviceType: string = 'laptop'): Promise<ParsedCommand | null> {
    return parseCommandSmart(text, this.isAIAvailable, deviceType);
  }

  /**
   * AI error recovery — when a command isn't recognized,
   * ask AI to suggest what the user might have meant.
   */
  private async getAISuggestion(failedText: string): Promise<string | null> {
    if (!ollamaService.isConnected) return null;
    try {
      const response = await ollamaService.chat(
        ERROR_RECOVERY_PROMPT,
        `User said: "${failedText}"\nAvailable commands: open [app], search on youtube/google, volume up/down, mute, lock, screenshot, close window, minimize all, switch app, new tab, close tab, refresh, shutdown, restart, sleep.`,
        { temperature: 0.5, maxTokens: 80 }
      );
      return response?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * AI command preview — explain what a command will do before executing.
   */
  async getCommandPreview(text: string, deviceType: string = 'laptop'): Promise<string | null> {
    if (!ollamaService.isConnected) return null;
    try {
      const response = await ollamaService.chat(
        'You are Variable Claw AI. Briefly explain what this voice command will do on the target device. One sentence, under 20 words. No JSON.',
        `Command: "${text}", Device: ${deviceType}`,
        { temperature: 0.3, maxTokens: 40 }
      );
      return response?.trim() || null;
    } catch {
      return null;
    }
  }
}

export const voiceCommandAgent = new VoiceCommandAgent();
