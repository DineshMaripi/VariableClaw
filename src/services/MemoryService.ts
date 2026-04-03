import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommandHistoryEntry, RoutineDefinition, TimePattern, AppUsage } from '../types/agents';
import { eventBus } from './EventBus';

/**
 * MemoryService — persistent local memory for the agent system.
 * All data stored in AsyncStorage (no DB, no auth, no server).
 *
 * Stores:
 * - Command history (last 200 commands with timestamps)
 * - Routines (user-defined action sequences)
 * - App usage stats (derived from history)
 *
 * Auto-subscribes to EventBus to record commands.
 */

const KEYS = {
  HISTORY: '@vc_command_history',
  ROUTINES: '@vc_routines',
  FIRST_USE: '@vc_first_use',
} as const;

const MAX_HISTORY = 200;

class MemoryServiceClass {
  private _history: CommandHistoryEntry[] = [];
  private _routines: RoutineDefinition[] = [];
  private _initialized = false;
  private _firstUseDate: number = 0;

  // ─── Init ───

  async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      const [historyRaw, routinesRaw, firstUseRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.HISTORY),
        AsyncStorage.getItem(KEYS.ROUTINES),
        AsyncStorage.getItem(KEYS.FIRST_USE),
      ]);

      this._history = historyRaw ? JSON.parse(historyRaw) : [];
      this._routines = routinesRaw ? JSON.parse(routinesRaw) : [];
      this._firstUseDate = firstUseRaw ? parseInt(firstUseRaw, 10) : 0;

      if (!this._firstUseDate) {
        this._firstUseDate = Date.now();
        await AsyncStorage.setItem(KEYS.FIRST_USE, String(this._firstUseDate));
      }

      this._initialized = true;
      this.setupEventListeners();
    } catch (err) {
      console.error('[MemoryService] Init failed:', err);
    }
  }

  private setupEventListeners() {
    eventBus.on('command:executed', (event) => {
      const now = new Date();
      this.recordCommand({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: event.text,
        action: event.command.action,
        deviceType: event.command.deviceType || 'laptop',
        targetDevice: event.command.target || 'all',
        timestamp: Date.now(),
        success: event.success,
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
      });
    });
  }

  // ─── Command History ───

  async recordCommand(entry: CommandHistoryEntry): Promise<void> {
    this._history.unshift(entry);
    if (this._history.length > MAX_HISTORY) {
      this._history = this._history.slice(0, MAX_HISTORY);
    }
    await this.saveHistory();
  }

  getRecentCommands(count: number = 10): CommandHistoryEntry[] {
    return this._history.slice(0, count);
  }

  get totalCommands(): number {
    return this._history.length;
  }

  get isFirstTime(): boolean {
    return this._history.length < 3;
  }

  get firstUseDate(): number {
    return this._firstUseDate;
  }

  // ─── Pattern Analysis ───

  /** Get most used apps from command history */
  getFrequentApps(limit: number = 5): AppUsage[] {
    const counts = new Map<string, { count: number; lastUsed: number }>();

    for (const cmd of this._history) {
      if (cmd.action === 'openApp') {
        const match = cmd.text.match(/(?:open|launch)\s+(.+)/i);
        const app = match ? match[1].trim().toLowerCase() : '';
        if (app) {
          const existing = counts.get(app) || { count: 0, lastUsed: 0 };
          counts.set(app, {
            count: existing.count + 1,
            lastUsed: Math.max(existing.lastUsed, cmd.timestamp),
          });
        }
      }
    }

    return Array.from(counts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /** Get time-based patterns (what user does at which hour) */
  getTimePatterns(): TimePattern[] {
    const patterns = new Map<string, number>(); // "hour:action" -> count

    for (const cmd of this._history) {
      if (cmd.success) {
        const key = `${cmd.hour}:${cmd.action}`;
        patterns.set(key, (patterns.get(key) || 0) + 1);
      }
    }

    return Array.from(patterns.entries())
      .map(([key, count]) => {
        const [hour, action] = key.split(':');
        return { hour: parseInt(hour, 10), action, count };
      })
      .filter(p => p.count >= 2) // only patterns that repeat
      .sort((a, b) => b.count - a.count);
  }

  /** Get the last command text (for "repeat" / "undo") */
  getLastCommand(): CommandHistoryEntry | null {
    return this._history[0] || null;
  }

  /** Search history for a past command matching keywords */
  searchHistory(keywords: string, limit: number = 5): CommandHistoryEntry[] {
    const lower = keywords.toLowerCase();
    return this._history
      .filter(cmd => cmd.text.toLowerCase().includes(lower))
      .slice(0, limit);
  }

  // ─── Routines ───

  getRoutines(): RoutineDefinition[] {
    return [...this._routines];
  }

  getRoutine(name: string): RoutineDefinition | undefined {
    return this._routines.find(
      r => r.name.toLowerCase() === name.toLowerCase()
    );
  }

  async saveRoutine(routine: RoutineDefinition): Promise<void> {
    const idx = this._routines.findIndex(r => r.id === routine.id);
    if (idx >= 0) {
      this._routines[idx] = routine;
    } else {
      this._routines.push(routine);
    }
    await this.saveRoutines();
  }

  async deleteRoutine(id: string): Promise<void> {
    this._routines = this._routines.filter(r => r.id !== id);
    await this.saveRoutines();
  }

  async markRoutineUsed(id: string): Promise<void> {
    const routine = this._routines.find(r => r.id === id);
    if (routine) {
      routine.lastUsedAt = Date.now();
      routine.useCount++;
      await this.saveRoutines();
    }
  }

  // ─── Clear ───

  async clearHistory(): Promise<void> {
    this._history = [];
    await AsyncStorage.removeItem(KEYS.HISTORY);
  }

  async clearAll(): Promise<void> {
    this._history = [];
    this._routines = [];
    await Promise.all([
      AsyncStorage.removeItem(KEYS.HISTORY),
      AsyncStorage.removeItem(KEYS.ROUTINES),
    ]);
  }

  // ─── Persistence ───

  private async saveHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(this._history));
    } catch (err) {
      console.error('[MemoryService] Save history failed:', err);
    }
  }

  private async saveRoutines(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.ROUTINES, JSON.stringify(this._routines));
    } catch (err) {
      console.error('[MemoryService] Save routines failed:', err);
    }
  }
}

export const memoryService = new MemoryServiceClass();
