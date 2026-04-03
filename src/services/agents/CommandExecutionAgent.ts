import { ParsedCommand, KeyAction } from '../../types';
import { executeKeyActions } from '../KeyboardMapper';
import { phoneCommands } from '../PhoneCommands';
import { bluetoothHID } from '../BluetoothHID';
import { smartSuggestionAgent } from './SmartSuggestionAgent';
import { contextManager } from '../ContextManager';

/**
 * CommandExecutionAgent — handles the actual execution of parsed commands.
 * Responsibilities:
 * - Validate command before execution
 * - Handle dangerous commands (shutdown, sleep) with confirmation
 * - Execute via correct channel (Bluetooth HID or Phone intents)
 * - Track execution for suggestions
 * - Provide error recovery
 */

export interface ExecutionResult {
  success: boolean;
  message: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  retryable?: boolean;
}

const DANGEROUS_ACTIONS = new Set([
  'shutdown', 'restart', 'sleep',
]);

const DEVICE_REQUIRED_ACTIONS = new Set([
  'openApp', 'openUrl', 'searchYouTube', 'searchGoogle', 'typeText',
  'pressKey', 'lockScreen', 'screenshot', 'closeWindow', 'minimizeAll',
  'switchApp', 'volumeUp', 'volumeDown', 'mute', 'shutdown', 'restart',
  'sleep', 'newTab', 'closeTab', 'refresh', 'fullscreen',
  'tvOpenApp', 'tvSearch', 'tvPlay', 'tvHome', 'tvBack', 'tvSelect', 'tvNavigate',
]);

export class CommandExecutionAgent {
  readonly name = 'CommandExecutionAgent';

  /**
   * Validate whether a command can be executed in the current state.
   */
  validate(command: ParsedCommand): ExecutionResult {
    // Check if this is a dangerous action
    if (DANGEROUS_ACTIONS.has(command.action)) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `Are you sure you want to ${command.description.toLowerCase()}?`,
        message: 'Requires confirmation',
      };
    }

    // Check if device connection is required
    if (command.target !== 'phone' && DEVICE_REQUIRED_ACTIONS.has(command.action)) {
      if (!bluetoothHID.isConnected) {
        return {
          success: false,
          message: 'No device connected. Connect a device first from the Connect tab.',
          retryable: false,
        };
      }
    }

    // Check phone command availability
    if (command.target === 'phone') {
      if (!phoneCommands.isAvailable) {
        return {
          success: false,
          message: 'Phone commands not available. Build with expo-dev-client.',
          retryable: false,
        };
      }
    }

    return { success: true, message: 'Ready to execute' };
  }

  /**
   * Execute a parsed command on the target device.
   */
  async execute(
    command: ParsedCommand,
    options: { keystrokeDelay?: number; targetDevice?: string } = {}
  ): Promise<ExecutionResult> {
    const { keystrokeDelay = 50, targetDevice = 'all' } = options;

    // Pre-flight validation
    const validation = this.validate(command);
    if (!validation.success && !validation.requiresConfirmation) {
      return validation;
    }

    try {
      if (command.target === 'phone') {
        // Execute on the phone itself
        const result = await phoneCommands.execute(command.action, command.params || {});
        this.trackExecution(command);
        return {
          success: result.success,
          message: result.message,
          retryable: !result.success,
        };
      }

      // Execute on connected device via Bluetooth HID
      if (command.keystrokes.length > 0) {
        await executeKeyActions(command.keystrokes, keystrokeDelay, targetDevice);
        this.trackExecution(command);
        return { success: true, message: command.description };
      }

      return { success: false, message: 'No keystrokes to execute', retryable: false };
    } catch (error: any) {
      const msg = error?.message || 'Execution failed';

      // Determine if retryable
      const retryable = msg.includes('not connected') || msg.includes('not initialized');

      return { success: false, message: msg, retryable };
    }
  }

  /**
   * Execute with automatic retry on transient failures.
   */
  async executeWithRetry(
    command: ParsedCommand,
    options: { keystrokeDelay?: number; targetDevice?: string; maxRetries?: number } = {}
  ): Promise<ExecutionResult> {
    const { maxRetries = 2, ...execOptions } = options;

    let lastResult: ExecutionResult = { success: false, message: 'Not executed' };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await this.execute(command, execOptions);

      if (lastResult.success || !lastResult.retryable) {
        return lastResult;
      }

      // Wait before retry with backoff
      if (attempt < maxRetries) {
        await new Promise<void>(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    return { ...lastResult, message: `${lastResult.message} (after ${maxRetries + 1} attempts)` };
  }

  /** Track executed command across all systems */
  private trackExecution(command: ParsedCommand) {
    smartSuggestionAgent.recordCommand(`${command.action} ${command.description}`);
    contextManager.recordSessionCommand(command.description);
  }
}

export const commandExecutionAgent = new CommandExecutionAgent();
