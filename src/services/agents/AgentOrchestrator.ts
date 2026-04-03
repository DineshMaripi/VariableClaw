import { contextManager } from '../ContextManager';
import { eventBus } from '../EventBus';
import { conversationAgent } from './ConversationAgent';
import { routineAgent } from './RoutineAgent';
import { voiceCommandAgent } from './VoiceCommandAgent';
import { smartSuggestionAgent } from './SmartSuggestionAgent';
import { ParsedCommand } from '../../types';
import { AgentContext, AgentResult } from '../../types/agents';

/**
 * AgentOrchestrator — the central brain of Variable Claw.
 *
 * Routes every input to the right agent in priority order:
 * 1. ConversationAgent — "undo", "repeat", "help", corrections
 * 2. RoutineAgent — "movie mode", "goodnight", named routines
 * 3. VoiceCommandAgent — the main voice→action pipeline
 *
 * Handles:
 * - Context assembly via ContextManager
 * - Agent routing via canHandle()
 * - Sequential routine execution
 * - Post-processing (events, tracking)
 */

export interface OrchestratorResult {
  agent: string;           // which agent handled it
  result: AgentResult;
  // For routine execution
  routineSteps?: string[]; // commands to execute in sequence
}

class AgentOrchestratorService {
  /**
   * Process any input — the single entry point for all user interactions.
   * Routes to the best agent, executes, and returns the result.
   */
  async process(
    input: string,
    options: {
      targetDevice?: string;
      keystrokeDelay?: number;
    } = {}
  ): Promise<OrchestratorResult> {
    const text = input.trim();
    if (!text) {
      return {
        agent: 'none',
        result: { success: false, action: 'empty', message: 'No input', ttsResponse: 'I didn\'t hear anything.' },
      };
    }

    // Assemble context
    const context = contextManager.getContext();
    if (options.targetDevice) {
      contextManager.setActiveDevice(options.targetDevice);
    }

    // Route through agents in priority order

    // 1. ConversationAgent — meta-commands (undo, repeat, help, corrections)
    if (conversationAgent.canHandle(text, context)) {
      const result = await conversationAgent.process(text, context);
      if (result) {
        // Handle "execute" follow-ups (undo/repeat/correction return a command to run)
        if (result.data?.executeCommand) {
          return this.executeFollowUp(result, options);
        }
        return { agent: 'ConversationAgent', result };
      }
    }

    // 2. RoutineAgent — named routines
    if (routineAgent.canHandle(text, context)) {
      const result = await routineAgent.process(text, context);
      if (result) {
        // Handle sequential routine execution
        if (result.data?.executeSequence && result.data?.steps) {
          return {
            agent: 'RoutineAgent',
            result,
            routineSteps: result.data.steps.map((s: any) => s.voiceCommand),
          };
        }
        return { agent: 'RoutineAgent', result };
      }
    }

    // 3. VoiceCommandAgent — main voice→action pipeline
    const voiceResult = await voiceCommandAgent.processVoiceCommand(text, {
      deviceType: this.getDeviceType(context),
      targetDevice: options.targetDevice || context.activeDevice || 'all',
      keystrokeDelay: options.keystrokeDelay,
      useAI: context.aiAvailable,
    });

    contextManager.recordSessionCommand(text);

    if (voiceResult.command) {
      return {
        agent: 'VoiceCommandAgent',
        result: {
          success: voiceResult.executed,
          action: voiceResult.command.action,
          data: voiceResult.command,
          message: voiceResult.command.description,
          ttsResponse: voiceResult.command.ttsResponse,
        },
      };
    }

    // Nothing matched
    return {
      agent: 'none',
      result: {
        success: false,
        action: 'unknown',
        message: voiceResult.error || 'Command not recognized',
        ttsResponse: voiceResult.error || "Sorry, I didn't understand that.",
      },
    };
  }

  /**
   * Execute a routine's steps sequentially.
   * Called by the UI when OrchestratorResult has routineSteps.
   */
  async executeRoutineSteps(
    steps: string[],
    options: { targetDevice?: string; keystrokeDelay?: number } = {}
  ): Promise<{ successes: number; failures: number }> {
    let successes = 0;
    let failures = 0;

    for (const step of steps) {
      const result = await voiceCommandAgent.processVoiceCommand(step, {
        targetDevice: options.targetDevice || 'all',
        keystrokeDelay: options.keystrokeDelay,
        useAI: false, // routines use direct commands, no need for AI parsing
      });

      if (result.executed) {
        successes++;
      } else {
        failures++;
      }

      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { successes, failures };
  }

  /**
   * Handle ConversationAgent follow-ups that need command execution
   * (undo, repeat, correction all return a command to run)
   */
  private async executeFollowUp(
    conversationResult: AgentResult,
    options: { targetDevice?: string; keystrokeDelay?: number }
  ): Promise<OrchestratorResult> {
    const command = conversationResult.data.executeCommand;
    const voiceResult = await voiceCommandAgent.processVoiceCommand(command, {
      targetDevice: options.targetDevice || 'all',
      keystrokeDelay: options.keystrokeDelay,
      useAI: true,
    });

    return {
      agent: 'ConversationAgent',
      result: {
        ...conversationResult,
        success: voiceResult.executed,
        message: voiceResult.command?.description || conversationResult.message,
      },
    };
  }

  /** Get the primary device type from context */
  private getDeviceType(context: AgentContext): string {
    if (context.connectedDevices.length === 0) return 'laptop';
    const activeAddr = context.activeDevice;
    if (activeAddr && activeAddr !== 'all') {
      return context.deviceTypes[activeAddr] || 'laptop';
    }
    return context.connectedDevices[0]?.deviceType || 'laptop';
  }
}

export const agentOrchestrator = new AgentOrchestratorService();
