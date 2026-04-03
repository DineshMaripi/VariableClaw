import { bluetoothHID } from '../BluetoothHID';
import { deviceTypeDetectorAgent } from './DeviceTypeDetectorAgent';
import { BluetoothDevice } from '../../types';

/**
 * DeviceConnectionAgent — handles Bluetooth device discovery, connection, and management.
 * No AI needed; this agent manages real Bluetooth HID connections.
 */
export class DeviceConnectionAgent {
  readonly name = 'DeviceConnectionAgent';

  private _isScanning = false;
  private _autoConnectInProgress = false;

  /** Initialize Bluetooth HID and auto-connect to previously connected devices */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await bluetoothHID.initialize();
      return { success: result };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to initialize Bluetooth HID',
      };
    }
  }

  /** Scan for available devices (paired + discovery) */
  async scanForDevices(): Promise<BluetoothDevice[]> {
    this._isScanning = true;
    try {
      // Start real Bluetooth discovery (paired + new devices)
      await bluetoothHID.startScanning();
      // Also return currently known paired devices
      const paired = await bluetoothHID.getPairedDevices();
      return paired;
    } catch (error) {
      console.error(`[${this.name}] Scan failed:`, error);
      return [];
    } finally {
      this._isScanning = false;
    }
  }

  /** Connect to a specific device. Auto-detects device type from name. */
  async connectToDevice(device: BluetoothDevice): Promise<boolean> {
    try {
      // Auto-detect device type if not set
      if (!device.deviceType || device.deviceType === 'unknown') {
        device = { ...device, deviceType: deviceTypeDetectorAgent.detect(device) };
      }
      const result = await bluetoothHID.connect(device);
      if (result && device.deviceType && device.deviceType !== 'unknown') {
        bluetoothHID.setDeviceType(device.address, device.deviceType);
      }
      return result;
    } catch (error) {
      console.error(`[${this.name}] Connect failed for ${device.name}:`, error);
      return false;
    }
  }

  /** Disconnect a specific device */
  async disconnectDevice(address: string): Promise<void> {
    await bluetoothHID.disconnectDevice(address);
  }

  /** Disconnect all devices */
  async disconnectAll(): Promise<void> {
    await bluetoothHID.disconnectAll();
  }

  /**
   * Auto-connect to available paired devices on startup.
   * Attempts to connect to all paired devices that aren't already connected,
   * up to the max connection limit.
   */
  async autoConnectDevices(): Promise<{ connected: BluetoothDevice[]; failed: string[] }> {
    if (this._autoConnectInProgress) {
      return { connected: [], failed: [] };
    }

    this._autoConnectInProgress = true;
    const connected: BluetoothDevice[] = [];
    const failed: string[] = [];

    try {
      const paired = await bluetoothHID.getPairedDevices();
      const maxConnections = bluetoothHID.connectedCount;

      for (const device of paired) {
        // Skip already connected
        if (bluetoothHID.isDeviceConnected(device.address)) {
          connected.push(device);
          continue;
        }

        // Check connection limit
        if (bluetoothHID.connectedCount >= 5) break;

        try {
          const result = await bluetoothHID.connect(device);
          if (result) {
            connected.push(device);
          } else {
            failed.push(device.name || device.address);
          }
        } catch {
          failed.push(device.name || device.address);
        }
      }
    } catch (error) {
      console.error(`[${this.name}] Auto-connect failed:`, error);
    } finally {
      this._autoConnectInProgress = false;
    }

    return { connected, failed };
  }

  /** Get current connection status */
  getStatus() {
    return {
      isConnected: bluetoothHID.isConnected,
      connectedCount: bluetoothHID.connectedCount,
      connectedDevices: bluetoothHID.connectedDevices,
      isScanning: this._isScanning,
    };
  }

  /** Test if a connected device is responsive */
  async testConnection(address: string): Promise<boolean> {
    try {
      const { HID_KEY } = require('../../constants/keycodes');
      await bluetoothHID.sendKeyTo(address, 0, HID_KEY.NONE);
      return true;
    } catch {
      return false;
    }
  }
}

export const deviceConnectionAgent = new DeviceConnectionAgent();
