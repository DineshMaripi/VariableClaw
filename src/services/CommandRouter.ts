import { ParsedCommand, KeyAction, DeviceType } from '../types';
import { KeySequences } from './KeyboardMapper';
import { HID_KEY } from '../constants/keycodes';
import { phoneCommands } from './PhoneCommands';

// Command patterns that the AI/local parser can recognize
interface CommandPattern {
  patterns: RegExp[];
  handler: (match: RegExpMatchArray) => ParsedCommand;
}

const commandPatterns: CommandPattern[] = [
  // Open applications
  {
    patterns: [
      /open\s+(chrome|browser|google chrome)/i,
      /launch\s+(chrome|browser|google chrome)/i,
    ],
    handler: () => ({
      target: 'laptop',
      action: 'openApp',
      keystrokes: KeySequences.openApp('chrome'),
      description: 'Opening Google Chrome',
      ttsResponse: 'Opening Chrome on your laptop',
    }),
  },
  {
    patterns: [
      /open\s+(vs\s*code|visual\s*studio\s*code|code\s*editor)/i,
      /launch\s+(vs\s*code|visual\s*studio\s*code)/i,
    ],
    handler: () => ({
      target: 'laptop',
      action: 'openApp',
      keystrokes: KeySequences.openApp('code'),
      description: 'Opening VS Code',
      ttsResponse: 'Opening VS Code on your laptop',
    }),
  },
  {
    patterns: [
      /open\s+(notepad|text\s*editor)/i,
    ],
    handler: () => ({
      target: 'laptop',
      action: 'openApp',
      keystrokes: KeySequences.openApp('notepad'),
      description: 'Opening Notepad',
      ttsResponse: 'Opening Notepad',
    }),
  },
  {
    patterns: [
      /open\s+(file\s*explorer|explorer|my\s*computer|this\s*pc|files)/i,
    ],
    handler: () => ({
      target: 'laptop',
      action: 'openFileExplorer',
      keystrokes: KeySequences.openFileExplorer(),
      description: 'Opening File Explorer',
      ttsResponse: 'Opening File Explorer',
    }),
  },
  {
    patterns: [
      /open\s+(task\s*manager)/i,
    ],
    handler: () => ({
      target: 'laptop',
      action: 'openTaskManager',
      keystrokes: KeySequences.openTaskManager(),
      description: 'Opening Task Manager',
      ttsResponse: 'Opening Task Manager',
    }),
  },
  {
    patterns: [/^open\s+(?!https?:\/\/)(?![\w.-]+\.[a-z]{2,})(.+)/i, /^launch\s+(.+)/i, /^start\s+(.+)/i],
    handler: (match) => {
      const appName = match[1].trim().toLowerCase();
      return {
        target: 'laptop',
        action: 'openApp',
        keystrokes: KeySequences.openApp(appName),
        description: `Opening ${appName}`,
        ttsResponse: `Opening ${appName} on your laptop`,
      };
    },
  },

  // YouTube
  {
    patterns: [
      /play\s+(.+)\s+on\s+youtube/i,
      /search\s+(.+)\s+on\s+youtube/i,
      /youtube\s+(.+)/i,
    ],
    handler: (match) => ({
      target: 'laptop',
      action: 'searchYouTube',
      keystrokes: KeySequences.searchYouTube(match[1].trim()),
      description: `Searching YouTube for "${match[1].trim()}"`,
      ttsResponse: `Playing ${match[1].trim()} on YouTube`,
    }),
  },

  // Google search
  {
    patterns: [
      /(?:google|search|search\s+for|look\s+up)\s+(.+)/i,
      /search\s+(.+)\s+on\s+google/i,
    ],
    handler: (match) => ({
      target: 'laptop',
      action: 'searchGoogle',
      keystrokes: KeySequences.searchGoogle(match[1].trim()),
      description: `Searching Google for "${match[1].trim()}"`,
      ttsResponse: `Searching Google for ${match[1].trim()}`,
    }),
  },

  // Open URL
  {
    patterns: [
      /(?:go\s+to|open|visit|navigate\s+to)\s+((?:https?:\/\/)?[\w.-]+\.[a-z]{2,}[\w/.-]*)/i,
    ],
    handler: (match) => {
      let url = match[1].trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      return {
        target: 'laptop',
        action: 'openUrl',
        keystrokes: KeySequences.openUrl(url),
        description: `Opening ${url}`,
        ttsResponse: `Opening ${url}`,
      };
    },
  },

  // Window management
  {
    patterns: [/close\s+(?:this\s+)?window/i, /close\s+(?:the\s+)?app/i],
    handler: () => ({
      target: 'laptop',
      action: 'closeWindow',
      keystrokes: KeySequences.closeWindow(),
      description: 'Closing current window',
      ttsResponse: 'Closing the window',
    }),
  },
  {
    patterns: [/minimize\s+(?:all|everything|windows)/i, /show\s+desktop/i],
    handler: () => ({
      target: 'laptop',
      action: 'minimizeAll',
      keystrokes: KeySequences.minimizeAll(),
      description: 'Showing desktop',
      ttsResponse: 'Minimizing all windows',
    }),
  },
  {
    patterns: [/switch\s+(?:app|window|application)/i, /alt\s*tab/i],
    handler: () => ({
      target: 'laptop',
      action: 'switchApp',
      keystrokes: KeySequences.switchApp(),
      description: 'Switching application',
      ttsResponse: 'Switching to previous app',
    }),
  },

  // System controls
  {
    patterns: [/lock\s+(?:the\s+)?(?:laptop|computer|screen|pc)/i],
    handler: () => ({
      target: 'laptop',
      action: 'lockScreen',
      keystrokes: KeySequences.lockScreen(),
      description: 'Locking screen',
      ttsResponse: 'Locking your laptop',
    }),
  },
  {
    patterns: [/take\s+(?:a\s+)?screenshot/i, /screenshot/i, /screen\s*capture/i],
    handler: () => ({
      target: 'laptop',
      action: 'screenshot',
      keystrokes: KeySequences.screenshot(),
      description: 'Taking screenshot',
      ttsResponse: 'Screenshot taken',
    }),
  },

  // Volume
  {
    patterns: [/(?:increase|raise|turn\s+up)\s+(?:the\s+)?volume/i, /volume\s+up/i, /louder/i],
    handler: () => ({
      target: 'laptop',
      action: 'volumeUp',
      keystrokes: [
        ...KeySequences.volumeUp(),
        ...KeySequences.volumeUp(),
        ...KeySequences.volumeUp(),
      ],
      description: 'Increasing volume',
      ttsResponse: 'Volume increased',
    }),
  },
  {
    patterns: [/(?:decrease|lower|turn\s+down)\s+(?:the\s+)?volume/i, /volume\s+down/i, /quieter/i],
    handler: () => ({
      target: 'laptop',
      action: 'volumeDown',
      keystrokes: [
        ...KeySequences.volumeDown(),
        ...KeySequences.volumeDown(),
        ...KeySequences.volumeDown(),
      ],
      description: 'Decreasing volume',
      ttsResponse: 'Volume decreased',
    }),
  },
  {
    patterns: [/mute/i, /unmute/i, /toggle\s+mute/i],
    handler: () => ({
      target: 'laptop',
      action: 'mute',
      keystrokes: KeySequences.mute(),
      description: 'Toggling mute',
      ttsResponse: 'Mute toggled',
    }),
  },

  // Power
  {
    patterns: [/shut\s*down\s+(?:the\s+)?(?:laptop|computer|pc)/i, /power\s+off/i],
    handler: () => ({
      target: 'laptop',
      action: 'shutdown',
      keystrokes: KeySequences.shutdown(60),
      description: 'Shutting down in 60 seconds',
      ttsResponse: 'Your laptop will shut down in 60 seconds',
    }),
  },
  {
    patterns: [/restart\s+(?:the\s+)?(?:laptop|computer|pc)/i, /reboot/i],
    handler: () => ({
      target: 'laptop',
      action: 'restart',
      keystrokes: KeySequences.restart(60),
      description: 'Restarting in 60 seconds',
      ttsResponse: 'Your laptop will restart in 60 seconds',
    }),
  },
  {
    patterns: [/sleep\s+(?:the\s+)?(?:laptop|computer|pc)/i],
    handler: () => ({
      target: 'laptop',
      action: 'sleep',
      keystrokes: KeySequences.sleep(),
      description: 'Putting laptop to sleep',
      ttsResponse: 'Putting your laptop to sleep',
    }),
  },

  // Browser shortcuts
  {
    patterns: [/new\s+tab/i],
    handler: () => ({
      target: 'laptop',
      action: 'newTab',
      keystrokes: KeySequences.newTab(),
      description: 'Opening new tab',
      ttsResponse: 'New tab opened',
    }),
  },
  {
    patterns: [/close\s+tab/i],
    handler: () => ({
      target: 'laptop',
      action: 'closeTab',
      keystrokes: KeySequences.closeTab(),
      description: 'Closing tab',
      ttsResponse: 'Tab closed',
    }),
  },
  {
    patterns: [/refresh|reload/i],
    handler: () => ({
      target: 'laptop',
      action: 'refresh',
      keystrokes: KeySequences.refreshPage(),
      description: 'Refreshing page',
      ttsResponse: 'Page refreshed',
    }),
  },
  {
    patterns: [/full\s*screen/i],
    handler: () => ({
      target: 'laptop',
      action: 'fullscreen',
      keystrokes: KeySequences.fullscreen(),
      description: 'Toggling fullscreen',
      ttsResponse: 'Fullscreen toggled',
    }),
  },

  // Type text
  {
    patterns: [/type\s+"([^"]+)"/i, /type\s+'([^']+)'/i, /type\s+(.+)/i],
    handler: (match) => ({
      target: 'laptop',
      action: 'typeText',
      keystrokes: [{ type: 'text', text: match[1] }],
      description: `Typing "${match[1]}"`,
      ttsResponse: `Typing the text`,
    }),
  },

  // Press key combinations
  {
    patterns: [/press\s+(ctrl|control|alt|shift|win|windows)[\s+]+(.+)/i],
    handler: (match) => {
      const modStr = match[1].toLowerCase();
      const keyStr = match[2].toLowerCase().trim();
      const modifiers: import('../types').KeyModifier[] = [];
      if (modStr.includes('ctrl') || modStr.includes('control')) modifiers.push('ctrl');
      if (modStr.includes('alt')) modifiers.push('alt');
      if (modStr.includes('shift')) modifiers.push('shift');
      if (modStr.includes('win') || modStr.includes('windows')) modifiers.push('win');

      const keyCode = getKeyCodeFromName(keyStr);
      return {
        target: 'laptop',
        action: 'pressKey',
        keystrokes: [{ type: 'key', modifiers, keyCode }],
        description: `Pressing ${match[0]}`,
        ttsResponse: `Key pressed`,
      };
    },
  },
  {
    patterns: [/press\s+(enter|escape|tab|space|backspace|delete|f\d+)/i],
    handler: (match) => {
      const keyCode = getKeyCodeFromName(match[1].toLowerCase());
      return {
        target: 'laptop',
        action: 'pressKey',
        keystrokes: [{ type: 'key', keyCode }],
        description: `Pressing ${match[1]}`,
        ttsResponse: `Key pressed`,
      };
    },
  },
];

