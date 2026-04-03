import { KeySequences } from '../../services/KeyboardMapper';
import { HID_KEY } from '../../constants/keycodes';
import { KeyAction } from '../../types';

// Helper to extract all key actions from a sequence
function getKeyActions(actions: KeyAction[]) {
  return actions.filter(a => a.type === 'key');
}
function getTextActions(actions: KeyAction[]) {
  return actions.filter(a => a.type === 'text');
}
function getDelayActions(actions: KeyAction[]) {
  return actions.filter(a => a.type === 'delay');
}

describe('KeySequences', () => {
  // ─── openRun ───

  describe('openRun()', () => {
    it('should produce Win+R then delay', () => {
      const actions = KeySequences.openRun();
      expect(actions.length).toBe(2);
      expect(actions[0].type).toBe('key');
      expect(actions[0].modifiers).toContain('win');
      expect(actions[0].keyCode).toBe(HID_KEY.R);
      expect(actions[1].type).toBe('delay');
      expect(actions[1].delayMs).toBe(800);
    });
  });

  // ─── openApp ───

  describe('openApp()', () => {
    it('should produce Win+R → type appname → Enter → delay', () => {
      const actions = KeySequences.openApp('chrome');
      // openRun (2) + text (1) + delay (1) + enter (1) + delay (1) = 6
      expect(actions.length).toBe(6);
      const texts = getTextActions(actions);
      expect(texts.length).toBe(1);
      expect(texts[0].text).toBe('chrome');
      // Last key should be Enter
      const keys = getKeyActions(actions);
      const enterKey = keys.find(k => k.keyCode === HID_KEY.ENTER);
      expect(enterKey).toBeDefined();
    });

    it('should work with any app name', () => {
      const actions = KeySequences.openApp('notepad');
      const texts = getTextActions(actions);
      expect(texts[0].text).toBe('notepad');
    });
  });

  // ─── openUrl ───

  describe('openUrl()', () => {
    it('should open chrome then navigate to URL', () => {
      const actions = KeySequences.openUrl('https://github.com');
      const texts = getTextActions(actions);
      // Should contain 'chrome' (from openApp) and the URL
      expect(texts.some(t => t.text === 'chrome')).toBe(true);
      expect(texts.some(t => t.text === 'https://github.com')).toBe(true);
      // Should contain Ctrl+L for address bar
      const keys = getKeyActions(actions);
      const ctrlL = keys.find(k => k.modifiers?.includes('ctrl') && k.keyCode === HID_KEY.L);
      expect(ctrlL).toBeDefined();
    });
  });

  // ─── searchYouTube ───

  describe('searchYouTube()', () => {
    it('should open youtube.com then search', () => {
      const actions = KeySequences.searchYouTube('lofi music');
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'youtube.com')).toBe(true);
      expect(texts.some(t => t.text === 'lofi music')).toBe(true);
      // Should have Tab keys to reach search bar
      const tabs = getKeyActions(actions).filter(k => k.keyCode === HID_KEY.TAB);
      expect(tabs.length).toBe(3);
    });
  });

  // ─── searchGoogle ───

  describe('searchGoogle()', () => {
    it('should open google.com then type query', () => {
      const actions = KeySequences.searchGoogle('weather');
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'google.com')).toBe(true);
      expect(texts.some(t => t.text === 'weather')).toBe(true);
    });
  });

  // ─── Single Key Sequences ───

  describe('single key sequences', () => {
    it('lockScreen → Win+L', () => {
      const actions = KeySequences.lockScreen();
      expect(actions.length).toBe(1);
      expect(actions[0].modifiers).toContain('win');
      expect(actions[0].keyCode).toBe(HID_KEY.L);
    });

    it('closeWindow → Alt+F4', () => {
      const actions = KeySequences.closeWindow();
      expect(actions.length).toBe(1);
      expect(actions[0].modifiers).toContain('alt');
      expect(actions[0].keyCode).toBe(HID_KEY.F4);
    });

    it('minimizeAll → Win+D', () => {
      const actions = KeySequences.minimizeAll();
      expect(actions.length).toBe(1);
      expect(actions[0].modifiers).toContain('win');
      expect(actions[0].keyCode).toBe(HID_KEY.D);
    });

    it('switchApp → Alt+Tab', () => {
      const actions = KeySequences.switchApp();
      expect(actions.length).toBe(1);
      expect(actions[0].modifiers).toContain('alt');
      expect(actions[0].keyCode).toBe(HID_KEY.TAB);
    });

    it('screenshot → Win+PrintScreen', () => {
      const actions = KeySequences.screenshot();
      expect(actions.length).toBe(1);
      expect(actions[0].modifiers).toContain('win');
      expect(actions[0].keyCode).toBe(HID_KEY.PRINT_SCREEN);
    });

    it('openTaskManager → Ctrl+Shift+Esc', () => {
      const actions = KeySequences.openTaskManager();
      expect(actions.length).toBe(1);
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].modifiers).toContain('shift');
      expect(actions[0].keyCode).toBe(HID_KEY.ESCAPE);
    });

    it('openFileExplorer → Win+E', () => {
      const actions = KeySequences.openFileExplorer();
      expect(actions.length).toBe(1);
      expect(actions[0].modifiers).toContain('win');
      expect(actions[0].keyCode).toBe(HID_KEY.E);
    });
  });

  // ─── Media Keys ───

  describe('media keys', () => {
    it('volumeUp → VOLUME_UP key', () => {
      const actions = KeySequences.volumeUp();
      expect(actions.length).toBe(1);
      expect(actions[0].keyCode).toBe(HID_KEY.VOLUME_UP);
    });

    it('volumeDown → VOLUME_DOWN key', () => {
      const actions = KeySequences.volumeDown();
      expect(actions.length).toBe(1);
      expect(actions[0].keyCode).toBe(HID_KEY.VOLUME_DOWN);
    });

    it('mute → MUTE key', () => {
      const actions = KeySequences.mute();
      expect(actions.length).toBe(1);
      expect(actions[0].keyCode).toBe(HID_KEY.MUTE);
    });

    it('playPause → SPACE key', () => {
      const actions = KeySequences.playPause();
      expect(actions.length).toBe(1);
      expect(actions[0].keyCode).toBe(HID_KEY.SPACE);
    });
  });

  // ─── Power Commands ───

  describe('power commands', () => {
    it('shutdown → openRun + shutdown /s /t 60 + Enter', () => {
      const actions = KeySequences.shutdown(60);
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'shutdown /s /t 60')).toBe(true);
    });

    it('shutdown with custom timeout', () => {
      const actions = KeySequences.shutdown(120);
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'shutdown /s /t 120')).toBe(true);
    });

    it('restart → openRun + shutdown /r /t 60 + Enter', () => {
      const actions = KeySequences.restart(60);
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'shutdown /r /t 60')).toBe(true);
    });

    it('sleep → openRun + rundll32 command + Enter', () => {
      const actions = KeySequences.sleep();
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text!.includes('powrprof.dll'))).toBe(true);
    });
  });

  // ─── Edit Shortcuts ───

  describe('edit shortcuts', () => {
    it('undo → Ctrl+Z', () => {
      const actions = KeySequences.undo();
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].keyCode).toBe(HID_KEY.Z);
    });

    it('redo → Ctrl+Y', () => {
      const actions = KeySequences.redo();
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].keyCode).toBe(HID_KEY.Y);
    });

    it('copy → Ctrl+C', () => {
      const actions = KeySequences.copy();
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].keyCode).toBe(HID_KEY.C);
    });

    it('paste → Ctrl+V', () => {
      const actions = KeySequences.paste();
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].keyCode).toBe(HID_KEY.V);
    });

    it('selectAll → Ctrl+A', () => {
      const actions = KeySequences.selectAll();
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].keyCode).toBe(HID_KEY.A);
    });
  });

  // ─── Browser Shortcuts ───

  describe('browser shortcuts', () => {
    it('newTab → Ctrl+T', () => {
      const actions = KeySequences.newTab();
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].keyCode).toBe(HID_KEY.T);
    });

    it('closeTab → Ctrl+W', () => {
      const actions = KeySequences.closeTab();
      expect(actions[0].modifiers).toContain('ctrl');
      expect(actions[0].keyCode).toBe(HID_KEY.W);
    });

    it('refreshPage → F5', () => {
      const actions = KeySequences.refreshPage();
      expect(actions[0].keyCode).toBe(HID_KEY.F5);
    });

    it('fullscreen → F11', () => {
      const actions = KeySequences.fullscreen();
      expect(actions[0].keyCode).toBe(HID_KEY.F11);
    });
  });

  // ─── TV Navigation ───

  describe('TV navigation sequences', () => {
    it('tvHome → Home key + delay', () => {
      const actions = KeySequences.tvHome();
      expect(actions.length).toBe(2);
      expect(actions[0].keyCode).toBe(HID_KEY.HOME);
      expect(actions[1].type).toBe('delay');
    });

    it('tvBack → Escape key', () => {
      const actions = KeySequences.tvBack();
      expect(actions[0].keyCode).toBe(HID_KEY.ESCAPE);
    });

    it('tvSelect → Enter key', () => {
      const actions = KeySequences.tvSelect();
      expect(actions[0].keyCode).toBe(HID_KEY.ENTER);
    });

    it('tvUp → Up Arrow', () => {
      expect(KeySequences.tvUp()[0].keyCode).toBe(HID_KEY.UP_ARROW);
    });

    it('tvDown → Down Arrow', () => {
      expect(KeySequences.tvDown()[0].keyCode).toBe(HID_KEY.DOWN_ARROW);
    });

    it('tvLeft → Left Arrow', () => {
      expect(KeySequences.tvLeft()[0].keyCode).toBe(HID_KEY.LEFT_ARROW);
    });

    it('tvRight → Right Arrow', () => {
      expect(KeySequences.tvRight()[0].keyCode).toBe(HID_KEY.RIGHT_ARROW);
    });
  });

  // ─── TV App Sequences ───

  describe('TV app sequences', () => {
    it('tvOpenApp should contain Home + navigation + text + Enter', () => {
      const actions = KeySequences.tvOpenApp('hotstar');
      expect(actions.length).toBeGreaterThan(5);
      // Should start with Home
      expect(actions[0].keyCode).toBe(HID_KEY.HOME);
      // Should contain the app name as text
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'hotstar')).toBe(true);
    });

    it('tvSearchInApp should type query and select result', () => {
      const actions = KeySequences.tvSearchInApp('karthika deepam');
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'karthika deepam')).toBe(true);
      // Should have Enter keys
      const keys = getKeyActions(actions);
      expect(keys.some(k => k.keyCode === HID_KEY.ENTER)).toBe(true);
    });

    it('tvOpenAppAndSearch combines open + search', () => {
      const actions = KeySequences.tvOpenAppAndSearch('netflix', 'money heist');
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'netflix')).toBe(true);
      expect(texts.some(t => t.text === 'money heist')).toBe(true);
    });

    it('tvOpenAppAndPlay combines open + search + play', () => {
      const actions = KeySequences.tvOpenAppAndPlay('hotstar', 'karthika deepam');
      const texts = getTextActions(actions);
      expect(texts.some(t => t.text === 'hotstar')).toBe(true);
      expect(texts.some(t => t.text === 'karthika deepam')).toBe(true);
      // Should end with Enter (play)
      const lastKey = getKeyActions(actions).pop();
      expect(lastKey!.keyCode).toBe(HID_KEY.ENTER);
    });
  });

  // ─── All Sequences Return Valid KeyAction[] ───

  describe('all sequences return valid KeyAction arrays', () => {
    const allSequences = [
      'openRun', 'lockScreen', 'closeWindow', 'minimizeAll', 'switchApp',
      'screenshot', 'openTaskManager', 'openFileExplorer',
      'volumeUp', 'volumeDown', 'mute', 'playPause',
      'undo', 'redo', 'copy', 'paste', 'selectAll',
      'newTab', 'closeTab', 'refreshPage', 'fullscreen',
      'tvHome', 'tvBack', 'tvSelect', 'tvUp', 'tvDown', 'tvLeft', 'tvRight',
    ] as const;

    it.each(allSequences)('%s() returns non-empty KeyAction array', (name) => {
      const fn = (KeySequences as any)[name];
      const result = fn();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      for (const action of result) {
        expect(['key', 'text', 'delay', 'mouse']).toContain(action.type);
      }
    });
  });
});
