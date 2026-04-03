import { KeyAction, KeyModifier } from '../types';
import { HID_KEY, HID_MODIFIER, CHAR_MAP } from '../constants/keycodes';
import { bluetoothHID } from './BluetoothHID';

function getModifierBits(modifiers: KeyModifier[]): number {
  let bits = 0;
  for (const mod of modifiers) {
    switch (mod) {
      case 'ctrl': bits |= HID_MODIFIER.LEFT_CTRL; break;
      case 'alt': bits |= HID_MODIFIER.LEFT_ALT; break;
      case 'shift': bits |= HID_MODIFIER.LEFT_SHIFT; break;
      case 'win': bits |= HID_MODIFIER.LEFT_GUI; break;
    }
  }
  return bits;
}

// target: device address, 'all' for broadcast, or undefined for first connected
export async function executeKeyActions(actions: KeyAction[], keystrokeDelay = 50, target?: string): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case 'key': {
        const modifier = getModifierBits(action.modifiers || []);
        const keyCode = action.keyCode || 0;
        await bluetoothHID.sendKey(modifier, keyCode, target);
        await delay(keystrokeDelay);
        break;
      }
      case 'text': {
        if (action.text) {
          await typeText(action.text, keystrokeDelay, target);
        }
        break;
      }
      case 'delay': {
        await delay(action.delayMs || 500);
        break;
      }
      case 'mouse': {
        switch (action.mouseAction) {
          case 'click':
            await bluetoothHID.sendMouseClick('left', target);
            break;
          case 'rightClick':
            await bluetoothHID.sendMouseClick('right', target);
            break;
          case 'move':
            await bluetoothHID.sendMouseMove(action.x || 0, action.y || 0, target);
            break;
          case 'scroll':
            await bluetoothHID.sendScroll(action.y || 0, target);
            break;
        }
        await delay(keystrokeDelay);
        break;
      }
    }
  }
}

