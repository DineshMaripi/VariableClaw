import { parseCommand, parseCommandWithAI, parseCommandSmart } from '../../services/CommandRouter';
import { HID_KEY } from '../../constants/keycodes';

describe('CommandRouter — parseCommand()', () => {
  // ─── Open Applications ───

  describe('open application commands', () => {
    it.each([
      ['open chrome', 'Opening Google Chrome', 'chrome'],
      ['launch chrome', 'Opening Google Chrome', 'chrome'],
      ['open browser', 'Opening Google Chrome', 'chrome'],
      ['open google chrome', 'Opening Google Chrome', 'chrome'],
    ])('"%s" → %s', (input, expectedDesc) => {
      const result = parseCommand(input);
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openApp');
      expect(result!.description).toBe(expectedDesc);
      expect(result!.target).toBe('laptop');
      expect(result!.ttsResponse).toContain('Chrome');
    });

    it('should open VS Code', () => {
      const result = parseCommand('open vs code');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openApp');
      expect(result!.description).toBe('Opening VS Code');
    });

    it('should open visual studio code', () => {
      const result = parseCommand('launch visual studio code');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openApp');
    });

    it('should open notepad', () => {
      const result = parseCommand('open notepad');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openApp');
      expect(result!.description).toBe('Opening Notepad');
    });

    it('should open file explorer', () => {
      const result = parseCommand('open file explorer');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openFileExplorer');
    });

    it('should open task manager', () => {
      const result = parseCommand('open task manager');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openTaskManager');
    });

    it('should open any generic app via fallback', () => {
      const result = parseCommand('open spotify');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openApp');
      expect(result!.description).toBe('Opening spotify');
    });

    it('should handle "start" keyword', () => {
      const result = parseCommand('start discord');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openApp');
      expect(result!.description).toBe('Opening discord');
    });
  });

  // ─── YouTube ───

  describe('YouTube commands', () => {
    it('should search YouTube for a song', () => {
      const result = parseCommand('play Arijit Singh on YouTube');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('searchYouTube');
      expect(result!.description).toContain('Arijit Singh');
      expect(result!.ttsResponse).toContain('Arijit Singh');
    });

    it('should handle "search X on youtube"', () => {
      const result = parseCommand('search lofi beats on youtube');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('searchYouTube');
      expect(result!.description).toContain('lofi beats');
    });

    it('should handle "youtube X" shorthand', () => {
      const result = parseCommand('youtube funny cats');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('searchYouTube');
      expect(result!.description).toContain('funny cats');
    });

    it('should generate correct keystroke sequence for YouTube', () => {
      const result = parseCommand('play lofi on youtube');
      expect(result).not.toBeNull();
      // Should contain: openApp(chrome) → openUrl(youtube.com) → tabs → type query → enter
      const types = result!.keystrokes.map(k => k.type);
      expect(types).toContain('key');
      expect(types).toContain('text');
      expect(types).toContain('delay');
    });
  });

  // ─── Google Search ───

  describe('Google search commands', () => {
    it('should search Google', () => {
      const result = parseCommand('search weather today on Google');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('searchGoogle');
    });

    it('should handle "google X"', () => {
      const result = parseCommand('google how to cook biryani');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('searchGoogle');
      expect(result!.description).toContain('how to cook biryani');
    });

    it('should handle "look up X"', () => {
      const result = parseCommand('look up best restaurants near me');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('searchGoogle');
    });

    it('should handle "search for X"', () => {
      const result = parseCommand('search for nodejs tutorial');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('searchGoogle');
    });
  });

  // ─── URL Navigation ───

  describe('URL navigation commands', () => {
    it('should open a URL with domain', () => {
      const result = parseCommand('go to github.com');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openUrl');
      expect(result!.description).toContain('https://github.com');
    });

    it('should handle "visit" keyword', () => {
      const result = parseCommand('visit stackoverflow.com');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openUrl');
    });

    it('should handle "navigate to" keyword', () => {
      const result = parseCommand('navigate to docs.google.com');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openUrl');
    });

    it('should preserve https:// prefix', () => {
      const result = parseCommand('open https://example.com');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openUrl');
      expect(result!.description).toContain('https://example.com');
    });
  });

  // ─── Window Management ───

  describe('window management commands', () => {
    it('should close window', () => {
      const result = parseCommand('close window');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('closeWindow');
      // Should produce Alt+F4
      const keyAction = result!.keystrokes.find(k => k.type === 'key');
      expect(keyAction).toBeDefined();
      expect(keyAction!.modifiers).toContain('alt');
      expect(keyAction!.keyCode).toBe(HID_KEY.F4);
    });

    it('should close "this window"', () => {
      const result = parseCommand('close this window');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('closeWindow');
    });

    it('should minimize all', () => {
      const result = parseCommand('minimize all');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('minimizeAll');
    });

    it('should handle "show desktop"', () => {
      const result = parseCommand('show desktop');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('minimizeAll');
    });

    it('should switch app', () => {
      const result = parseCommand('switch app');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('switchApp');
    });

    it('should handle "alt tab"', () => {
      const result = parseCommand('alt tab');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('switchApp');
    });
  });

  // ─── System Controls ───

  describe('system controls', () => {
    it('should lock laptop', () => {
      const result = parseCommand('lock the laptop');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('lockScreen');
      const keyAction = result!.keystrokes[0];
      expect(keyAction.modifiers).toContain('win');
      expect(keyAction.keyCode).toBe(HID_KEY.L);
    });

    it('should lock computer', () => {
      expect(parseCommand('lock computer')!.action).toBe('lockScreen');
    });

    it('should lock screen', () => {
      expect(parseCommand('lock screen')!.action).toBe('lockScreen');
    });

    it('should take screenshot', () => {
      const result = parseCommand('take a screenshot');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('screenshot');
    });

    it('should handle "screenshot" alone', () => {
      expect(parseCommand('screenshot')!.action).toBe('screenshot');
    });

    it('should handle "screen capture"', () => {
      expect(parseCommand('screen capture')!.action).toBe('screenshot');
    });
  });

  // ─── Volume Controls ───

  describe('volume controls', () => {
    it('should increase volume', () => {
      const result = parseCommand('volume up');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('volumeUp');
      // Should send 3 volume up keys
      const volumeKeys = result!.keystrokes.filter(k => k.type === 'key' && k.keyCode === HID_KEY.VOLUME_UP);
      expect(volumeKeys.length).toBe(3);
    });

    it('should handle "increase the volume"', () => {
      expect(parseCommand('increase the volume')!.action).toBe('volumeUp');
    });

    it('should handle "louder"', () => {
      expect(parseCommand('louder')!.action).toBe('volumeUp');
    });

    it('should decrease volume', () => {
      const result = parseCommand('volume down');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('volumeDown');
    });

    it('should handle "lower the volume"', () => {
      expect(parseCommand('lower the volume')!.action).toBe('volumeDown');
    });

    it('should handle "quieter"', () => {
      expect(parseCommand('quieter')!.action).toBe('volumeDown');
    });

    it('should toggle mute', () => {
      const result = parseCommand('mute');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('mute');
    });

    it('should handle "unmute"', () => {
      expect(parseCommand('unmute')!.action).toBe('mute');
    });
  });

  // ─── Power Commands ───

  describe('power commands', () => {
    it('should shutdown laptop', () => {
      const result = parseCommand('shutdown the laptop');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('shutdown');
      expect(result!.ttsResponse).toContain('60 seconds');
    });

    it('should handle "power off"', () => {
      expect(parseCommand('power off')!.action).toBe('shutdown');
    });

    it('should restart computer', () => {
      const result = parseCommand('restart the computer');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('restart');
    });

    it('should handle "reboot"', () => {
      expect(parseCommand('reboot')!.action).toBe('restart');
    });

    it('should sleep the laptop', () => {
      const result = parseCommand('sleep the laptop');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('sleep');
    });
  });

  // ─── Browser Shortcuts ───

  describe('browser shortcuts', () => {
    it('should open new tab', () => {
      const result = parseCommand('new tab');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('newTab');
    });

    it('should close tab', () => {
      const result = parseCommand('close tab');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('closeTab');
    });

    it('should refresh page', () => {
      expect(parseCommand('refresh')!.action).toBe('refresh');
      expect(parseCommand('reload')!.action).toBe('refresh');
    });

    it('should toggle fullscreen', () => {
      expect(parseCommand('fullscreen')!.action).toBe('fullscreen');
      expect(parseCommand('full screen')!.action).toBe('fullscreen');
    });
  });

  // ─── Type Text ───

  describe('type text commands', () => {
    it('should type quoted text', () => {
      const result = parseCommand('type "hello world"');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('typeText');
      expect(result!.keystrokes[0].text).toBe('hello world');
    });

    it('should type single-quoted text', () => {
      const result = parseCommand("type 'test message'");
      expect(result).not.toBeNull();
      expect(result!.keystrokes[0].text).toBe('test message');
    });

    it('should type unquoted text', () => {
      const result = parseCommand('type hello world');
      expect(result).not.toBeNull();
      expect(result!.keystrokes[0].text).toBe('hello world');
    });
  });

  // ─── Key Combinations ───

  describe('key combination commands', () => {
    it('should press ctrl+c', () => {
      const result = parseCommand('press ctrl c');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('pressKey');
      expect(result!.keystrokes[0].modifiers).toContain('ctrl');
      expect(result!.keystrokes[0].keyCode).toBe(HID_KEY.C);
    });

    it('should press alt+f4', () => {
      const result = parseCommand('press alt f4');
      expect(result).not.toBeNull();
      expect(result!.keystrokes[0].modifiers).toContain('alt');
      expect(result!.keystrokes[0].keyCode).toBe(HID_KEY.F4);
    });

    it('should press enter alone', () => {
      const result = parseCommand('press enter');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('pressKey');
      expect(result!.keystrokes[0].keyCode).toBe(HID_KEY.ENTER);
    });

    it('should press escape', () => {
      expect(parseCommand('press escape')!.keystrokes[0].keyCode).toBe(HID_KEY.ESCAPE);
    });

    it('should press tab', () => {
      expect(parseCommand('press tab')!.keystrokes[0].keyCode).toBe(HID_KEY.TAB);
    });

    it('should press F11', () => {
      expect(parseCommand('press f11')!.keystrokes[0].keyCode).toBe(HID_KEY.F11);
    });
  });

  // ─── Edge Cases ───

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      expect(parseCommand('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(parseCommand('   ')).toBeNull();
    });

    it('should return null for unrecognized commands', () => {
      expect(parseCommand('make me a sandwich')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(parseCommand('OPEN CHROME')).not.toBeNull();
      expect(parseCommand('Open Chrome')).not.toBeNull();
      expect(parseCommand('oPeN cHrOmE')).not.toBeNull();
    });

    it('should handle leading/trailing whitespace', () => {
      const result = parseCommand('  open chrome  ');
      expect(result).not.toBeNull();
      expect(result!.action).toBe('openApp');
    });

    it('all parsed commands have required fields', () => {
      const commands = [
        'open chrome', 'play test on youtube', 'google test',
        'lock the laptop', 'volume up', 'mute', 'new tab',
        'close window', 'take a screenshot', 'type hello',
      ];
      for (const cmd of commands) {
        const result = parseCommand(cmd);
        expect(result).not.toBeNull();
        expect(result!.target).toBeDefined();
        expect(result!.action).toBeDefined();
        expect(result!.keystrokes).toBeDefined();
        expect(Array.isArray(result!.keystrokes)).toBe(true);
        expect(result!.keystrokes.length).toBeGreaterThan(0);
        expect(result!.description).toBeDefined();
        expect(result!.ttsResponse).toBeDefined();
      }
    });
  });
});

