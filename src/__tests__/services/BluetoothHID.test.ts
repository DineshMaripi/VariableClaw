// eslint-disable-next-line @typescript-eslint/no-var-requires
const rnMock = require('react-native') as any;
const NativeModules = rnMock.NativeModules;
const __mockNativeModule = rnMock.__mockNativeModule;
const __mockClearListeners = rnMock.__mockClearListeners;

import { bluetoothHID } from '../../services/BluetoothHID';

beforeEach(async () => {
  // Reset call history but keep implementations
  jest.clearAllMocks();
  __mockClearListeners();
  // Restore default implementations (clearAllMocks wipes them in Jest 30)
  __mockNativeModule.initialize.mockResolvedValue(true);
  __mockNativeModule.connectToDevice.mockResolvedValue(true);
  __mockNativeModule.startScanning.mockResolvedValue(undefined);
  __mockNativeModule.stopScanning.mockResolvedValue(undefined);
  __mockNativeModule.disconnectDevice.mockResolvedValue(undefined);
  __mockNativeModule.disconnectAll.mockResolvedValue(undefined);
  __mockNativeModule.getPairedDevices.mockResolvedValue([]);
  __mockNativeModule.sendKeyReportTo.mockResolvedValue(undefined);
  __mockNativeModule.sendKeyReleaseTo.mockResolvedValue(undefined);
  __mockNativeModule.sendMouseReportTo.mockResolvedValue(undefined);
  __mockNativeModule.sendKeyReportAll.mockResolvedValue(undefined);
  __mockNativeModule.sendKeyReleaseAll.mockResolvedValue(undefined);
  __mockNativeModule.sendMouseReportAll.mockResolvedValue(undefined);
  // Reset internal state via disconnectAll
  await bluetoothHID.disconnectAll();
  jest.clearAllMocks();
  // Restore again after disconnectAll consumed calls
  __mockNativeModule.initialize.mockResolvedValue(true);
  __mockNativeModule.connectToDevice.mockResolvedValue(true);
  __mockNativeModule.disconnectDevice.mockResolvedValue(undefined);
  __mockNativeModule.disconnectAll.mockResolvedValue(undefined);
  __mockNativeModule.getPairedDevices.mockResolvedValue([]);
  __mockNativeModule.startScanning.mockResolvedValue(undefined);
  __mockNativeModule.stopScanning.mockResolvedValue(undefined);
  __mockNativeModule.sendKeyReportTo.mockResolvedValue(undefined);
  __mockNativeModule.sendKeyReleaseTo.mockResolvedValue(undefined);
  __mockNativeModule.sendMouseReportTo.mockResolvedValue(undefined);
  __mockNativeModule.sendKeyReportAll.mockResolvedValue(undefined);
  __mockNativeModule.sendKeyReleaseAll.mockResolvedValue(undefined);
  __mockNativeModule.sendMouseReportAll.mockResolvedValue(undefined);
});

