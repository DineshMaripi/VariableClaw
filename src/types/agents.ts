import { BluetoothDevice, DeviceType, ParsedCommand } from './index';

// ─── Agent Context (shared state passed to every agent) ───

export interface AgentContext {
  // Devices
  connectedDevices: BluetoothDevice[];
  activeDevice: string | null; // address or 'all'
  deviceTypes: Record<string, DeviceType>; // address -> type

  // Time
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  hour: number;
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.

  // History
  recentCommands: CommandHistoryEntry[]; // last 10
  sessionCommands: string[]; // commands this session (text only)

  // AI
  aiAvailable: boolean;
}

// ─── Command History (persisted in AsyncStorage) ───

export interface CommandHistoryEntry {
  id: string;
  text: string;        // original voice text
  action: string;      // e.g. 'openApp', 'volumeUp'
  deviceType: string;  // target device type
  targetDevice: string; // 'all' or address
  timestamp: number;
  success: boolean;
  hour: number;
  dayOfWeek: number;   // 0=Sunday, 6=Saturday
}

// ─── Routines ───

export interface RoutineStep {
  voiceCommand: string; // the command to execute
  delayMs?: number;     // optional delay before this step
}

export interface RoutineDefinition {
  id: string;
  name: string;         // "movie mode", "goodnight"
  steps: RoutineStep[];
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  icon?: string;        // Ionicons name
  gradient?: [string, string];
}

// ─── Learned Patterns (derived from history, not stored directly) ───

export interface TimePattern {
  hour: number;
  action: string;
  count: number;
}

export interface AppUsage {
  name: string;
  count: number;
  lastUsed: number;
}

// ─── Agent Result ───

export interface AgentResult {
  success: boolean;
  action: string;
  data?: any;
  message: string;
  ttsResponse: string;
  followUp?: string;        // prompt for next interaction
}

// ─── EventBus Event Types ───

export type AppEvent =
  | { type: 'command:executed'; command: ParsedCommand; text: string; success: boolean }
  | { type: 'command:failed'; text: string; error: string }
  | { type: 'device:connected'; device: BluetoothDevice }
  | { type: 'device:disconnected'; address: string }
  | { type: 'ai:available' }
  | { type: 'ai:unavailable' }
  | { type: 'routine:triggered'; routine: RoutineDefinition }
  | { type: 'suggestion:refresh' };
