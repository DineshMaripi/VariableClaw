import { BaseAgent } from './BaseAgent';
import { ollamaService } from '../OllamaService';
import { memoryService } from '../MemoryService';
import { eventBus } from '../EventBus';
import { AgentContext, AgentResult, RoutineDefinition, RoutineStep } from '../../types/agents';

/**
 * RoutineAgent — handles named automation sequences.
 *
 * Users can:
 * - Run built-in routines: "movie mode", "work mode", "goodnight"
 * - Create custom routines: "create routine called study mode"
 * - Delete routines: "delete routine movie mode"
 * - List routines: "my routines" / "list routines"
 *
 * With AI: understands natural names, suggests routine steps
 * Without AI: matches exact routine names from memory
 */

const BUILT_IN_ROUTINES: RoutineDefinition[] = [
  {
    id: 'builtin-movie-mode',
    name: 'movie mode',
    steps: [
      { voiceCommand: 'open youtube' },
      { voiceCommand: 'fullscreen', delayMs: 2000 },
      { voiceCommand: 'volume up' },
      { voiceCommand: 'volume up' },
    ],
    createdAt: 0,
    lastUsedAt: 0,
    useCount: 0,
    icon: 'film-outline',
    gradient: ['#ff4757', '#ff6b81'],
  },
  {
    id: 'builtin-work-mode',
    name: 'work mode',
    steps: [
      { voiceCommand: 'open vs code' },
      { voiceCommand: 'open chrome', delayMs: 1000 },
    ],
    createdAt: 0,
    lastUsedAt: 0,
    useCount: 0,
    icon: 'code-slash-outline',
    gradient: ['#007ACC', '#45a3e6'],
  },
  {
    id: 'builtin-goodnight',
    name: 'goodnight',
    steps: [
      { voiceCommand: 'mute' },
      { voiceCommand: 'lock the laptop', delayMs: 500 },
    ],
    createdAt: 0,
    lastUsedAt: 0,
    useCount: 0,
    icon: 'moon-outline',
    gradient: ['#5352ed', '#7c7cf7'],
  },
  {
    id: 'builtin-music-mode',
    name: 'music mode',
    steps: [
      { voiceCommand: 'play lofi hip hop on youtube' },
      { voiceCommand: 'volume up', delayMs: 2000 },
      { voiceCommand: 'volume up' },
    ],
    createdAt: 0,
    lastUsedAt: 0,
    useCount: 0,
    icon: 'musical-notes-outline',
    gradient: ['#2ed573', '#7bed9f'],
  },
];

const ROUTINE_PATTERNS = [
  /^(?:run|start|activate|do)\s+(.+?)(?:\s+(?:mode|routine))?$/i,
  /^(.+?)\s+mode$/i,
  /^(.+?)\s+routine$/i,
  /^create\s+(?:a\s+)?routine\s+(?:called\s+)?(.+)$/i,
  /^delete\s+routine\s+(.+)$/i,
  /^(?:my|list|show)\s+routines?$/i,
];

const ROUTINE_SUGGEST_PROMPT = `You are Variable Claw AI. The user wants to create an automation routine.
Given the routine name, suggest 3-5 voice commands as steps.
Available commands: open [app], search on youtube/google, volume up/down, mute, lock laptop, screenshot, minimize all, fullscreen, sleep laptop.
Respond with ONLY a JSON array of strings (the voice commands). Example: ["open chrome", "volume up", "fullscreen"]`;

export class RoutineAgent extends BaseAgent {
  readonly name = 'RoutineAgent';
  readonly description = 'Manages named automation sequences (routines)';

  canHandle(input: string, context: AgentContext): boolean {
    const lower = input.toLowerCase().trim();

    // "list routines" / "my routines"
    if (/^(?:my|list|show)\s+routines?$/i.test(lower)) return true;

    // "create routine called X"
    if (/^(?:create|make|add)\s+(?:a\s+)?routine/i.test(lower)) return true;

    // "delete routine X"
    if (/^delete\s+routine/i.test(lower)) return true;

    // Check if input matches any known routine name
    if (this.findRoutine(lower)) return true;

    // Check patterns like "X mode" or "run X"
    for (const pattern of ROUTINE_PATTERNS) {
      if (pattern.test(lower)) {
        const match = lower.match(pattern);
        if (match && match[1] && this.findRoutine(match[1].trim())) return true;
      }
    }

    return false;
  }

  async process(input: string, context: AgentContext): Promise<AgentResult | null> {
    const lower = input.toLowerCase().trim();

    // List routines
    if (/^(?:my|list|show)\s+routines?$/i.test(lower)) {
      return this.listRoutines();
    }

    // Create routine
    const createMatch = lower.match(/^(?:create|make|add)\s+(?:a\s+)?routine\s+(?:called\s+)?(.+)$/i);
    if (createMatch) {
      return this.createRoutine(createMatch[1].trim());
    }

    // Delete routine
    const deleteMatch = lower.match(/^delete\s+routine\s+(.+)$/i);
    if (deleteMatch) {
      return this.deleteRoutine(deleteMatch[1].trim());
    }

    // Run routine — try to find it
    const routineName = this.extractRoutineName(lower);
    const routine = routineName ? this.findRoutine(routineName) : null;

    if (routine) {
      return this.runRoutine(routine);
    }

    return null;
  }