async function typeText(text: string, keystrokeDelay: number, target?: string): Promise<void> {
  for (const char of text) {
    const mapping = CHAR_MAP[char];
    if (mapping) {
      const modifier = mapping.shift ? HID_MODIFIER.LEFT_SHIFT : HID_MODIFIER.NONE;
      await bluetoothHID.sendKey(modifier, mapping.keyCode, target);
      await delay(keystrokeDelay);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}

// Pre-built keystroke sequences for common actions
export const KeySequences = {
  openRun: (): KeyAction[] => [
    { type: 'key', modifiers: ['win'], keyCode: HID_KEY.R },
    { type: 'delay', delayMs: 800 },
  ],

  openApp: (appName: string): KeyAction[] => [
    ...KeySequences.openRun(),
    { type: 'text', text: appName },
    { type: 'delay', delayMs: 300 },
    { type: 'key', keyCode: HID_KEY.ENTER },
    { type: 'delay', delayMs: 2000 },
  ],

  openUrl: (url: string): KeyAction[] => [
    // Assumes browser is already open, or opens it first
    ...KeySequences.openApp('chrome'),
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.L }, // Focus address bar
    { type: 'delay', delayMs: 300 },
    { type: 'text', text: url },
    { type: 'key', keyCode: HID_KEY.ENTER },
    { type: 'delay', delayMs: 3000 },
  ],

  searchYouTube: (query: string): KeyAction[] => [
    ...KeySequences.openUrl('youtube.com'),
    // Click on search bar (Tab to it)
    { type: 'key', keyCode: HID_KEY.TAB },
    { type: 'key', keyCode: HID_KEY.TAB },
    { type: 'key', keyCode: HID_KEY.TAB },
    { type: 'delay', delayMs: 300 },
    { type: 'text', text: query },
    { type: 'key', keyCode: HID_KEY.ENTER },
  ],

  searchGoogle: (query: string): KeyAction[] => [
    ...KeySequences.openUrl('google.com'),
    { type: 'text', text: query },
    { type: 'key', keyCode: HID_KEY.ENTER },
  ],

  lockScreen: (): KeyAction[] => [
    { type: 'key', modifiers: ['win'], keyCode: HID_KEY.L },
  ],

  closeWindow: (): KeyAction[] => [
    { type: 'key', modifiers: ['alt'], keyCode: HID_KEY.F4 },
  ],

  minimizeAll: (): KeyAction[] => [
    { type: 'key', modifiers: ['win'], keyCode: HID_KEY.D },
  ],

  switchApp: (): KeyAction[] => [
    { type: 'key', modifiers: ['alt'], keyCode: HID_KEY.TAB },
  ],

  screenshot: (): KeyAction[] => [
    { type: 'key', modifiers: ['win'], keyCode: HID_KEY.PRINT_SCREEN },
  ],

  openTaskManager: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl', 'shift'], keyCode: HID_KEY.ESCAPE },
  ],

  openFileExplorer: (): KeyAction[] => [
    { type: 'key', modifiers: ['win'], keyCode: HID_KEY.E },
  ],

  volumeUp: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.VOLUME_UP },
  ],

  volumeDown: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.VOLUME_DOWN },
  ],

  mute: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.MUTE },
  ],

  shutdown: (seconds = 60): KeyAction[] => [
    ...KeySequences.openRun(),
    { type: 'text', text: `shutdown /s /t ${seconds}` },
    { type: 'key', keyCode: HID_KEY.ENTER },
  ],

  restart: (seconds = 60): KeyAction[] => [
    ...KeySequences.openRun(),
    { type: 'text', text: `shutdown /r /t ${seconds}` },
    { type: 'key', keyCode: HID_KEY.ENTER },
  ],

  sleep: (): KeyAction[] => [
    ...KeySequences.openRun(),
    { type: 'text', text: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0' },
    { type: 'key', keyCode: HID_KEY.ENTER },
  ],

  undo: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.Z },
  ],

  redo: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.Y },
  ],

  copy: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.C },
  ],

  paste: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.V },
  ],

  selectAll: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.A },
  ],

  newTab: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.T },
  ],

  closeTab: (): KeyAction[] => [
    { type: 'key', modifiers: ['ctrl'], keyCode: HID_KEY.W },
  ],

  refreshPage: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.F5 },
  ],

  fullscreen: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.F11 },
  ],

  playPause: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.SPACE },
  ],

  // ─── TV Navigation (D-pad based) ───

  tvHome: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.HOME },
    { type: 'delay', delayMs: 1000 },
  ],

  tvBack: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.ESCAPE },
  ],

  tvSelect: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.ENTER },
  ],

  tvUp: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.UP_ARROW },
  ],

  tvDown: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.DOWN_ARROW },
  ],

  tvLeft: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.LEFT_ARROW },
  ],

  tvRight: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.RIGHT_ARROW },
  ],

  // TV: Open app by going Home → navigate to app → open
  // On Android TV, Home → app is in the row, use D-pad to find it
  tvOpenApp: (appName: string): KeyAction[] => [
    // Go to home screen
    ...KeySequences.tvHome(),
    // Move up to apps row (Android TV layout)
    { type: 'key', keyCode: HID_KEY.UP_ARROW },
    { type: 'key', keyCode: HID_KEY.UP_ARROW },
    { type: 'key', keyCode: HID_KEY.UP_ARROW },
    { type: 'delay', delayMs: 500 },
    // Select "Apps" / "See all" to open app list
    { type: 'key', keyCode: HID_KEY.ENTER },
    { type: 'delay', delayMs: 1500 },
    // Use voice search or text search on TV
    // Most Android TVs support typing to search when in app list
    { type: 'text', text: appName },
    { type: 'delay', delayMs: 1000 },
    { type: 'key', keyCode: HID_KEY.ENTER },
    { type: 'delay', delayMs: 3000 },
  ],

  // TV: Search within an app (Hotstar, YouTube, Netflix etc.)
  tvSearchInApp: (query: string): KeyAction[] => [
    // Most TV apps: press Up/Left to reach search icon, or Tab
    { type: 'key', keyCode: HID_KEY.TAB },
    { type: 'delay', delayMs: 500 },
    // Look for search — usually top-left
    { type: 'key', keyCode: HID_KEY.UP_ARROW },
    { type: 'key', keyCode: HID_KEY.UP_ARROW },
    { type: 'key', keyCode: HID_KEY.LEFT_ARROW },
    { type: 'key', keyCode: HID_KEY.LEFT_ARROW },
    { type: 'delay', delayMs: 300 },
    { type: 'key', keyCode: HID_KEY.ENTER },
    { type: 'delay', delayMs: 1000 },
    // Type search query
    { type: 'text', text: query },
    { type: 'delay', delayMs: 500 },
    { type: 'key', keyCode: HID_KEY.ENTER },
    { type: 'delay', delayMs: 2000 },
    // Select first result
    { type: 'key', keyCode: HID_KEY.DOWN_ARROW },
    { type: 'key', keyCode: HID_KEY.ENTER },
    { type: 'delay', delayMs: 2000 },
  ],

  // TV: Open app then search (e.g., "play karthika deepam on hotstar")
  tvOpenAppAndSearch: (appName: string, query: string): KeyAction[] => [
    ...KeySequences.tvOpenApp(appName),
    ...KeySequences.tvSearchInApp(query),
  ],

  // TV: Open app then play (select first content)
  tvOpenAppAndPlay: (appName: string, query: string): KeyAction[] => [
    ...KeySequences.tvOpenApp(appName),
    ...KeySequences.tvSearchInApp(query),
    // Press Enter/Play on the result
    { type: 'key', keyCode: HID_KEY.ENTER },
  ],

  // TV: Sleep/standby
  tvSleep: (): KeyAction[] => [
    { type: 'key', keyCode: HID_KEY.F5 }, // Some TVs use power key mapped to F5
  ],
};