function getKeyCodeFromName(name: string): number {
  const keyMap: Record<string, number> = {
    'a': HID_KEY.A, 'b': HID_KEY.B, 'c': HID_KEY.C, 'd': HID_KEY.D,
    'e': HID_KEY.E, 'f': HID_KEY.F, 'g': HID_KEY.G, 'h': HID_KEY.H,
    'i': HID_KEY.I, 'j': HID_KEY.J, 'k': HID_KEY.K, 'l': HID_KEY.L,
    'm': HID_KEY.M, 'n': HID_KEY.N, 'o': HID_KEY.O, 'p': HID_KEY.P,
    'q': HID_KEY.Q, 'r': HID_KEY.R, 's': HID_KEY.S, 't': HID_KEY.T,
    'u': HID_KEY.U, 'v': HID_KEY.V, 'w': HID_KEY.W, 'x': HID_KEY.X,
    'y': HID_KEY.Y, 'z': HID_KEY.Z,
    'enter': HID_KEY.ENTER, 'return': HID_KEY.ENTER,
    'escape': HID_KEY.ESCAPE, 'esc': HID_KEY.ESCAPE,
    'tab': HID_KEY.TAB,
    'space': HID_KEY.SPACE,
    'backspace': HID_KEY.BACKSPACE,
    'delete': HID_KEY.DELETE,
    'up': HID_KEY.UP_ARROW, 'down': HID_KEY.DOWN_ARROW,
    'left': HID_KEY.LEFT_ARROW, 'right': HID_KEY.RIGHT_ARROW,
    'f1': HID_KEY.F1, 'f2': HID_KEY.F2, 'f3': HID_KEY.F3, 'f4': HID_KEY.F4,
    'f5': HID_KEY.F5, 'f6': HID_KEY.F6, 'f7': HID_KEY.F7, 'f8': HID_KEY.F8,
    'f9': HID_KEY.F9, 'f10': HID_KEY.F10, 'f11': HID_KEY.F11, 'f12': HID_KEY.F12,
    'home': HID_KEY.HOME, 'end': HID_KEY.END,
    'pageup': HID_KEY.PAGE_UP, 'pagedown': HID_KEY.PAGE_DOWN,
  };
  return keyMap[name] || HID_KEY.NONE;
}

