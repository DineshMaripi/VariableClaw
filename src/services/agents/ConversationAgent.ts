import { BaseAgent } from './BaseAgent';
import { ollamaService } from '../OllamaService';
import { memoryService } from '../MemoryService';
import { contextManager } from '../ContextManager';
import { AgentContext, AgentResult } from '../../types/agents';

/**
 * ConversationAgent — handles multi-turn dialogue and meta-commands.
 *
 * Catches: "undo", "repeat", "help", "do it again", "I meant...",
 * "what can I do?", "louder", "more", "stop", "cancel"
 *
 * With AI: natural corrections ("actually I meant the TV"),
 *          contextual help, conversational flow
 * Without AI: keyword matching for core meta-commands
 */

const META_PATTERNS: { patterns: RegExp[]; intent: string }[] = [
  { patterns: [/^undo$/i, /^undo that$/i, /^take that back$/i, /^go back$/i], intent: 'undo' },
  { patterns: [/^repeat$/i, /^do it again$/i, /^again$/i, /^same again$/i, /^one more time$/i], intent: 'repeat' },
  { patterns: [/^more$/i, /^louder$/i, /^keep going$/i], intent: 'more' },
  { patterns: [/^less$/i, /^quieter$/i, /^softer$/i], intent: 'less' },
  { patterns: [/^help$/i, /^what can I (?:do|say)$/i, /^commands$/i, /^show commands$/i], intent: 'help' },
  { patterns: [/^stop$/i, /^cancel$/i, /^never ?mind$/i], intent: 'cancel' },
  { patterns: [/^what did I (?:just )?(?:do|say)$/i, /^last command$/i, /^history$/i], intent: 'history' },
  { patterns: [/^actually/i, /^I (?:meant|mean)/i, /^no,?\s/i, /^not that/i, /^wrong/i], intent: 'correction' },
];

// Undo mappings: action -> reverse action voice command
const UNDO_MAP: Record<string, string> = {
  volumeUp: 'volume down',
  volumeDown: 'volume up',
  mute: 'mute',
  newTab: 'close tab',
  closeTab: 'new tab',
  fullscreen: 'fullscreen',
  minimizeAll: 'switch app',
};

const HELP_TEXT = `Here's what I can do:

**Apps**: "open chrome", "open VS Code", "open notepad"
**Web**: "search cats on YouTube", "google weather today"
**Volume**: "volume up", "volume down", "mute"
**Windows**: "close window", "minimize all", "switch app", "fullscreen"
**Browser**: "new tab", "close tab", "refresh"
**System**: "lock laptop", "screenshot", "sleep", "shutdown"
**Keys**: "press ctrl+c", "press alt+tab"
**Type**: "type hello world"
**Meta**: "undo", "repeat", "help"

Say any command naturally — AI will figure out the rest!`;

const CONVERSATION_PROMPT = `You are Variable Claw AI assistant. The user is trying to correct or clarify a voice command.
Given the conversation context, figure out what they actually want and respond with a JSON object:
{"action": "the corrected voice command to execute", "response": "brief acknowledgment to user"}
If you can't figure it out, respond with: {"action": null, "response": "brief question asking for clarification"}
Respond with ONLY the JSON.`;

export class ConversationAgent extends BaseAgent {
  readonly name = 'ConversationAgent';
  readonly description = 'Handles undo, repeat, help, corrections, and multi-turn dialogue';