describe('CommandRouter — parseCommandWithAI()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).fetch = jest.fn();
  });

  it('should use local parsing first before AI via parseCommandSmart', async () => {
    const result = await parseCommandSmart('open chrome', true);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('openApp');
    // fetch should NOT be called since local regex matched
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  it('should return null if no endpoint and no local match', async () => {
    const result = await parseCommandWithAI('make me a sandwich');
    expect(result).toBeNull();
  });

  it('should call AI endpoint for unrecognized commands', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({ action: 'openApp', app: 'spotify' }),
          },
        }],
      }),
    });

    const result = await parseCommandWithAI('please play some music for me', 'http://localhost:11434/v1/chat/completions');
    expect((globalThis as any).fetch).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.action).toBe('openApp');
  });

  it('should handle AI response for searchYouTube', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({ action: 'searchYouTube', query: 'lofi beats' }),
          },
        }],
      }),
    });

    const result = await parseCommandWithAI('put on some chill music', 'http://localhost:11434/v1/chat/completions');
    expect(result).not.toBeNull();
    expect(result!.action).toBe('searchYouTube');
  });

  it('should handle AI response for lockScreen', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({ action: 'lockScreen' }),
          },
        }],
      }),
    });

    const result = await parseCommandWithAI('secure my computer', 'http://localhost:11434/v1/chat/completions');
    expect(result).not.toBeNull();
    expect(result!.action).toBe('lockScreen');
  });

  it('should return null for unknown AI action', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({ action: 'unknown', text: 'nonsense' }),
          },
        }],
      }),
    });

    const result = await parseCommandWithAI('do something weird', 'http://localhost:11434/v1/chat/completions');
    expect(result).toBeNull();
  });

  it('should return null when AI fetch throws', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const result = await parseCommandWithAI('unknown command', 'http://localhost:11434/v1/chat/completions');
    expect(result).toBeNull();
  });

  it('should handle AI response with Ollama format (message.content)', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        message: {
          content: JSON.stringify({ action: 'volumeUp' }),
        },
      }),
    });

    const result = await parseCommandWithAI('turn it up', 'http://localhost:11434/v1/chat/completions');
    expect(result).not.toBeNull();
    expect(result!.action).toBe('volumeUp');
  });
});

