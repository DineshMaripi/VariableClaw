import { NativeModules, Platform } from 'react-native';

interface PhoneCommandNative {
  openApp(packageName: string): Promise<boolean>;
  openAppByName(appName: string): Promise<boolean>;
  makeCall(number: string): Promise<boolean>;
  sendSMS(number: string, message: string): Promise<boolean>;
  setAlarm(hour: number, minute: number, label: string): Promise<boolean>;
  setTimer(seconds: number, label: string): Promise<boolean>;
  openCamera(): Promise<boolean>;
  toggleFlashlight(): Promise<boolean>;
  setFlashlight(on: boolean): Promise<boolean>;
  setVolume(direction: string): Promise<boolean>;
  openUrl(url: string): Promise<boolean>;
  webSearch(query: string): Promise<boolean>;
  openSettings(section: string): Promise<boolean>;
  shareText(text: string): Promise<boolean>;
  setBrightness(level: string): Promise<boolean>;
}

class PhoneCommandService {
  private native: PhoneCommandNative | null = null;

  constructor() {
    if (Platform.OS === 'android') {
      this.native = NativeModules.PhoneCommandModule as PhoneCommandNative;
    }
  }

  get isAvailable(): boolean {
    return this.native !== null;
  }

  // ─── Execute a parsed phone action from AI ───

  async execute(action: string, params: Record<string, any> = {}): Promise<{ success: boolean; message: string }> {
    if (!this.native) {
      return { success: false, message: 'PhoneCommandModule not available. Build with expo-dev-client.' };
    }

    try {
      switch (action) {
        case 'phoneOpenApp':
          await this.native.openAppByName(params.app || '');
          return { success: true, message: `Opening ${params.app}` };

        case 'phoneCall':
          await this.native.makeCall(params.number || '');
          return { success: true, message: `Calling ${params.number}` };

        case 'phoneSMS':
          await this.native.sendSMS(params.number || '', params.message || '');
          return { success: true, message: `Sending SMS to ${params.number}` };

        case 'phoneAlarm': {
          const hour = params.hour ?? 7;
          const minute = params.minute ?? 0;
          await this.native.setAlarm(hour, minute, params.label || '');
          return { success: true, message: `Alarm set for ${hour}:${String(minute).padStart(2, '0')}` };
        }

        case 'phoneTimer': {
          const seconds = params.seconds ?? 300;
          await this.native.setTimer(seconds, params.label || '');
          const mins = Math.floor(seconds / 60);
          return { success: true, message: `Timer set for ${mins} minute${mins !== 1 ? 's' : ''}` };
        }

        case 'phoneCamera':
          await this.native.openCamera();
          return { success: true, message: 'Opening camera' };

        case 'phoneFlashlight':
          if (params.state === 'on') {
            await this.native.setFlashlight(true);
            return { success: true, message: 'Flashlight on' };
          } else if (params.state === 'off') {
            await this.native.setFlashlight(false);
            return { success: true, message: 'Flashlight off' };
          } else {
            const isOn = await this.native.toggleFlashlight();
            return { success: true, message: isOn ? 'Flashlight on' : 'Flashlight off' };
          }

        case 'phoneVolume':
          await this.native.setVolume(params.direction || 'up');
          return { success: true, message: `Volume ${params.direction}` };

        case 'phoneUrl':
          await this.native.openUrl(params.url || '');
          return { success: true, message: `Opening ${params.url}` };

        case 'phoneSearch':
          await this.native.webSearch(params.query || '');
          return { success: true, message: `Searching: ${params.query}` };

        case 'phoneSettings':
          await this.native.openSettings(params.section || '');
          return { success: true, message: `Opening ${params.section || ''} settings` };

        case 'phoneShare':
          await this.native.shareText(params.text || '');
          return { success: true, message: 'Sharing text' };

        case 'phoneBrightness':
          await this.native.setBrightness(params.level || 'up');
          return { success: true, message: `Brightness ${params.level}` };

        default:
          return { success: false, message: `Unknown phone action: ${action}` };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Command failed';
      return { success: false, message: msg };
    }
  }
}

export const phoneCommands = new PhoneCommandService();
