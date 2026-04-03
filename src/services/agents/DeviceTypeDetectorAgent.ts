import { DeviceType, BluetoothDevice } from '../../types';
import { ollamaService } from '../OllamaService';

/**
 * DeviceTypeDetectorAgent — AI-powered device type detection from Bluetooth names.
 * Uses Ollama to intelligently identify unknown device types.
 * Falls back to keyword matching when AI is unavailable.
 */

const DETECT_PROMPT = `You are a device classifier. Given a Bluetooth device name, determine what type of device it is.
Respond with ONLY one word: laptop, tv, desktop, or phone.
If you truly cannot tell, respond with: unknown.
No explanation, just the one word.`;

const TV_KEYWORDS = [
  'tv', 'bravia', 'samsung smart', 'lg smart', 'android tv', 'fire tv',
  'firestick', 'chromecast', 'roku', 'mi box', 'shield', 'tizen',
  'webos', 'vizio', 'hisense', 'tcl', 'panasonic', 'philips',
  'sony tv', 'lg tv', 'samsung tv', 'oneplus tv', 'realme tv',
];

const LAPTOP_KEYWORDS = [
  'laptop', 'pavilion', 'inspiron', 'thinkpad', 'macbook', 'ideapad',
  'zenbook', 'vivobook', 'swift', 'aspire', 'latitude', 'xps',
  'surface', 'spectre', 'envy', 'elitebook', 'probook', 'nitro',
  'predator', 'rog', 'tuf', 'legion', 'yoga', 'gram', 'razer blade',
  'chromebook', 'hp ', 'dell ', 'lenovo ', 'asus ', 'acer ',
];

const DESKTOP_KEYWORDS = [
  'desktop', 'tower', 'workstation', 'optiplex', 'prodesk',
  'thinkcentre', 'imac', 'mac mini', 'mac pro', 'nuc',
  'pc', 'gaming pc', 'rog desktop',
];

const PHONE_KEYWORDS = [
  'pixel', 'galaxy s', 'galaxy a', 'galaxy z', 'iphone', 'oneplus',
  'redmi', 'poco', 'realme', 'vivo', 'oppo', 'motorola', 'moto',
  'nokia', 'nothing phone', 'samsung galaxy',
];

// Cache AI results to avoid repeat calls for the same device
const aiCache = new Map<string, DeviceType>();

export class DeviceTypeDetectorAgent {
  readonly name = 'DeviceTypeDetectorAgent';

  /**
   * Detect device type — tries keyword matching first, then AI for unknowns.
   */
  detect(device: BluetoothDevice): DeviceType {
    return this.detectByKeywords(device);
  }

  /**
   * AI-enhanced detection for devices that keyword matching can't identify.
   * Call this for 'unknown' devices to get a smarter guess.
   */
  async detectWithAI(device: BluetoothDevice): Promise<DeviceType> {
    const name = (device.name || '').toLowerCase();
    if (!name || name === 'unknown') return 'unknown';

    // Try keywords first (instant)
    const keywordResult = this.detectByKeywords(device);
    if (keywordResult !== 'unknown') return keywordResult;

    // Check AI cache
    if (aiCache.has(name)) return aiCache.get(name)!;

    // Ask Ollama
    if (ollamaService.isConnected) {
      try {
        const response = await ollamaService.chat(
          DETECT_PROMPT,
          `Bluetooth device name: "${device.name}"`,
          { temperature: 0.1, maxTokens: 10 }
        );

        if (response) {
          const cleaned = response.trim().toLowerCase().replace(/[^a-z]/g, '');
          const validTypes: DeviceType[] = ['laptop', 'tv', 'desktop', 'phone'];
          if (validTypes.includes(cleaned as DeviceType)) {
            aiCache.set(name, cleaned as DeviceType);
            return cleaned as DeviceType;
          }
        }
      } catch { /* fall through */ }
    }

    return 'unknown';
  }

  /** Keyword-based detection (original logic, synchronous) */
  private detectByKeywords(device: BluetoothDevice): DeviceType {
    const name = (device.name || '').toLowerCase();
    if (!name || name === 'unknown') return 'unknown';

    for (const kw of TV_KEYWORDS) { if (name.includes(kw)) return 'tv'; }
    for (const kw of PHONE_KEYWORDS) { if (name.includes(kw)) return 'phone'; }
    for (const kw of DESKTOP_KEYWORDS) { if (name.includes(kw)) return 'desktop'; }
    for (const kw of LAPTOP_KEYWORDS) { if (name.includes(kw)) return 'laptop'; }

    const genericPCBrands = ['hp', 'dell', 'lenovo', 'asus', 'acer', 'msi', 'apple'];
    for (const brand of genericPCBrands) { if (name.includes(brand)) return 'laptop'; }

    return 'unknown';
  }

  /**
   * Auto-assign device types. Uses AI for unknown devices.
   */
  async autoAssignTypesWithAI(devices: BluetoothDevice[]): Promise<BluetoothDevice[]> {
    const results: BluetoothDevice[] = [];
    for (const device of devices) {
      if (!device.deviceType || device.deviceType === 'unknown') {
        const detected = await this.detectWithAI(device);
        results.push({ ...device, deviceType: detected });
      } else {
        results.push(device);
      }
    }
    return results;
  }

  /** Synchronous auto-assign (keyword-only, for immediate UI) */
  autoAssignTypes(devices: BluetoothDevice[]): BluetoothDevice[] {
    return devices.map(device => {
      if (!device.deviceType || device.deviceType === 'unknown') {
        return { ...device, deviceType: this.detect(device) };
      }
      return device;
    });
  }
}

export const deviceTypeDetectorAgent = new DeviceTypeDetectorAgent();
