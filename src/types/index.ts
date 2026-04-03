// Bluetooth HID types
export type DeviceType = 'laptop' | 'tv' | 'desktop' | 'phone' | 'unknown';

export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  paired: boolean;
  connected: boolean;
  deviceType?: DeviceType;
}

export type ConnectionStatus = 'disconnected' | 'scanning' | 'pairing' | 'connected' | 'error';

// Command types
export type CommandTarget = 'laptop' | 'phone' | 'tv';

export interface ParsedCommand {
  target: CommandTarget;
  action: string;
  keystrokes: KeyAction[];
  description: string;
  ttsResponse: string;
  deviceType?: DeviceType;
  params?: Record<string, any>;
}

export interface KeyAction {
  type: 'key' | 'text' | 'delay' | 'mouse';
  // For 'key': modifier keys + key code
  modifiers?: KeyModifier[];
  keyCode?: number;
  // For 'text': string to type
  text?: string;
  // For 'delay': milliseconds
  delayMs?: number;
  // For 'mouse': movement or click
  mouseAction?: 'click' | 'rightClick' | 'move' | 'scroll';
  x?: number;
  y?: number;
}

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'win';

// Voice recognition
export type ListeningState = 'idle' | 'listening' | 'processing' | 'speaking';

// Settings
export interface AppSettings {
  aiEndpoint: string;
  aiModel: string;
  aiEnabled: boolean;
  keystrokeDelay: number;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  autoReconnect: boolean;
}
