const rnMock = require('react-native') as any;
const __mockPhoneModule = rnMock.__mockPhoneModule;

import { phoneCommands } from '../../services/PhoneCommands';

beforeEach(() => {
  jest.clearAllMocks();
  // Restore mock implementations
  Object.keys(__mockPhoneModule).forEach((key: string) => {
    __mockPhoneModule[key].mockResolvedValue(true);
  });
});

describe('PhoneCommands', () => {
  it('should be available on android', () => {
    expect(phoneCommands.isAvailable).toBe(true);
  });

  // ─── Open App ───

  describe('phoneOpenApp', () => {
    it('should open app by name', async () => {
      const result = await phoneCommands.execute('phoneOpenApp', { app: 'whatsapp' });
      expect(result.success).toBe(true);
      expect(__mockPhoneModule.openAppByName).toHaveBeenCalledWith('whatsapp');
    });

    it('should open youtube', async () => {
      await phoneCommands.execute('phoneOpenApp', { app: 'youtube' });
      expect(__mockPhoneModule.openAppByName).toHaveBeenCalledWith('youtube');
    });

    it('should open instagram', async () => {
      await phoneCommands.execute('phoneOpenApp', { app: 'instagram' });
      expect(__mockPhoneModule.openAppByName).toHaveBeenCalledWith('instagram');
    });
  });

  // ─── Phone Call ───

  describe('phoneCall', () => {
    it('should make a call with number', async () => {
      const result = await phoneCommands.execute('phoneCall', { number: '9876543210' });
      expect(result.success).toBe(true);
      expect(__mockPhoneModule.makeCall).toHaveBeenCalledWith('9876543210');
    });

    it('should handle empty number', async () => {
      await phoneCommands.execute('phoneCall', {});
      expect(__mockPhoneModule.makeCall).toHaveBeenCalledWith('');
    });
  });

  // ─── SMS ───

  describe('phoneSMS', () => {
    it('should send SMS with number and message', async () => {
      const result = await phoneCommands.execute('phoneSMS', {
        number: '9876543210',
        message: 'Hello!',
      });
      expect(result.success).toBe(true);
      expect(__mockPhoneModule.sendSMS).toHaveBeenCalledWith('9876543210', 'Hello!');
    });

    it('should handle missing message', async () => {
      await phoneCommands.execute('phoneSMS', { number: '123' });
      expect(__mockPhoneModule.sendSMS).toHaveBeenCalledWith('123', '');
    });
  });

  // ─── Alarm ───

  describe('phoneAlarm', () => {
    it('should set alarm for 7:00 AM', async () => {
      const result = await phoneCommands.execute('phoneAlarm', {
        hour: 7,
        minute: 0,
        label: 'Wake up',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('7:00');
      expect(__mockPhoneModule.setAlarm).toHaveBeenCalledWith(7, 0, 'Wake up');
    });

    it('should set alarm for 6:30 PM', async () => {
      await phoneCommands.execute('phoneAlarm', { hour: 18, minute: 30 });
      expect(__mockPhoneModule.setAlarm).toHaveBeenCalledWith(18, 30, '');
    });

    it('should default to 7:00 when no params', async () => {
      await phoneCommands.execute('phoneAlarm', {});
      expect(__mockPhoneModule.setAlarm).toHaveBeenCalledWith(7, 0, '');
    });
  });

  // ─── Timer ───

  describe('phoneTimer', () => {
    it('should set timer for 5 minutes (300 seconds)', async () => {
      const result = await phoneCommands.execute('phoneTimer', {
        seconds: 300,
        label: 'Tea',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('5 minute');
      expect(__mockPhoneModule.setTimer).toHaveBeenCalledWith(300, 'Tea');
    });

    it('should default to 300 seconds', async () => {
      await phoneCommands.execute('phoneTimer', {});
      expect(__mockPhoneModule.setTimer).toHaveBeenCalledWith(300, '');
    });

    it('should handle 1 minute correctly (singular)', async () => {
      const result = await phoneCommands.execute('phoneTimer', { seconds: 60 });
      expect(result.message).toContain('1 minute');
      expect(result.message).not.toContain('minutes');
    });
  });

  // ─── Camera ───

  describe('phoneCamera', () => {
    it('should open camera', async () => {
      const result = await phoneCommands.execute('phoneCamera', {});
      expect(result.success).toBe(true);
      expect(__mockPhoneModule.openCamera).toHaveBeenCalled();
    });
  });

  // ─── Flashlight ───

  describe('phoneFlashlight', () => {
    it('should turn flashlight on', async () => {
      const result = await phoneCommands.execute('phoneFlashlight', { state: 'on' });
      expect(result.success).toBe(true);
      expect(__mockPhoneModule.setFlashlight).toHaveBeenCalledWith(true);
    });

    it('should turn flashlight off', async () => {
      await phoneCommands.execute('phoneFlashlight', { state: 'off' });
      expect(__mockPhoneModule.setFlashlight).toHaveBeenCalledWith(false);
    });

    it('should toggle flashlight when no state given', async () => {
      await phoneCommands.execute('phoneFlashlight', {});
      expect(__mockPhoneModule.toggleFlashlight).toHaveBeenCalled();
    });
  });

  // ─── Volume ───

  describe('phoneVolume', () => {
    it('should increase volume', async () => {
      await phoneCommands.execute('phoneVolume', { direction: 'up' });
      expect(__mockPhoneModule.setVolume).toHaveBeenCalledWith('up');
    });

    it('should decrease volume', async () => {
      await phoneCommands.execute('phoneVolume', { direction: 'down' });
      expect(__mockPhoneModule.setVolume).toHaveBeenCalledWith('down');
    });

    it('should mute', async () => {
      await phoneCommands.execute('phoneVolume', { direction: 'mute' });
      expect(__mockPhoneModule.setVolume).toHaveBeenCalledWith('mute');
    });
  });

  // ─── URL ───

  describe('phoneUrl', () => {
    it('should open URL', async () => {
      await phoneCommands.execute('phoneUrl', { url: 'https://google.com' });
      expect(__mockPhoneModule.openUrl).toHaveBeenCalledWith('https://google.com');
    });
  });

  // ─── Search ───

  describe('phoneSearch', () => {
    it('should web search', async () => {
      await phoneCommands.execute('phoneSearch', { query: 'restaurants near me' });
      expect(__mockPhoneModule.webSearch).toHaveBeenCalledWith('restaurants near me');
    });
  });

  // ─── Settings ───

  describe('phoneSettings', () => {
    it('should open wifi settings', async () => {
      await phoneCommands.execute('phoneSettings', { section: 'wifi' });
      expect(__mockPhoneModule.openSettings).toHaveBeenCalledWith('wifi');
    });

    it('should open general settings when no section', async () => {
      await phoneCommands.execute('phoneSettings', {});
      expect(__mockPhoneModule.openSettings).toHaveBeenCalledWith('');
    });
  });

  // ─── Share ───

  describe('phoneShare', () => {
    it('should share text', async () => {
      await phoneCommands.execute('phoneShare', { text: 'Hello world' });
      expect(__mockPhoneModule.shareText).toHaveBeenCalledWith('Hello world');
    });
  });

  // ─── Brightness ───

  describe('phoneBrightness', () => {
    it('should adjust brightness up', async () => {
      await phoneCommands.execute('phoneBrightness', { level: 'up' });
      expect(__mockPhoneModule.setBrightness).toHaveBeenCalledWith('up');
    });
  });

  // ─── Unknown action ───

  describe('unknown action', () => {
    it('should return failure for unknown action', async () => {
      const result = await phoneCommands.execute('phoneDoSomethingWeird', {});
      expect(result.success).toBe(false);
    });
  });

  // ─── Error handling ───

  describe('error handling', () => {
    it('should handle native module errors gracefully', async () => {
      __mockPhoneModule.openAppByName.mockRejectedValueOnce(new Error('App not found'));
      const result = await phoneCommands.execute('phoneOpenApp', { app: 'nonexistent' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('App not found');
    });
  });
});