export function parseCommand(voiceText: string): ParsedCommand | null {
  const trimmed = voiceText.trim();
  if (!trimmed) return null;

  for (const pattern of commandPatterns) {
    for (const regex of pattern.patterns) {
      const match = trimmed.match(regex);
      if (match) {
        return pattern.handler(match);
      }
    }
  }

  return null;
}

// AI-first command processing: On-device Qwen 2.5 → Ollama → Regex
// deviceType: 'laptop' | 'tv' | 'desktop' | 'unknown'
export async function parseCommandSmart(
  voiceText: string,
  useAI: boolean = true,
  deviceType: string = 'laptop'
): Promise<ParsedCommand | null> {
  if (useAI) {
    // Step 1: Try on-device AI first (fastest, no WiFi needed)
    try {
      const { onDeviceLLM } = require('./OnDeviceLLM');
      if (onDeviceLLM.isReady) {
        const parsed = await onDeviceLLM.parseCommand(voiceText, deviceType);
        if (parsed && parsed.action !== 'unknown') {
          const result = aiResponseToCommand(parsed, voiceText);
          if (result) {
            result.deviceType = deviceType as any;
            return result;
          }
        }
      }
    } catch { /* on-device not available, try Ollama */ }

    // Step 2: Try Ollama server (over WiFi)
    const aiResult = await parseCommandWithAI(voiceText);
    if (aiResult) return aiResult;
  }

  // Step 3: Regex fallback
  const localResult = parseCommand(voiceText);
  if (localResult) return localResult;

  return null;
}

