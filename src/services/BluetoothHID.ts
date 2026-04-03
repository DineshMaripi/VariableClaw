import { NativeModules, NativeEventEmitter, Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothDevice, ConnectionStatus } from '../types';

const LAST_CONNECTED_KEY = '@openclaw_last_connected';

interface BluetoothHIDNative {
  initialize(): Promise<boolean>;
  startScanning(): Promise<void>;
  stopScanning(): Promise<void>;
  connectToDevice(address: string): Promise<boolean>;
  disconnectDevice(address: string): Promise<void>;
  disconnectAll(): Promise<void>;
  getConnectedDevices(): Promise<BluetoothDevice[]>;
  getPairedDevices(): Promise<BluetoothDevice[]>;
  getConnectedCount(): Promise<number>;
  isDeviceConnected(address: string): Promise<boolean>;
  setAutoReconnect(enabled: boolean): Promise<boolean>;
  // Targeted: send to one device
  sendKeyReportTo(address: string, modifier: number, keyCode: number): Promise<void>;
  sendKeyReleaseTo(address: string): Promise<void>;
  sendMouseReportTo(address: string, buttons: number, dx: number, dy: number, wheel: number): Promise<void>;
  // Broadcast: send to ALL connected devices
  sendKeyReportAll(modifier: number, keyCode: number): Promise<void>;
  sendKeyReleaseAll(): Promise<void>;
  sendMouseReportAll(buttons: number, dx: number, dy: number, wheel: number): Promise<void>;
}

interface ConnectionEvent {
  status: ConnectionStatus;
  connectedCount: number;
  deviceAddress?: string;
  deviceName?: string;
  connectedAddresses: string[];
}

type ConnectionCallback = (status: ConnectionStatus, device?: BluetoothDevice) => void;
type MultiDeviceCallback = (connectedDevices: BluetoothDevice[]) => void;
type DeviceCallback = (devices: BluetoothDevice[]) => void;

class BluetoothHIDService {
  private nativeModule: BluetoothHIDNative | null = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private connectionCallbacks: ConnectionCallback[] = [];
  private multiDeviceCallbacks: MultiDeviceCallback[] = [];
  private deviceCallbacks: DeviceCallback[] = [];
  private _connectedDevices: Map<string, BluetoothDevice> = new Map();
  private _autoReconnect = true;
  private _reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private _reconnectRetries: Map<string, number> = new Map();
  private _intentionalDisconnects: Set<string> = new Set();
  private _appStateSubscription: { remove: () => void } | null = null;

  private static readonly MAX_RECONNECT_RETRIES = 10;
  private static readonly BASE_RECONNECT_DELAY_MS = 2000;
  private static readonly MAX_RECONNECT_DELAY_MS = 30000;