  canHandle(input: string, context: AgentContext): boolean {
    const lower = input.toLowerCase().trim();
    // Check all meta-command patterns
    for (const { patterns } of META_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(lower)) return true;
      }
    }
    return false;
  }

  async process(input: string, context: AgentContext): Promise<AgentResult | null> {
    const intent = this.detectIntent(input);

    switch (intent) {
      case 'undo': return this.handleUndo(context);
      case 'repeat': return this.handleRepeat(context);
      case 'more': return this.handleMore(context);
      case 'less': return this.handleLess(context);
      case 'help': return this.handleHelp(context);
      case 'cancel': return this.handleCancel();
      case 'history': return this.handleHistory(context);
      case 'correction': return this.handleCorrection(input, context);
      default: return null;
    }
  }

  private detectIntent(input: string): string | null {
    const lower = input.toLowerCase().trim();
    for (const { patterns, intent } of META_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(lower)) return intent;
      }
    }
    return null;
  }

  private handleUndo(context: AgentContext): AgentResult {
    const last = memoryService.getLastCommand();
    if (!last) {
      return { success: false, action: 'undo', message: 'Nothing to undo', ttsResponse: 'Nothing to undo.' };
    }

    const undoCommand = UNDO_MAP[last.action];
    if (undoCommand) {
      return {
        success: true,
        action: 'undo',
        data: { executeCommand: undoCommand },
        message: `Undoing: ${last.text}`,
        ttsResponse: `Undoing ${last.action.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
      };
    }

    return {
      success: false,
      action: 'undo',
      message: `Can't undo "${last.action}" — no reverse action`,
      ttsResponse: `Sorry, I can't undo that action.`,
    };
  }

  private handleRepeat(context: AgentContext): AgentResult {
    const last = memoryService.getLastCommand();
    if (!last) {
      return { success: false, action: 'repeat', message: 'Nothing to repeat', ttsResponse: 'Nothing to repeat.' };
    }

    return {
      success: true,
      action: 'repeat',
      data: { executeCommand: last.text },
      message: `Repeating: ${last.text}`,
      ttsResponse: `Repeating: ${last.text}`,
    };
  }

  private handleMore(context: AgentContext): AgentResult {
    const last = memoryService.getLastCommand();
    if (last && (last.action === 'volumeUp' || last.action === 'volumeDown')) {
      return {
        success: true,
        action: 'more',
        data: { executeCommand: last.text },
        message: `More: ${last.text}`,
        ttsResponse: last.action === 'volumeUp' ? 'Louder' : 'Quieter',
      };
    }

    return {
      success: true,
      action: 'more',
      data: { executeCommand: last?.text || 'volume up' },
      message: 'Volume up',
      ttsResponse: 'Volume up',
    };
  }

  private handleLess(context: AgentContext): AgentResult {
    return {
      success: true,
      action: 'less',
      data: { executeCommand: 'volume down' },
      message: 'Volume down',
      ttsResponse: 'Quieter',
    };
  }

  private handleHelp(context: AgentContext): AgentResult {
    const deviceCount = context.connectedDevices.length;
    const aiStatus = context.aiAvailable ? 'AI connected' : 'AI offline (regex mode)';

    return {
      success: true,
      action: 'help',
      data: { helpText: HELP_TEXT },
      message: `${deviceCount} device(s) connected | ${aiStatus}`,
      ttsResponse: 'Here are the commands you can use. Check the screen for the full list.',
    };
  }

  private handleCancel(): AgentResult {
    return {
      success: true,
      action: 'cancel',
      message: 'Cancelled',
      ttsResponse: 'Cancelled.',
    };
  }

  private handleHistory(context: AgentContext): AgentResult {
    const recent = memoryService.getRecentCommands(5);
    if (recent.length === 0) {
      return { success: true, action: 'history', message: 'No commands yet', ttsResponse: 'No commands yet.' };
    }

    const list = recent.map((c, i) => `${i + 1}. "${c.text}" → ${c.action}`).join('\n');
    return {
      success: true,
      action: 'history',
      data: { entries: recent },
      message: `Recent commands:\n${list}`,
      ttsResponse: `Your last command was "${recent[0].text}"`,
    };
  }

  private async handleCorrection(input: string, context: AgentContext): Promise<AgentResult> {
    const lastCommands = context.sessionCommands.slice(-3);

    // Try AI correction
    if (ollamaService.isConnected) {
      try {
        const result = await ollamaService.chatJSON<{ action: string | null; response: string }>(
          CONVERSATION_PROMPT,
          `Previous commands: ${lastCommands.join(', ') || 'none'}\nUser says: "${input}"`,
          { temperature: 0.3, maxTokens: 100 }
        );

        if (result?.action) {
          return {
            success: true,
            action: 'correction',
            data: { executeCommand: result.action },
            message: result.response || `Got it: ${result.action}`,
            ttsResponse: result.response || `Got it. ${result.action}`,
          };
        }

        if (result?.response) {
          return {
            success: false,
            action: 'correction',
            message: result.response,
            ttsResponse: result.response,
            followUp: 'What would you like me to do?',
          };
        }
      } catch { /* fall through */ }
    }

    // Fallback: no AI
    return {
      success: false,
      action: 'correction',
      message: "I'm not sure what you meant. Try saying the full command.",
      ttsResponse: "Could you say the full command? For example, open chrome or volume up.",
      followUp: 'Try again with a clearer command.',
    };
  }
}

export const conversationAgent = new ConversationAgent();