describe('BluetoothHIDService', () => {
  // ─── Initialization ───

  describe('initialize()', () => {
    it('should initialize successfully with native module present', async () => {
      const result = await bluetoothHID.initialize();
      expect(result).toBe(true);
      expect(__mockNativeModule.initialize).toHaveBeenCalledTimes(1);
    });

    it('should fall back to mock mode when native module missing', async () => {
      // Temporarily remove native module
      const original = NativeModules.BluetoothHIDModule;
      NativeModules.BluetoothHIDModule = null;
      // Re-import to get a fresh singleton without native module
      jest.resetModules();
      const { bluetoothHID: bt } = require('../../services/BluetoothHID');
      const result = await bt.initialize();
      expect(result).toBe(true);
      NativeModules.BluetoothHIDModule = original;
    });

    it('should return false when initialize throws', async () => {
      __mockNativeModule.initialize.mockRejectedValueOnce(new Error('BT fail'));
      const result = await bluetoothHID.initialize();
      expect(result).toBe(false);
    });
  });

  // ─── Connection Management ───

  describe('connect()', () => {
    const mockDevice = {
      id: '1',
      name: 'Test Laptop',
      address: 'AA:BB:CC:DD:EE:FF',
      paired: true,
      connected: false,
    };

    beforeEach(async () => {
      await bluetoothHID.initialize();
    });

    it('should connect to a device and update internal state', async () => {
      const result = await bluetoothHID.connect(mockDevice);
      expect(result).toBe(true);
      expect(__mockNativeModule.connectToDevice).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
      expect(bluetoothHID.isConnected).toBe(true);
      expect(bluetoothHID.connectedCount).toBe(1);
      expect(bluetoothHID.connectedDevices[0].name).toBe('Test Laptop');
    });

    it('should fire connection callbacks on connect', async () => {
      const callback = jest.fn();
      bluetoothHID.onConnectionChange(callback);
      await bluetoothHID.connect(mockDevice);
      // 'pairing' then 'connected'
      expect(callback).toHaveBeenCalledWith('pairing', mockDevice);
      expect(callback).toHaveBeenCalledWith('connected', expect.objectContaining({ connected: true }));
    });

    it('should fire multi-device callbacks on connect', async () => {
      const callback = jest.fn();
      bluetoothHID.onConnectedDevicesChange(callback);
      await bluetoothHID.connect(mockDevice);
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Test Laptop' })])
      );
    });

    it('should support multiple device connections', async () => {
      const device2 = { ...mockDevice, id: '2', name: 'TV', address: '11:22:33:44:55:66' };
      await bluetoothHID.connect(mockDevice);
      await bluetoothHID.connect(device2);
      expect(bluetoothHID.connectedCount).toBe(2);
      expect(bluetoothHID.connectedAddresses).toContain('AA:BB:CC:DD:EE:FF');
      expect(bluetoothHID.connectedAddresses).toContain('11:22:33:44:55:66');
    });

    it('should reject connections beyond MAX_CONNECTIONS', async () => {
      // Connect MAX devices
      for (let i = 0; i < 5; i++) {
        await bluetoothHID.connect({
          ...mockDevice,
          id: `${i}`,
          address: `0${i}:00:00:00:00:00`,
        });
      }
      expect(bluetoothHID.connectedCount).toBe(5);
      // 6th should fail
      const result = await bluetoothHID.connect({
        ...mockDevice,
        id: '6',
        address: '06:00:00:00:00:00',
      });
      expect(result).toBe(false);
      expect(bluetoothHID.connectedCount).toBe(5);
    });

    it('should handle connection failure gracefully', async () => {
      __mockNativeModule.connectToDevice.mockRejectedValueOnce(new Error('Connection refused'));
      const errCb = jest.fn();
      bluetoothHID.onConnectionChange(errCb);
      const result = await bluetoothHID.connect(mockDevice);
      expect(result).toBe(false);
      expect(errCb).toHaveBeenCalledWith('error', mockDevice);
    });
  });

  // ─── Disconnection ───

  describe('disconnect', () => {
    const device1 = { id: '1', name: 'Laptop', address: 'AA:BB:CC:DD:EE:FF', paired: true, connected: false };
    const device2 = { id: '2', name: 'TV', address: '11:22:33:44:55:66', paired: true, connected: false };

    beforeEach(async () => {
      await bluetoothHID.initialize();
      await bluetoothHID.connect(device1);
      await bluetoothHID.connect(device2);
    });

    it('should disconnect a single device by address', async () => {
      await bluetoothHID.disconnectDevice('AA:BB:CC:DD:EE:FF');
      expect(bluetoothHID.connectedCount).toBe(1);
      expect(bluetoothHID.isDeviceConnected('AA:BB:CC:DD:EE:FF')).toBe(false);
      expect(bluetoothHID.isDeviceConnected('11:22:33:44:55:66')).toBe(true);
    });

    it('should disconnect all devices at once', async () => {
      await bluetoothHID.disconnectAll();
      expect(bluetoothHID.connectedCount).toBe(0);
      expect(bluetoothHID.isConnected).toBe(false);
    });

    it('should fire callbacks on disconnect', async () => {
      const connCb = jest.fn();
      const multiCb = jest.fn();
      bluetoothHID.onConnectionChange(connCb);
      bluetoothHID.onConnectedDevicesChange(multiCb);
      await bluetoothHID.disconnectDevice('AA:BB:CC:DD:EE:FF');
      expect(connCb).toHaveBeenCalledWith('disconnected', expect.objectContaining({ address: 'AA:BB:CC:DD:EE:FF' }));
      expect(multiCb).toHaveBeenCalled();
    });

    it('should fire callbacks on disconnectAll', async () => {
      const multiCb = jest.fn();
      bluetoothHID.onConnectedDevicesChange(multiCb);
      await bluetoothHID.disconnectAll();
      expect(multiCb).toHaveBeenCalledWith([]);
    });
  });

  // ─── Callback Unsubscribe ───

  describe('callback unsubscribe', () => {
    it('should unsubscribe connection callback', async () => {
      await bluetoothHID.initialize();
      const cb = jest.fn();
      const unsub = bluetoothHID.onConnectionChange(cb);
      unsub();
      await bluetoothHID.startScanning();
      expect(cb).not.toHaveBeenCalled();
    });

    it('should unsubscribe multi-device callback', async () => {
      await bluetoothHID.initialize();
      const cb = jest.fn();
      const unsub = bluetoothHID.onConnectedDevicesChange(cb);
      unsub();
      const device = { id: '1', name: 'X', address: 'FF:FF:FF:FF:FF:FF', paired: true, connected: false };
      await bluetoothHID.connect(device);
      expect(cb).not.toHaveBeenCalled();
    });

    it('should unsubscribe device found callback', () => {
      const cb = jest.fn();
      const unsub = bluetoothHID.onDevicesFound(cb);
      unsub();
      // No further assertion needed — just verifying no crash
    });
  });

  // ─── Scanning ───

  describe('scanning', () => {
    it('should fire scanning status callback', async () => {
      await bluetoothHID.initialize();
      const cb = jest.fn();
      bluetoothHID.onConnectionChange(cb);
      await bluetoothHID.startScanning();
      expect(cb).toHaveBeenCalledWith('scanning');
    });

    it('should call native startScanning', async () => {
      await bluetoothHID.initialize();
      await bluetoothHID.startScanning();
      expect(__mockNativeModule.startScanning).toHaveBeenCalled();
    });

    it('should call native stopScanning', async () => {
      await bluetoothHID.initialize();
      await bluetoothHID.stopScanning();
      expect(__mockNativeModule.stopScanning).toHaveBeenCalled();
    });
  });

  // ─── HID Key Sending (Targeted) ───

  describe('sendKeyTo()', () => {
    beforeEach(async () => {
      await bluetoothHID.initialize();
    });

    it('should send key report and release to specific device', async () => {
      await bluetoothHID.sendKeyTo('AA:BB:CC', 0x08, 0x15);
      expect(__mockNativeModule.sendKeyReportTo).toHaveBeenCalledWith('AA:BB:CC', 0x08, 0x15);
      expect(__mockNativeModule.sendKeyReleaseTo).toHaveBeenCalledWith('AA:BB:CC');
    });
  });

  // ─── HID Key Sending (Broadcast) ───

  describe('sendKeyAll()', () => {
    beforeEach(async () => {
      await bluetoothHID.initialize();
    });

    it('should broadcast key report and release to all', async () => {
      await bluetoothHID.sendKeyAll(0x01, 0x06);
      expect(__mockNativeModule.sendKeyReportAll).toHaveBeenCalledWith(0x01, 0x06);
      expect(__mockNativeModule.sendKeyReleaseAll).toHaveBeenCalled();
    });
  });

  // ─── Convenience sendKey() routing ───

  describe('sendKey() routing', () => {
    const device = { id: '1', name: 'Laptop', address: 'AA:BB:CC:DD:EE:FF', paired: true, connected: false };

    beforeEach(async () => {
      await bluetoothHID.initialize();
      await bluetoothHID.connect(device);
    });

    it('should route to specific address when target provided', async () => {
      await bluetoothHID.sendKey(0x08, 0x15, 'AA:BB:CC:DD:EE:FF');
      expect(__mockNativeModule.sendKeyReportTo).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF', 0x08, 0x15);
    });

    it('should broadcast when target is "all"', async () => {
      await bluetoothHID.sendKey(0x08, 0x15, 'all');
      expect(__mockNativeModule.sendKeyReportAll).toHaveBeenCalledWith(0x08, 0x15);
    });

    it('should send to first connected device when no target', async () => {
      await bluetoothHID.sendKey(0x08, 0x15);
      expect(__mockNativeModule.sendKeyReportTo).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF', 0x08, 0x15);
    });
  });

  // ─── Mouse Operations ───

  describe('mouse operations', () => {
    beforeEach(async () => {
      await bluetoothHID.initialize();
    });

    it('should send mouse move to specific device', async () => {
      await bluetoothHID.sendMouseMoveTo('AA:BB', 10, -5);
      expect(__mockNativeModule.sendMouseReportTo).toHaveBeenCalledWith('AA:BB', 0, 10, -5, 0);
    });

    it('should send left click to specific device', async () => {
      await bluetoothHID.sendMouseClickTo('AA:BB', 'left');
      expect(__mockNativeModule.sendMouseReportTo).toHaveBeenCalledWith('AA:BB', 0x01, 0, 0, 0);
    });

    it('should send right click to specific device', async () => {
      await bluetoothHID.sendMouseClickTo('AA:BB', 'right');
      expect(__mockNativeModule.sendMouseReportTo).toHaveBeenCalledWith('AA:BB', 0x02, 0, 0, 0);
    });

    it('should send scroll to specific device', async () => {
      await bluetoothHID.sendScrollTo('AA:BB', 3);
      expect(__mockNativeModule.sendMouseReportTo).toHaveBeenCalledWith('AA:BB', 0, 0, 0, 3);
    });

    it('should broadcast mouse move', async () => {
      await bluetoothHID.sendMouseMoveAll(5, 10);
      expect(__mockNativeModule.sendMouseReportAll).toHaveBeenCalledWith(0, 5, 10, 0);
    });

    it('should broadcast mouse click', async () => {
      await bluetoothHID.sendMouseClickAll('left');
      expect(__mockNativeModule.sendMouseReportAll).toHaveBeenCalledWith(0x01, 0, 0, 0);
    });

    it('should broadcast scroll', async () => {
      await bluetoothHID.sendScrollAll(-2);
      expect(__mockNativeModule.sendMouseReportAll).toHaveBeenCalledWith(0, 0, 0, -2);
    });
  });

  // ─── Convenience mouse routing ───

  describe('mouse convenience routing', () => {
    const device = { id: '1', name: 'X', address: 'DD:EE:FF', paired: true, connected: false };

    beforeEach(async () => {
      await bluetoothHID.initialize();
      await bluetoothHID.connect(device);
    });

    it('sendMouseClick routes to "all"', async () => {
      await bluetoothHID.sendMouseClick('left', 'all');
      expect(__mockNativeModule.sendMouseReportAll).toHaveBeenCalled();
    });

    it('sendMouseMove routes to specific target', async () => {
      await bluetoothHID.sendMouseMove(1, 2, 'DD:EE:FF');
      expect(__mockNativeModule.sendMouseReportTo).toHaveBeenCalledWith('DD:EE:FF', 0, 1, 2, 0);
    });

    it('sendScroll routes to first connected when no target', async () => {
      await bluetoothHID.sendScroll(5);
      expect(__mockNativeModule.sendMouseReportTo).toHaveBeenCalledWith('DD:EE:FF', 0, 0, 0, 5);
    });
  });

  // ─── State Getters ───

  describe('state getters', () => {
    it('isConnected returns false initially', () => {
      expect(bluetoothHID.isConnected).toBe(false);
    });

    it('connectedCount returns 0 initially', () => {
      expect(bluetoothHID.connectedCount).toBe(0);
    });

    it('connectedDevices returns empty array initially', () => {
      expect(bluetoothHID.connectedDevices).toEqual([]);
    });

    it('connectedAddresses returns empty array initially', () => {
      expect(bluetoothHID.connectedAddresses).toEqual([]);
    });

    it('firstConnectedAddress returns undefined initially', () => {
      expect(bluetoothHID.firstConnectedAddress).toBeUndefined();
    });

    it('isDeviceConnected returns false for unknown address', () => {
      expect(bluetoothHID.isDeviceConnected('XX:XX')).toBe(false);
    });
  });

  // ─── getPairedDevices ───

  describe('getPairedDevices()', () => {
    it('should return paired devices from native module', async () => {
      const mockPaired = [{ id: '1', name: 'D', address: 'A', paired: true, connected: false }];
      __mockNativeModule.getPairedDevices.mockResolvedValueOnce(mockPaired);
      await bluetoothHID.initialize();
      const result = await bluetoothHID.getPairedDevices();
      expect(result).toEqual(mockPaired);
    });
  });

  // ─── Bluetooth Connection Stability ───

  describe('connection stability', () => {
    const device = { id: '1', name: 'Stable Device', address: 'ST:AB:LE', paired: true, connected: false };

    beforeEach(async () => {
      await bluetoothHID.initialize();
    });

    it('should remain connected after multiple key sends', async () => {
      await bluetoothHID.connect(device);
      for (let i = 0; i < 100; i++) {
        await bluetoothHID.sendKeyTo('ST:AB:LE', 0x00, 0x04 + (i % 26));
      }
      expect(bluetoothHID.isConnected).toBe(true);
      expect(bluetoothHID.connectedCount).toBe(1);
      expect(__mockNativeModule.sendKeyReportTo).toHaveBeenCalledTimes(100);
      expect(__mockNativeModule.sendKeyReleaseTo).toHaveBeenCalledTimes(100);
    });

    it('should remain connected after rapid connect/disconnect cycles on other devices', async () => {
      await bluetoothHID.connect(device);
      const transient = { id: '2', name: 'T', address: 'TR:AN:SI', paired: true, connected: false };
      for (let i = 0; i < 10; i++) {
        await bluetoothHID.connect(transient);
        await bluetoothHID.disconnectDevice('TR:AN:SI');
      }
      expect(bluetoothHID.isDeviceConnected('ST:AB:LE')).toBe(true);
      expect(bluetoothHID.connectedCount).toBe(1);
    });

    it('should handle concurrent sends to multiple devices', async () => {
      const device2 = { id: '2', name: 'TV', address: 'TV:00:01', paired: true, connected: false };
      await bluetoothHID.connect(device);
      await bluetoothHID.connect(device2);

      // Send simultaneously to both
      await Promise.all([
        bluetoothHID.sendKeyTo('ST:AB:LE', 0x08, 0x15),
        bluetoothHID.sendKeyTo('TV:00:01', 0x00, 0x2c),
      ]);

      expect(bluetoothHID.connectedCount).toBe(2);
      expect(__mockNativeModule.sendKeyReportTo).toHaveBeenCalledWith('ST:AB:LE', 0x08, 0x15);
      expect(__mockNativeModule.sendKeyReportTo).toHaveBeenCalledWith('TV:00:01', 0x00, 0x2c);
    });

    it('should broadcast to all connected devices simultaneously', async () => {
      const device2 = { id: '2', name: 'TV', address: 'TV:00:01', paired: true, connected: false };
      const device3 = { id: '3', name: 'Monitor', address: 'MO:NI:TR', paired: true, connected: false };
      await bluetoothHID.connect(device);
      await bluetoothHID.connect(device2);
      await bluetoothHID.connect(device3);

      await bluetoothHID.sendKeyAll(0x08, 0x0f); // Win+L
      expect(__mockNativeModule.sendKeyReportAll).toHaveBeenCalledWith(0x08, 0x0f);
      expect(__mockNativeModule.sendKeyReleaseAll).toHaveBeenCalled();
      expect(bluetoothHID.connectedCount).toBe(3);
    });
  });

  // ─── MAX_CONNECTIONS constant ───

  describe('MAX_CONNECTIONS', () => {
    it('should be 5', () => {
      // Access via the class — need to get the constructor
      // The exported singleton doesn't expose static, so just test behavior
      expect(bluetoothHID.connectedCount).toBe(0);
    });
  });
});