// AI-powered command parsing via OllamaService
export async function parseCommandWithAI(
  voiceText: string,
  endpoint?: string
): Promise<ParsedCommand | null> {
  try {
    let parsed: any;

    if (endpoint) {
      // Legacy: direct endpoint call (for backwards compatibility with tests)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5',
          messages: [
            {
              role: 'system',
              content: 'You are a command parser. Convert voice commands to JSON actions. Respond with ONLY JSON.',
            },
            { role: 'user', content: voiceText },
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.message?.content || '';
      parsed = JSON.parse(content);
    } else {
      // Use OllamaService singleton
      const { ollamaService } = require('./OllamaService');
      parsed = await ollamaService.parseCommand(voiceText);
    }

    if (!parsed) return null;
    return aiResponseToCommand(parsed, voiceText);
  } catch (error) {
    console.error('AI parsing failed:', error);
    return null;
  }
}

function aiResponseToCommand(aiResult: any, originalText: string): ParsedCommand | null {
  const { action } = aiResult;

  const actionMap: Record<string, () => ParsedCommand> = {
    openApp: () => ({
      target: 'laptop',
      action: 'openApp',
      keystrokes: KeySequences.openApp(aiResult.app || ''),
      description: `Opening ${aiResult.app}`,
      ttsResponse: `Opening ${aiResult.app}`,
    }),
    openUrl: () => ({
      target: 'laptop',
      action: 'openUrl',
      keystrokes: KeySequences.openUrl(aiResult.url || ''),
      description: `Opening ${aiResult.url}`,
      ttsResponse: `Opening the website`,
    }),
    searchYouTube: () => ({
      target: 'laptop',
      action: 'searchYouTube',
      keystrokes: KeySequences.searchYouTube(aiResult.query || ''),
      description: `Searching YouTube for "${aiResult.query}"`,
      ttsResponse: `Searching YouTube for ${aiResult.query}`,
    }),
    searchGoogle: () => ({
      target: 'laptop',
      action: 'searchGoogle',
      keystrokes: KeySequences.searchGoogle(aiResult.query || ''),
      description: `Searching Google for "${aiResult.query}"`,
      ttsResponse: `Searching Google for ${aiResult.query}`,
    }),
    typeText: () => ({
      target: 'laptop',
      action: 'typeText',
      keystrokes: [{ type: 'text' as const, text: aiResult.text || '' }],
      description: `Typing text`,
      ttsResponse: `Typing the text`,
    }),
    lockScreen: () => ({
      target: 'laptop',
      action: 'lockScreen',
      keystrokes: KeySequences.lockScreen(),
      description: 'Locking screen',
      ttsResponse: 'Locking your laptop',
    }),
    screenshot: () => ({
      target: 'laptop',
      action: 'screenshot',
      keystrokes: KeySequences.screenshot(),
      description: 'Taking screenshot',
      ttsResponse: 'Screenshot taken',
    }),
    closeWindow: () => ({
      target: 'laptop',
      action: 'closeWindow',
      keystrokes: KeySequences.closeWindow(),
      description: 'Closing window',
      ttsResponse: 'Window closed',
    }),
    minimizeAll: () => ({
      target: 'laptop',
      action: 'minimizeAll',
      keystrokes: KeySequences.minimizeAll(),
      description: 'Minimizing all',
      ttsResponse: 'All windows minimized',
    }),
    switchApp: () => ({
      target: 'laptop',
      action: 'switchApp',
      keystrokes: KeySequences.switchApp(),
      description: 'Switching app',
      ttsResponse: 'Switched application',
    }),
    volumeUp: () => ({
      target: 'laptop',
      action: 'volumeUp',
      keystrokes: KeySequences.volumeUp(),
      description: 'Volume up',
      ttsResponse: 'Volume increased',
    }),
    volumeDown: () => ({
      target: 'laptop',
      action: 'volumeDown',
      keystrokes: KeySequences.volumeDown(),
      description: 'Volume down',
      ttsResponse: 'Volume decreased',
    }),
    mute: () => ({
      target: 'laptop',
      action: 'mute',
      keystrokes: KeySequences.mute(),
      description: 'Mute toggled',
      ttsResponse: 'Mute toggled',
    }),
    shutdown: () => ({
      target: 'laptop',
      action: 'shutdown',
      keystrokes: KeySequences.shutdown(),
      description: 'Shutting down',
      ttsResponse: 'Shutting down in 60 seconds',
    }),
    restart: () => ({
      target: 'laptop',
      action: 'restart',
      keystrokes: KeySequences.restart(),
      description: 'Restarting',
      ttsResponse: 'Restarting in 60 seconds',
    }),
    sleep: () => ({
      target: 'laptop',
      action: 'sleep',
      keystrokes: KeySequences.sleep(),
      description: 'Sleeping',
      ttsResponse: 'Putting laptop to sleep',
    }),
    newTab: () => ({
      target: 'laptop',
      action: 'newTab',
      keystrokes: KeySequences.newTab(),
      description: 'New tab',
      ttsResponse: 'New tab opened',
    }),
    closeTab: () => ({
      target: 'laptop',
      action: 'closeTab',
      keystrokes: KeySequences.closeTab(),
      description: 'Close tab',
      ttsResponse: 'Tab closed',
    }),
    refresh: () => ({
      target: 'laptop',
      action: 'refresh',
      keystrokes: KeySequences.refreshPage(),
      description: 'Refreshing',
      ttsResponse: 'Page refreshed',
    }),
    fullscreen: () => ({
      target: 'laptop',
      action: 'fullscreen',
      keystrokes: KeySequences.fullscreen(),
      description: 'Fullscreen',
      ttsResponse: 'Fullscreen toggled',
    }),
    pressKey: () => {
      const modifiers: import('../types').KeyModifier[] = (aiResult.modifiers || []).map(
        (m: string) => m.toLowerCase().replace('control', 'ctrl').replace('windows', 'win')
      );
      const keyCode = getKeyCodeFromName((aiResult.key || '').toLowerCase());
      const desc = [...modifiers, aiResult.key || ''].join('+');
      return {
        target: 'laptop' as const,
        action: 'pressKey',
        keystrokes: [{ type: 'key' as const, modifiers, keyCode }],
        description: `Pressing ${desc}`,
        ttsResponse: 'Key pressed',
      };
    },

    // ─── TV-specific actions ───
    tvOpenApp: () => ({
      target: 'laptop' as const,
      action: 'tvOpenApp',
      keystrokes: KeySequences.tvOpenApp(aiResult.app || ''),
      description: `Opening ${aiResult.app} on TV`,
      ttsResponse: `Opening ${aiResult.app} on your TV`,
    }),
    tvSearch: () => ({
      target: 'laptop' as const,
      action: 'tvSearch',
      keystrokes: KeySequences.tvOpenAppAndSearch(aiResult.app || '', aiResult.query || ''),
      description: `Searching "${aiResult.query}" in ${aiResult.app}`,
      ttsResponse: `Searching for ${aiResult.query} on ${aiResult.app}`,
    }),
    tvPlay: () => ({
      target: 'laptop' as const,
      action: 'tvPlay',
      keystrokes: KeySequences.tvOpenAppAndPlay(aiResult.app || '', aiResult.query || ''),
      description: `Playing "${aiResult.query}" on ${aiResult.app}`,
      ttsResponse: `Playing ${aiResult.query} on ${aiResult.app}`,
    }),
    tvHome: () => ({
      target: 'laptop' as const,
      action: 'tvHome',
      keystrokes: KeySequences.tvHome(),
      description: 'Going to TV home',
      ttsResponse: 'Going to home screen',
    }),
    tvBack: () => ({
      target: 'laptop' as const,
      action: 'tvBack',
      keystrokes: KeySequences.tvBack(),
      description: 'Going back',
      ttsResponse: 'Going back',
    }),
    tvSelect: () => ({
      target: 'laptop' as const,
      action: 'tvSelect',
      keystrokes: KeySequences.tvSelect(),
      description: 'Selecting',
      ttsResponse: 'Selected',
    }),
    tvNavigate: () => {
      const dir = (aiResult.direction || 'down').toLowerCase();
      const seqMap: Record<string, () => import('../types').KeyAction[]> = {
        up: KeySequences.tvUp,
        down: KeySequences.tvDown,
        left: KeySequences.tvLeft,
        right: KeySequences.tvRight,
      };
      return {
        target: 'laptop' as const,
        action: 'tvNavigate',
        keystrokes: (seqMap[dir] || KeySequences.tvDown)(),
        description: `Moving ${dir}`,
        ttsResponse: `Moving ${dir}`,
      };
    },

    // ─── Phone self-control actions ───
    phoneOpenApp: () => ({
      target: 'phone' as const,
      action: 'phoneOpenApp',
      keystrokes: [],
      description: `Opening ${aiResult.app} on phone`,
      ttsResponse: `Opening ${aiResult.app}`,
    }),
    phoneCall: () => ({
      target: 'phone' as const,
      action: 'phoneCall',
      keystrokes: [],
      description: `Calling ${aiResult.number}`,
      ttsResponse: `Calling ${aiResult.number}`,
    }),
    phoneSMS: () => ({
      target: 'phone' as const,
      action: 'phoneSMS',
      keystrokes: [],
      description: `Sending message to ${aiResult.number}`,
      ttsResponse: `Sending message`,
    }),
    phoneAlarm: () => {
      const h = aiResult.hour ?? 7;
      const m = aiResult.minute ?? 0;
      return {
        target: 'phone' as const,
        action: 'phoneAlarm',
        keystrokes: [],
        description: `Setting alarm for ${h}:${String(m).padStart(2, '0')}`,
        ttsResponse: `Alarm set for ${h}:${String(m).padStart(2, '0')}`,
      };
    },
    phoneTimer: () => {
      const secs = aiResult.seconds ?? 300;
      const mins = Math.floor(secs / 60);
      return {
        target: 'phone' as const,
        action: 'phoneTimer',
        keystrokes: [],
        description: `Timer set for ${mins} minute${mins !== 1 ? 's' : ''}`,
        ttsResponse: `Timer set for ${mins} minute${mins !== 1 ? 's' : ''}`,
      };
    },
    phoneCamera: () => ({
      target: 'phone' as const,
      action: 'phoneCamera',
      keystrokes: [],
      description: 'Opening camera',
      ttsResponse: 'Opening camera',
    }),
    phoneFlashlight: () => ({
      target: 'phone' as const,
      action: 'phoneFlashlight',
      keystrokes: [],
      description: `Flashlight ${aiResult.state || 'toggle'}`,
      ttsResponse: `Flashlight ${aiResult.state || 'toggled'}`,
    }),
    phoneVolume: () => ({
      target: 'phone' as const,
      action: 'phoneVolume',
      keystrokes: [],
      description: `Volume ${aiResult.direction}`,
      ttsResponse: `Volume ${aiResult.direction}`,
    }),
    phoneUrl: () => ({
      target: 'phone' as const,
      action: 'phoneUrl',
      keystrokes: [],
      description: `Opening ${aiResult.url}`,
      ttsResponse: `Opening ${aiResult.url}`,
    }),
    phoneSearch: () => ({
      target: 'phone' as const,
      action: 'phoneSearch',
      keystrokes: [],
      description: `Searching: ${aiResult.query}`,
      ttsResponse: `Searching for ${aiResult.query}`,
    }),
    phoneSettings: () => ({
      target: 'phone' as const,
      action: 'phoneSettings',
      keystrokes: [],
      description: `Opening ${aiResult.section || ''} settings`,
      ttsResponse: `Opening settings`,
    }),
    phoneShare: () => ({
      target: 'phone' as const,
      action: 'phoneShare',
      keystrokes: [],
      description: 'Sharing text',
      ttsResponse: 'Sharing',
    }),
    phoneBrightness: () => ({
      target: 'phone' as const,
      action: 'phoneBrightness',
      keystrokes: [],
      description: `Brightness ${aiResult.level}`,
      ttsResponse: `Brightness ${aiResult.level}`,
    }),
  };

  const handler = actionMap[action];
  if (handler) {
    const result = handler();
    // Attach AI params for phone commands (PhoneCommands.execute needs them)
    if (result.target === 'phone') {
      result.params = { ...aiResult };
    }
    return result;
  }

  return null;
}
