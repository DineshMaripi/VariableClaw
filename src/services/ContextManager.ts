import { AgentContext } from '../types/agents';
import { DeviceType } from '../types';
import { bluetoothHID } from './BluetoothHID';
import { ollamaService } from './OllamaService';
import { memoryService } from './MemoryService';

/**
 * ContextManager — assembles shared AgentContext from all sources.
 * Single source of truth for "what's happening right now."
 *
 * Every agent receives this same context, eliminating the pattern
 * where each agent independently queries device state, time, etc.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTimeOfDay(hour: number): AgentContext['timeOfDay'] {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

class ContextManagerService {
  private _sessionCommands: string[] = [];
  private _activeDevice: string | null = 'all';

  /** Record a command in this session (in-memory only, not persisted) */
  recordSessionCommand(text: string) {
    this._sessionCommands.push(text);
    if (this._sessionCommands.length > 50) {
      this._sessionCommands = this._sessionCommands.slice(-50);
    }
  }

  /** Set the active target device */
  setActiveDevice(address: string | null) {
    this._activeDevice = address;
  }

  /** Get the last N session commands */
  getLastSessionCommands(count: number = 5): string[] {
    return this._sessionCommands.slice(-count);
  }

  /**
   * Assemble the full AgentContext snapshot.
   * This is called before every agent pipeline execution.
   */
  getContext(): AgentContext {
    const now = new Date();
    const hour = now.getHours();
    const devices = bluetoothHID.connectedDevices;

    const deviceTypes: Record<string, DeviceType> = {};
    for (const d of devices) {
      deviceTypes[d.address] = d.deviceType || 'unknown';
    }

    return {
      connectedDevices: devices,
      activeDevice: this._activeDevice,
      deviceTypes,
      timeOfDay: getTimeOfDay(hour),
      hour,
      dayOfWeek: DAYS[now.getDay()],
      recentCommands: memoryService.getRecentCommands(10),
      sessionCommands: this._sessionCommands.slice(-10),
      aiAvailable: ollamaService.isConnected,
    };
  }

  /** Get a compact string summary of current context (for AI prompts) */
  getContextSummary(): string {
    const ctx = this.getContext();
    const deviceList = ctx.connectedDevices.length > 0
      ? ctx.connectedDevices.map(d => `${d.name} (${d.deviceType || 'unknown'})`).join(', ')
      : 'none';

    const recentCmds = ctx.sessionCommands.slice(-3).join(', ') || 'none yet';

    return [
      `Time: ${ctx.dayOfWeek} ${ctx.timeOfDay} (${ctx.hour}:00)`,
      `Devices: ${deviceList}`,
      `Target: ${ctx.activeDevice || 'all'}`,
      `Recent: ${recentCmds}`,
      `AI: ${ctx.aiAvailable ? 'connected' : 'offline'}`,
    ].join('\n');
  }

  /** Reset session state (e.g., on app restart) */
  resetSession() {
    this._sessionCommands = [];
  }
}

export const contextManager = new ContextManagerService();
