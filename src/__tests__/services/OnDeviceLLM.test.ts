import { onDeviceLLM } from '../../services/OnDeviceLLM';

// Access private mockInference via any cast
const llm = onDeviceLLM as any;

describe('OnDeviceLLM — Mock Inference', () => {
  // Helper: parse mock result
  function mockParse(text: string, deviceType: string = 'laptop'): any {
    const response = llm.mockInference(text, deviceType);
    return JSON.parse(response);
  }

  // ─── LAPTOP commands ───

  describe('Laptop device type', () => {
    it('should handle "open chrome"', () => {
      const r = mockParse('open chrome', 'laptop');
      expect(r.action).toBe('openApp');
      expect(r.app).toBe('chrome');
    });

    it('should handle "can you open my browser"', () => {
      const r = mockParse('can you open my browser please', 'laptop');
      expect(r.action).toBe('openApp');
    });

    it('should handle "play arijit singh on youtube"', () => {
      const r = mockParse('play arijit singh on youtube', 'laptop');
      expect(r.action).toBe('searchYouTube');
      expect(r.query).toContain('arijit singh');
    });

    it('should handle "put on some music"', () => {
      const r = mockParse('put on some music', 'laptop');
      expect(r.action).toBe('searchYouTube');
    });

    it('should handle "find me a biryani recipe"', () => {
      const r = mockParse('find me a biryani recipe', 'laptop');
      expect(r.action).toBe('searchGoogle');
      expect(r.query).toContain('biryani');
    });

    it('should handle "make it louder"', () => {
      expect(mockParse('make it louder', 'laptop').action).toBe('volumeUp');
    });

    it('should handle "turn down the volume"', () => {
      expect(mockParse('turn down the volume', 'laptop').action).toBe('volumeDown');
    });

    it('should handle "silence it"', () => {
      expect(mockParse('mute', 'laptop').action).toBe('mute');
    });

    it('should handle "I\'m leaving"', () => {
      expect(mockParse("I'm leaving the room", 'laptop').action).toBe('lockScreen');
    });

    it('should handle "capture screen"', () => {
      expect(mockParse('take a screenshot', 'laptop').action).toBe('screenshot');
    });

    it('should handle "get rid of this"', () => {
      expect(mockParse('get rid of this window', 'laptop').action).toBe('closeWindow');
    });

    it('should handle "show desktop"', () => {
      expect(mockParse('show me the desktop', 'laptop').action).toBe('minimizeAll');
    });

    it('should handle "go back to previous app"', () => {
      expect(mockParse('switch to previous app', 'laptop').action).toBe('switchApp');
    });

    it('should handle "shut down the computer"', () => {
      expect(mockParse('shutdown the computer', 'laptop').action).toBe('shutdown');
    });

    it('should handle "restart"', () => {
      expect(mockParse('restart the computer', 'laptop').action).toBe('restart');
    });

    it('should handle "sleep"', () => {
      expect(mockParse('put it to sleep', 'laptop').action).toBe('sleep');
    });

    it('should handle "undo"', () => {
      const r = mockParse('undo that', 'laptop');
      expect(r.action).toBe('pressKey');
      expect(r.key).toBe('z');
      expect(r.modifiers).toContain('ctrl');
    });

    it('should handle "copy this"', () => {
      const r = mockParse('copy this', 'laptop');
      expect(r.action).toBe('pressKey');
      expect(r.key).toBe('c');
    });

    it('should handle "paste"', () => {
      const r = mockParse('paste it', 'laptop');
      expect(r.action).toBe('pressKey');
      expect(r.key).toBe('v');
    });

    it('should handle "save this"', () => {
      const r = mockParse('save this file', 'laptop');
      expect(r.action).toBe('pressKey');
      expect(r.key).toBe('s');
    });

    it('should handle "select all"', () => {
      const r = mockParse('select everything', 'laptop');
      expect(r.action).toBe('pressKey');
      expect(r.key).toBe('a');
    });

    it('should handle "new tab"', () => {
      expect(mockParse('open a new tab', 'laptop').action).toBe('newTab');
    });

    it('should handle "close tab"', () => {
      expect(mockParse('close tab', 'laptop').action).toBe('closeTab');
    });

    it('should handle "refresh"', () => {
      expect(mockParse('refresh the page', 'laptop').action).toBe('refresh');
    });

    it('should handle "fullscreen"', () => {
      expect(mockParse('make it full screen', 'laptop').action).toBe('fullscreen');
    });

    it('should handle app names: notepad', () => {
      expect(mockParse('open notepad', 'laptop').app).toBe('notepad');
    });

    it('should handle app names: vs code', () => {
      expect(mockParse('open vs code', 'laptop').app).toBe('code');
    });

    it('should handle app names: calculator', () => {
      expect(mockParse('open calculator', 'laptop').app).toBe('calc');
    });

    it('should handle app names: spotify', () => {
      expect(mockParse('open spotify', 'laptop').app).toBe('spotify');
    });

    it('should handle "type hello world"', () => {
      const r = mockParse('type hello world', 'laptop');
      expect(r.action).toBe('typeText');
      expect(r.text).toBe('hello world');
    });

    it('should handle URL: go to github.com', () => {
      const r = mockParse('go to github.com', 'laptop');
      expect(r.action).toBe('openUrl');
      expect(r.url).toContain('github.com');
    });

    it('should return unknown for gibberish', () => {
      const r = mockParse('asdfghjkl qwerty', 'laptop');
      expect(r.action).toBe('unknown');
    });
  });

  // ─── TV commands ───

  describe('TV device type', () => {
    it('should handle "play karthika deepam on hotstar"', () => {
      const r = mockParse('play karthika deepam on hotstar', 'tv');
      expect(r.action).toBe('tvPlay');
      expect(r.app).toBe('hotstar');
      expect(r.query).toBe('karthika deepam');
    });

    it('should handle "search money heist on netflix"', () => {
      const r = mockParse('search money heist on netflix', 'tv');
      expect(r.action).toBe('tvSearch');
      expect(r.app).toBe('netflix');
      expect(r.query).toBe('money heist');
    });

    it('should handle "open youtube"', () => {
      const r = mockParse('open youtube', 'tv');
      expect(r.action).toBe('tvOpenApp');
      expect(r.app).toBe('youtube');
    });

    it('should handle "open hotstar"', () => {
      const r = mockParse('open hotstar', 'tv');
      expect(r.action).toBe('tvOpenApp');
      expect(r.app).toBe('hotstar');
    });

    it('should handle "go home"', () => {
      expect(mockParse('go home', 'tv').action).toBe('tvHome');
    });

    it('should handle "go back"', () => {
      expect(mockParse('go back', 'tv').action).toBe('tvBack');
    });

    it('should handle "select this"', () => {
      expect(mockParse('select this', 'tv').action).toBe('tvSelect');
    });

    it('should handle "move up"', () => {
      const r = mockParse('move up', 'tv');
      expect(r.action).toBe('tvNavigate');
      expect(r.direction).toBe('up');
    });

    it('should handle "move down"', () => {
      expect(mockParse('move down', 'tv').direction).toBe('down');
    });

    it('should handle "move left"', () => {
      expect(mockParse('move left', 'tv').direction).toBe('left');
    });

    it('should handle "move right"', () => {
      expect(mockParse('move right', 'tv').direction).toBe('right');
    });

    it('should handle TV volume up (shared)', () => {
      expect(mockParse('volume up', 'tv').action).toBe('volumeUp');
    });

    it('should handle TV mute (shared)', () => {
      expect(mockParse('mute', 'tv').action).toBe('mute');
    });

    it('should handle "watch arijit singh on youtube"', () => {
      const r = mockParse('watch arijit singh on youtube', 'tv');
      expect(r.action).toBe('tvPlay');
      expect(r.app).toBe('youtube');
      expect(r.query).toBe('arijit singh');
    });
  });

  // ─── PHONE commands ───

  describe('Phone device type', () => {
    it('should handle "open whatsapp"', () => {
      const r = mockParse('open whatsapp', 'phone');
      expect(r.action).toBe('phoneOpenApp');
      expect(r.app).toBe('whatsapp');
    });

    it('should handle "call 9876543210"', () => {
      const r = mockParse('call 9876543210', 'phone');
      expect(r.action).toBe('phoneCall');
      expect(r.number).toBe('9876543210');
    });

    it('should handle "send message to 123 saying hello"', () => {
      const r = mockParse('send to 123 saying hello', 'phone');
      expect(r.action).toBe('phoneSMS');
      expect(r.number).toBe('123');
      expect(r.message).toContain('hello');
    });

    it('should handle "set alarm for 7 AM"', () => {
      const r = mockParse('set alarm for 7 am', 'phone');
      expect(r.action).toBe('phoneAlarm');
      expect(r.hour).toBe(7);
      expect(r.minute).toBe(0);
    });

    it('should handle "set alarm for 6:30 PM"', () => {
      const r = mockParse('set alarm for 6:30 pm', 'phone');
      expect(r.action).toBe('phoneAlarm');
      expect(r.hour).toBe(18);
      expect(r.minute).toBe(30);
    });

    it('should handle "set timer for 5 minutes"', () => {
      const r = mockParse('set timer for 5 minutes', 'phone');
      expect(r.action).toBe('phoneTimer');
      expect(r.seconds).toBe(300);
    });

    it('should handle "set timer for 30 seconds"', () => {
      const r = mockParse('set timer for 30 seconds', 'phone');
      expect(r.action).toBe('phoneTimer');
      expect(r.seconds).toBe(30);
    });

    it('should handle "open camera"', () => {
      expect(mockParse('open camera', 'phone').action).toBe('phoneCamera');
    });

    it('should handle "take a photo"', () => {
      expect(mockParse('take a photo', 'phone').action).toBe('phoneCamera');
    });

    it('should handle "turn on flashlight"', () => {
      const r = mockParse('turn on flashlight', 'phone');
      expect(r.action).toBe('phoneFlashlight');
      expect(r.state).toBe('on');
    });

    it('should handle "torch off"', () => {
      const r = mockParse('torch off', 'phone');
      expect(r.action).toBe('phoneFlashlight');
      expect(r.state).toBe('off');
    });

    it('should handle "flashlight" (toggle)', () => {
      const r = mockParse('flashlight', 'phone');
      expect(r.action).toBe('phoneFlashlight');
      expect(r.state).toBe('toggle');
    });

    it('should handle "volume up" on phone', () => {
      const r = mockParse('volume up', 'phone');
      expect(r.action).toBe('phoneVolume');
      expect(r.direction).toBe('up');
    });

    it('should handle "open wifi settings"', () => {
      const r = mockParse('open wifi settings', 'phone');
      expect(r.action).toBe('phoneSettings');
      expect(r.section).toBe('wifi');
    });

    it('should handle "open bluetooth settings"', () => {
      const r = mockParse('open bluetooth settings', 'phone');
      expect(r.action).toBe('phoneSettings');
      expect(r.section).toBe('bluetooth');
    });

    it('should handle "open settings"', () => {
      const r = mockParse('open settings', 'phone');
      expect(r.action).toBe('phoneSettings');
    });

    it('should handle "make screen brighter"', () => {
      const r = mockParse('brightness up', 'phone');
      expect(r.action).toBe('phoneBrightness');
      expect(r.level).toBe('up');
    });

    it('should handle "make screen darker"', () => {
      const r = mockParse('brightness down', 'phone');
      expect(r.action).toBe('phoneBrightness');
      expect(r.level).toBe('down');
    });

    it('should handle "search for restaurants near me"', () => {
      const r = mockParse('search for restaurants near me', 'phone');
      expect(r.action).toBe('phoneSearch');
      expect(r.query).toContain('restaurants');
    });

    it('should handle "open google.com"', () => {
      const r = mockParse('open google.com', 'phone');
      expect(r.action).toBe('phoneUrl');
      expect(r.url).toContain('google.com');
    });

    it('should handle "share hello world"', () => {
      const r = mockParse('share hello world', 'phone');
      expect(r.action).toBe('phoneShare');
      expect(r.text).toContain('hello world');
    });

    it('should handle "open instagram"', () => {
      const r = mockParse('open instagram', 'phone');
      expect(r.action).toBe('phoneOpenApp');
      expect(r.app).toBe('instagram');
    });

    it('should handle "launch spotify"', () => {
      const r = mockParse('launch spotify', 'phone');
      expect(r.action).toBe('phoneOpenApp');
      expect(r.app).toBe('spotify');
    });
  });

  // ─── UNKNOWN device type ───

  describe('Unknown device type', () => {
    it('should return askDeviceType for any command', () => {
      const r = mockParse('open chrome', 'unknown');
      expect(r.action).toBe('askDeviceType');
    });

    it('should include original text', () => {
      const r = mockParse('play music', 'unknown');
      expect(r.action).toBe('askDeviceType');
      expect(r.text).toBe('play music');
    });
  });

  // ─── Cross-device: same command different results ───

  describe('Same command, different device types', () => {
    it('"open youtube" → different action per device', () => {
      const laptop = mockParse('open youtube', 'laptop');
      const tv = mockParse('open youtube', 'tv');
      const phone = mockParse('open youtube', 'phone');

      // Laptop: uses keyboard-matching app name
      expect(['openApp', 'searchYouTube']).toContain(laptop.action);
      // TV: uses tvOpenApp
      expect(tv.action).toBe('tvOpenApp');
      // Phone: uses phoneOpenApp
      expect(phone.action).toBe('phoneOpenApp');
    });

    it('"volume up" → different action per device', () => {
      const laptop = mockParse('volume up', 'laptop');
      const tv = mockParse('volume up', 'tv');
      const phone = mockParse('volume up', 'phone');

      expect(laptop.action).toBe('volumeUp');
      expect(tv.action).toBe('volumeUp'); // shared
      expect(phone.action).toBe('phoneVolume');
    });
  });
});
