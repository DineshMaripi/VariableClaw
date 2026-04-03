// Mock React Native for Jest testing

export const Platform = {
  OS: 'android',
  select: (obj: any) => obj.android,
};

const mockModule: any = {
  initialize: jest.fn().mockResolvedValue(true),
  startScanning: jest.fn().mockResolvedValue(undefined),
  stopScanning: jest.fn().mockResolvedValue(undefined),
  connectToDevice: jest.fn().mockResolvedValue(true),
  disconnectDevice: jest.fn().mockResolvedValue(undefined),
  disconnectAll: jest.fn().mockResolvedValue(undefined),
  getConnectedDevices: jest.fn().mockResolvedValue([]),
  getPairedDevices: jest.fn().mockResolvedValue([]),
  getConnectedCount: jest.fn().mockResolvedValue(0),
  isDeviceConnected: jest.fn().mockResolvedValue(false),
  sendKeyReportTo: jest.fn().mockResolvedValue(undefined),
  sendKeyReleaseTo: jest.fn().mockResolvedValue(undefined),
  sendMouseReportTo: jest.fn().mockResolvedValue(undefined),
  sendKeyReportAll: jest.fn().mockResolvedValue(undefined),
  sendKeyReleaseAll: jest.fn().mockResolvedValue(undefined),
  sendMouseReportAll: jest.fn().mockResolvedValue(undefined),
};

const mockPhoneModule: any = {
  openApp: jest.fn().mockResolvedValue(true),
  openAppByName: jest.fn().mockResolvedValue(true),
  makeCall: jest.fn().mockResolvedValue(true),
  sendSMS: jest.fn().mockResolvedValue(true),
  setAlarm: jest.fn().mockResolvedValue(true),
  setTimer: jest.fn().mockResolvedValue(true),
  openCamera: jest.fn().mockResolvedValue(true),
  toggleFlashlight: jest.fn().mockResolvedValue(true),
  setFlashlight: jest.fn().mockResolvedValue(true),
  setVolume: jest.fn().mockResolvedValue(true),
  openUrl: jest.fn().mockResolvedValue(true),
  webSearch: jest.fn().mockResolvedValue(true),
  openSettings: jest.fn().mockResolvedValue(true),
  shareText: jest.fn().mockResolvedValue(true),
  setBrightness: jest.fn().mockResolvedValue(true),
};

const mockLLMModule: any = {
  isNativeAvailable: jest.fn().mockResolvedValue(false),
  loadModel: jest.fn().mockResolvedValue({ success: true, path: '/mock', sizeBytes: 400000000 }),
  unloadModel: jest.fn().mockResolvedValue(true),
  generate: jest.fn().mockResolvedValue('{"action":"unknown"}'),
  isModelLoaded: jest.fn().mockResolvedValue(false),
  getModelDirectory: jest.fn().mockResolvedValue('/mock/models'),
  downloadModel: jest.fn().mockResolvedValue({ path: '/mock/model.gguf', sizeBytes: 400000000, cached: true }),
  deleteModel: jest.fn().mockResolvedValue(true),
  listModels: jest.fn().mockResolvedValue([]),
};

export const NativeModules = {
  BluetoothHIDModule: mockModule,
  VoiceRecognitionModule: null,
  PhoneCommandModule: mockPhoneModule,
  OnDeviceLLMModule: mockLLMModule,
};

export const __mockPhoneModule = mockPhoneModule;
export const __mockLLMModule = mockLLMModule;

const listeners: Map<string, Set<Function>> = new Map();

export class NativeEventEmitter {
  constructor(_module?: any) {}

  addListener(event: string, callback: Function) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback);
    return {
      remove: () => {
        listeners.get(event)?.delete(callback);
      },
    };
  }

  removeAllListeners(event: string) {
    listeners.delete(event);
  }

  // Helper to emit events in tests
  static emit(event: string, data: any) {
    listeners.get(event)?.forEach(cb => cb(data));
  }

  static clearAll() {
    listeners.clear();
  }
}

// Expose for tests to trigger events
export const __mockEmit = NativeEventEmitter.emit;
export const __mockClearListeners = NativeEventEmitter.clearAll;
export const __mockNativeModule = mockModule;