  /** Find a routine by name (built-in + user-defined) */
  private findRoutine(name: string): RoutineDefinition | null {
    const lower = name.toLowerCase().replace(/\s*(mode|routine)\s*$/i, '').trim();

    // Check user-defined first (they override built-ins)
    const userRoutine = memoryService.getRoutine(lower);
    if (userRoutine) return userRoutine;

    // Check built-ins
    return BUILT_IN_ROUTINES.find(r => r.name === lower) || null;
  }

  /** Extract routine name from various input formats */
  private extractRoutineName(input: string): string | null {
    for (const pattern of ROUTINE_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) return match[1].trim();
    }
    // Direct name match
    return input;
  }

  /** Run a routine — returns the list of commands to execute sequentially */
  private async runRoutine(routine: RoutineDefinition): Promise<AgentResult> {
    await memoryService.markRoutineUsed(routine.id);
    eventBus.emit({ type: 'routine:triggered', routine });

    return {
      success: true,
      action: 'routine',
      data: {
        routineId: routine.id,
        routineName: routine.name,
        steps: routine.steps,
        executeSequence: true, // signal to orchestrator to run steps in order
      },
      message: `Running "${routine.name}" (${routine.steps.length} steps)`,
      ttsResponse: `Running ${routine.name}`,
    };
  }

  /** Create a new routine — AI suggests steps, or creates empty */
  private async createRoutine(name: string): Promise<AgentResult> {
    // Check if already exists
    if (this.findRoutine(name)) {
      return {
        success: false,
        action: 'createRoutine',
        message: `Routine "${name}" already exists`,
        ttsResponse: `A routine called ${name} already exists.`,
      };
    }

    let steps: RoutineStep[] = [];

    // Ask AI to suggest steps
    if (ollamaService.isConnected) {
      try {
        const suggestions = await ollamaService.chatJSON<string[]>(
          ROUTINE_SUGGEST_PROMPT,
          `Routine name: "${name}"`,
          { temperature: 0.5, maxTokens: 200 }
        );
        if (Array.isArray(suggestions)) {
          steps = suggestions.map((cmd, i) => ({
            voiceCommand: String(cmd),
            delayMs: i > 0 ? 1000 : undefined,
          }));
        }
      } catch { /* empty routine */ }
    }

    const routine: RoutineDefinition = {
      id: `user-${Date.now()}`,
      name: name.toLowerCase(),
      steps,
      createdAt: Date.now(),
      lastUsedAt: 0,
      useCount: 0,
    };

    await memoryService.saveRoutine(routine);

    const stepList = steps.length > 0
      ? steps.map(s => s.voiceCommand).join(', ')
      : 'empty — add steps in settings';

    return {
      success: true,
      action: 'createRoutine',
      data: { routine },
      message: `Created routine "${name}": ${stepList}`,
      ttsResponse: `Created routine ${name} with ${steps.length} steps.`,
    };
  }

  /** Delete a user-defined routine */
  private async deleteRoutine(name: string): Promise<AgentResult> {
    const routine = memoryService.getRoutine(name);
    if (!routine) {
      return {
        success: false,
        action: 'deleteRoutine',
        message: `No routine called "${name}" found`,
        ttsResponse: `I don't have a routine called ${name}.`,
      };
    }

    await memoryService.deleteRoutine(routine.id);

    return {
      success: true,
      action: 'deleteRoutine',
      message: `Deleted routine "${name}"`,
      ttsResponse: `Deleted routine ${name}.`,
    };
  }

  /** List all routines */
  private listRoutines(): AgentResult {
    const userRoutines = memoryService.getRoutines();
    const all = [...BUILT_IN_ROUTINES, ...userRoutines];

    if (all.length === 0) {
      return {
        success: true,
        action: 'listRoutines',
        message: 'No routines yet. Say "create routine called [name]" to make one.',
        ttsResponse: 'No routines yet.',
      };
    }

    const list = all.map(r => {
      const steps = r.steps.map(s => s.voiceCommand).join(' → ');
      return `• ${r.name}: ${steps}`;
    }).join('\n');

    return {
      success: true,
      action: 'listRoutines',
      data: { routines: all },
      message: `Your routines:\n${list}`,
      ttsResponse: `You have ${all.length} routines. ${all.slice(0, 3).map(r => r.name).join(', ')}.`,
    };
  }

  /** Get all available routines (for UI display) */
  getAllRoutines(): RoutineDefinition[] {
    return [...BUILT_IN_ROUTINES, ...memoryService.getRoutines()];
  }
}

export const routineAgent = new RoutineAgent();