describe('CommandRouter — parseCommandSmart() device routing', () => {
  it('should route laptop commands via AI', async () => {
    const result = await parseCommandSmart('open chrome', true, 'laptop');
    expect(result).not.toBeNull();
    // AI or regex should handle this
    expect(result!.action).toBeDefined();
  });

  it('should route TV commands via AI', async () => {
    const result = await parseCommandSmart('open hotstar', true, 'tv');
    expect(result).not.toBeNull();
    expect(result!.action).toBe('tvOpenApp');
  });

  it('should route phone commands via AI', async () => {
    const result = await parseCommandSmart('open whatsapp', true, 'phone');
    expect(result).not.toBeNull();
    expect(result!.action).toBe('phoneOpenApp');
    expect(result!.target).toBe('phone');
  });

  it('should ask device type for unknown devices', async () => {
    const result = await parseCommandSmart('open something', true, 'unknown');
    expect(result).not.toBeNull();
    expect(result!.action).toBe('askDeviceType');
  });

  it('phone commands should have params', async () => {
    const result = await parseCommandSmart('open instagram', true, 'phone');
    expect(result).not.toBeNull();
    expect(result!.params).toBeDefined();
    expect(result!.params!.app).toBe('instagram');
  });

  it('TV play should have app and query in keystrokes', async () => {
    const result = await parseCommandSmart('play karthika deepam on hotstar', true, 'tv');
    expect(result).not.toBeNull();
    expect(result!.action).toBe('tvPlay');
    expect(result!.keystrokes.length).toBeGreaterThan(0);
  });

  it('phone commands should have empty keystrokes', async () => {
    const result = await parseCommandSmart('open camera', true, 'phone');
    expect(result).not.toBeNull();
    expect(result!.keystrokes).toEqual([]);
  });

  it('should fall back to regex when AI not available', async () => {
    const result = await parseCommandSmart('open chrome', false);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('openApp');
  });
});