  // Bluetooth Classic allows max 7 active connections (piconet limit).
  // Android HID profile reliably handles 3-5 simultaneous devices.
  // We cap at 5 for stability — configurable if needed.
  static readonly MAX_CONNECTIONS = 5;

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('Bluetooth HID is only supported on Android');
      return false;
    }

    try {
      const module = NativeModules.BluetoothHIDModule;
      if (!module) {
        console.warn(
          '[BluetoothHID] Native module not found. ' +
          'Running in demo mode. Build with expo-dev-client for full Bluetooth HID support.'
        );
        return false;
      }

      this.nativeModule = module as BluetoothHIDNative;
      this.eventEmitter = new NativeEventEmitter(module);
      this.setupEventListeners();
      const result = await this.nativeModule.initialize();
      if (result) {
        await this.restoreConnections();
        this._appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
      }
      return result;
    } catch (error) {
      console.error('Failed to initialize Bluetooth HID:', error);
      return false;
    }
  }

  private handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active' && this._autoReconnect) {
      // App came to foreground — check and restore any dropped connections
      this.restoreConnections();
    }
  };

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('onConnectionStateChanged', (event: ConnectionEvent) => {
      const device: BluetoothDevice | undefined = event.deviceAddress ? {
        id: event.deviceAddress,
        name: event.deviceName || 'Unknown',
        address: event.deviceAddress,
        paired: true,
        connected: event.status === 'connected',
      } : undefined;

      if (event.status === 'connected' && device) {
        this._connectedDevices.set(device.address, device);
        this.cancelReconnect(device.address);
        this._intentionalDisconnects.delete(device.address);
        // Persist connected devices
        this.saveConnectedDevices();
      } else if (event.status === 'disconnected' && event.deviceAddress) {
        this._connectedDevices.delete(event.deviceAddress);
        // Persist updated list
        this.saveConnectedDevices();
      }

      this.connectionCallbacks.forEach(cb => cb(event.status, device));
      this.multiDeviceCallbacks.forEach(cb => cb(Array.from(this._connectedDevices.values())));
    });

    this.eventEmitter.addListener('onDeviceFound', (event: { devices: BluetoothDevice[] }) => {
      this.deviceCallbacks.forEach(cb => cb(event.devices));
    });
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectedDevicesChange(callback: MultiDeviceCallback): () => void {
    this.multiDeviceCallbacks.push(callback);
    return () => {
      this.multiDeviceCallbacks = this.multiDeviceCallbacks.filter(cb => cb !== callback);
    };
  }

  onDevicesFound(callback: DeviceCallback): () => void {
    this.deviceCallbacks.push(callback);
    return () => {
      this.deviceCallbacks = this.deviceCallbacks.filter(cb => cb !== callback);
    };
  }

  async getPairedDevices(): Promise<BluetoothDevice[]> {
    if (!this.nativeModule) return [];
    return await this.nativeModule.getPairedDevices();
  }

  async startScanning(): Promise<void> {
    if (!this.nativeModule) return;
    this.connectionCallbacks.forEach(cb => cb('scanning'));
    await this.nativeModule.startScanning();
  }

  async stopScanning(): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.stopScanning();
  }

  async connect(device: BluetoothDevice): Promise<boolean> {
    if (!this.nativeModule) return false;
    if (this._connectedDevices.size >= BluetoothHIDService.MAX_CONNECTIONS) {
      console.warn(`Max ${BluetoothHIDService.MAX_CONNECTIONS} connections reached`);
      this.connectionCallbacks.forEach(cb => cb('error', device));
      return false;
    }
    this._intentionalDisconnects.delete(device.address);
    this.connectionCallbacks.forEach(cb => cb('pairing', device));
    try {
      const result = await this.nativeModule.connectToDevice(device.address);
      if (result) {
        const connectedDev = { ...device, connected: true };
        this._connectedDevices.set(device.address, connectedDev);
        this.connectionCallbacks.forEach(cb => cb('connected', connectedDev));
        this.multiDeviceCallbacks.forEach(cb => cb(Array.from(this._connectedDevices.values())));
        this.saveConnectedDevices();
      }
      return result;
    } catch (error) {
      this.connectionCallbacks.forEach(cb => cb('error', device));
      return false;
    }
  }

  async disconnectDevice(address: string): Promise<void> {
    if (!this.nativeModule) return;
    // Mark as intentional so auto-reconnect won't fire
    this._intentionalDisconnects.add(address);
    this.cancelReconnect(address);

    await this.nativeModule.disconnectDevice(address);
    const device = this._connectedDevices.get(address);
    this._connectedDevices.delete(address);
    this.saveConnectedDevices();
    if (device) {
      this.connectionCallbacks.forEach(cb => cb('disconnected', { ...device, connected: false }));
    }
    this.multiDeviceCallbacks.forEach(cb => cb(Array.from(this._connectedDevices.values())));
  }

  async disconnectAll(): Promise<void> {
    if (!this.nativeModule) return;
    for (const address of this._connectedDevices.keys()) {
      this._intentionalDisconnects.add(address);
    }
    this.cancelAllReconnects();

    await this.nativeModule.disconnectAll();
    this._connectedDevices.clear();
    this.saveConnectedDevices();
    this.connectionCallbacks.forEach(cb => cb('disconnected'));
    this.multiDeviceCallbacks.forEach(cb => cb([]));
  }

  // --- Auto-reconnect & persistence ---

  async setAutoReconnect(enabled: boolean): Promise<void> {
    this._autoReconnect = enabled;
    if (this.nativeModule) {
      await this.nativeModule.setAutoReconnect(enabled);
    }
    if (!enabled) {
      this.cancelAllReconnects();
    }
  }

  private async saveConnectedDevices(): Promise<void> {
    try {
      const devices = Array.from(this._connectedDevices.values()).map(d => ({
        id: d.id,
        name: d.name,
        address: d.address,
        deviceType: d.deviceType,
      }));
      await AsyncStorage.setItem(LAST_CONNECTED_KEY, JSON.stringify(devices));
    } catch (e) {
      console.error('[BT] Failed to save connected devices:', e);
    }
  }

  private async restoreConnections(): Promise<void> {
    if (!this._autoReconnect) return;

    try {
      const stored = await AsyncStorage.getItem(LAST_CONNECTED_KEY);
      if (!stored) return;

      const devices: { id: string; name: string; address: string; deviceType?: string }[] = JSON.parse(stored);
      for (const device of devices) {
        // Skip if already connected or intentionally disconnected
        if (this._connectedDevices.has(device.address)) continue;
        if (this._intentionalDisconnects.has(device.address)) continue;
        if (this._connectedDevices.size >= BluetoothHIDService.MAX_CONNECTIONS) break;

        console.log(`[BT] Auto-reconnecting to ${device.name} (${device.address})`);
        try {
          if (this.nativeModule) {
            await this.nativeModule.connectToDevice(device.address);
          }
        } catch (e) {
          console.log(`[BT] Auto-reconnect failed for ${device.name}, will retry`);
        }
      }
    } catch (e) {
      console.error('[BT] Failed to restore connections:', e);
    }
  }

  private scheduleReconnect(address: string, deviceName: string): void {
    if (!this._autoReconnect) return;
    if (this._intentionalDisconnects.has(address)) return;

    const retries = this._reconnectRetries.get(address) || 0;
    if (retries >= BluetoothHIDService.MAX_RECONNECT_RETRIES) {
      console.log(`[BT] Max reconnect retries for ${address}, giving up`);
      this._reconnectRetries.delete(address);
      return;
    }

    const delay = Math.min(
      BluetoothHIDService.BASE_RECONNECT_DELAY_MS * Math.pow(2, retries),
      BluetoothHIDService.MAX_RECONNECT_DELAY_MS
    );
    this._reconnectRetries.set(address, retries + 1);

    console.log(`[BT] Reconnecting to ${deviceName} in ${delay}ms (attempt ${retries + 1}/${BluetoothHIDService.MAX_RECONNECT_RETRIES})`);

    const timer = setTimeout(async () => {
      this._reconnectTimers.delete(address);
      if (!this._autoReconnect) return;
      if (this._connectedDevices.has(address)) return;
      if (this._intentionalDisconnects.has(address)) return;

      try {
        if (this.nativeModule) {
          const result = await this.nativeModule.connectToDevice(address);
          if (!result) {
            this.scheduleReconnect(address, deviceName);
          }
        }
      } catch (e) {
        this.scheduleReconnect(address, deviceName);
      }
    }, delay);

    // Cancel previous timer if exists
    const existing = this._reconnectTimers.get(address);
    if (existing) clearTimeout(existing);
    this._reconnectTimers.set(address, timer);
  }

  private cancelReconnect(address: string): void {
    const timer = this._reconnectTimers.get(address);
    if (timer) {
      clearTimeout(timer);
      this._reconnectTimers.delete(address);
    }
    this._reconnectRetries.delete(address);
  }

  private cancelAllReconnects(): void {
    for (const timer of this._reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this._reconnectTimers.clear();
    this._reconnectRetries.clear();
  }

  // --- Targeted send (one device) ---

  async sendKeyTo(address: string, modifier: number, keyCode: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendKeyReportTo(address, modifier, keyCode);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 20));
    await this.nativeModule.sendKeyReleaseTo(address);
  }

  async sendKeyDownTo(address: string, modifier: number, keyCode: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendKeyReportTo(address, modifier, keyCode);
  }

  async sendKeyUpTo(address: string): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendKeyReleaseTo(address);
  }

  async sendMouseMoveTo(address: string, dx: number, dy: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendMouseReportTo(address, 0, dx, dy, 0);
  }

  async sendMouseClickTo(address: string, button: 'left' | 'right' = 'left'): Promise<void> {
    if (!this.nativeModule) return;
    const buttonBit = button === 'left' ? 0x01 : 0x02;
    await this.nativeModule.sendMouseReportTo(address, buttonBit, 0, 0, 0);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 50));
    await this.nativeModule.sendMouseReportTo(address, 0, 0, 0, 0);
  }

  async sendScrollTo(address: string, amount: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendMouseReportTo(address, 0, 0, 0, amount);
  }

  // --- Broadcast send (ALL connected devices) ---

  async sendKeyAll(modifier: number, keyCode: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendKeyReportAll(modifier, keyCode);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 20));
    await this.nativeModule.sendKeyReleaseAll();
  }

  async sendKeyDownAll(modifier: number, keyCode: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendKeyReportAll(modifier, keyCode);
  }

  async sendKeyUpAll(): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendKeyReleaseAll();
  }

  async sendMouseMoveAll(dx: number, dy: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendMouseReportAll(0, dx, dy, 0);
  }

  async sendMouseClickAll(button: 'left' | 'right' = 'left'): Promise<void> {
    if (!this.nativeModule) return;
    const buttonBit = button === 'left' ? 0x01 : 0x02;
    await this.nativeModule.sendMouseReportAll(buttonBit, 0, 0, 0);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 50));
    await this.nativeModule.sendMouseReportAll(0, 0, 0, 0);
  }

  async sendScrollAll(amount: number): Promise<void> {
    if (!this.nativeModule) return;
    await this.nativeModule.sendMouseReportAll(0, 0, 0, amount);
  }

  // --- Convenience: send to targets (specific address, 'all', or default first) ---

  async sendKey(modifier: number, keyCode: number, target?: string): Promise<void> {
    if (target === 'all') {
      return this.sendKeyAll(modifier, keyCode);
    }
    const address = target || this.firstConnectedAddress;
    if (address) {
      return this.sendKeyTo(address, modifier, keyCode);
    }
    console.warn('[BluetoothHID] No connected device to send key to');
  }

  async sendMouseClick(button: 'left' | 'right' = 'left', target?: string): Promise<void> {
    if (target === 'all') {
      return this.sendMouseClickAll(button);
    }
    const address = target || this.firstConnectedAddress;
    if (address) {
      return this.sendMouseClickTo(address, button);
    }
  }

  async sendMouseMove(dx: number, dy: number, target?: string): Promise<void> {
    if (target === 'all') {
      return this.sendMouseMoveAll(dx, dy);
    }
    const address = target || this.firstConnectedAddress;
    if (address) {
      return this.sendMouseMoveTo(address, dx, dy);
    }
  }

  async sendScroll(amount: number, target?: string): Promise<void> {
    if (target === 'all') {
      return this.sendScrollAll(amount);
    }
    const address = target || this.firstConnectedAddress;
    if (address) {
      return this.sendScrollTo(address, amount);
    }
  }

  // --- State getters ---

  get isConnected(): boolean {
    return this._connectedDevices.size > 0;
  }

  get connectedCount(): number {
    return this._connectedDevices.size;
  }

  get connectedDevices(): BluetoothDevice[] {
    return Array.from(this._connectedDevices.values());
  }

  get connectedAddresses(): string[] {
    return Array.from(this._connectedDevices.keys());
  }

  get firstConnectedAddress(): string | undefined {
    return this._connectedDevices.keys().next().value;
  }

  isDeviceConnected(address: string): boolean {
    return this._connectedDevices.has(address);
  }

  setDeviceType(address: string, deviceType: import('../types').DeviceType): void {
    const device = this._connectedDevices.get(address);
    if (device) {
      device.deviceType = deviceType;
      this._connectedDevices.set(address, device);
      this.multiDeviceCallbacks.forEach(cb => cb(Array.from(this._connectedDevices.values())));
    }
  }

  getDeviceType(address: string): import('../types').DeviceType {
    return this._connectedDevices.get(address)?.deviceType || 'unknown';
  }
}

export const bluetoothHID = new BluetoothHIDService();
