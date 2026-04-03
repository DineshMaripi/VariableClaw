import { useState, useEffect, useCallback } from 'react';
import { bluetoothHID } from '../services/BluetoothHID';
import { deviceConnectionAgent } from '../services/agents';
import { BluetoothDevice, ConnectionStatus } from '../types';

export function useBluetooth(autoReconnect: boolean = true) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<BluetoothDevice[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Sync autoReconnect setting with the service
  useEffect(() => {
    bluetoothHID.setAutoReconnect(autoReconnect);
  }, [autoReconnect]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Use DeviceConnectionAgent for initialization
        const result = await deviceConnectionAgent.initialize();
        if (!mounted) return;

        if (!result.success) {
          setInitialized(false);
          setInitError(result.error || 'Failed to initialize Bluetooth HID');
          return;
        }

        setInitialized(true);

        // Load paired devices
        const paired = await bluetoothHID.getPairedDevices();
        if (mounted) setDevices(paired);

        // Sync initial connected state
        const currentConnected = bluetoothHID.connectedDevices;
        if (mounted && currentConnected.length > 0) {
          setConnectedDevices(currentConnected);
          setStatus('connected');
        }

        // Auto-connect to available paired devices
        if (autoReconnect && mounted) {
          deviceConnectionAgent.autoConnectDevices().then(({ connected }) => {
            if (mounted && connected.length > 0) {
              setConnectedDevices(bluetoothHID.connectedDevices);
              setStatus('connected');
            }
          });
        }
      } catch (e: any) {
        if (mounted) {
          setInitialized(false);
          setInitError(e?.message || 'Failed to initialize Bluetooth HID');
        }
      }
    }

    init();

    const unsubConnection = bluetoothHID.onConnectionChange((newStatus) => {
      if (mounted) setStatus(newStatus);
    });

    const unsubMulti = bluetoothHID.onConnectedDevicesChange((connDevices) => {
      if (mounted) {
        setConnectedDevices(connDevices);
        setStatus(connDevices.length > 0 ? 'connected' : 'disconnected');
      }
    });

    // Accumulate discovered devices instead of replacing the list
    const unsubDevices = bluetoothHID.onDevicesFound((newDevices) => {
      if (mounted) {
        setDevices(prev => {
          const map = new Map(prev.map(d => [d.address, d]));
          for (const d of newDevices) {
            map.set(d.address, d);
          }
          return Array.from(map.values());
        });
      }
    });

    return () => {
      mounted = false;
      unsubConnection();
      unsubMulti();
      unsubDevices();
    };
  }, []);

  const scan = useCallback(async () => {
    const paired = await deviceConnectionAgent.scanForDevices();
    setDevices(prev => {
      const map = new Map(prev.map(d => [d.address, d]));
      for (const d of paired) {
        map.set(d.address, d);
      }
      return Array.from(map.values());
    });
  }, []);

  const connect = useCallback(async (device: BluetoothDevice) => {
    return await deviceConnectionAgent.connectToDevice(device);
  }, []);

  const disconnectDevice = useCallback(async (address: string) => {
    await deviceConnectionAgent.disconnectDevice(address);
  }, []);

  const disconnectAll = useCallback(async () => {
    await deviceConnectionAgent.disconnectAll();
  }, []);

  const refreshDevices = useCallback(async () => {
    const paired = await bluetoothHID.getPairedDevices();
    setDevices(paired);
  }, []);

  const isDeviceConnected = useCallback((address: string) => {
    return bluetoothHID.isDeviceConnected(address);
  }, [connectedDevices]);

  return {
    status,
    devices,
    connectedDevices,
    connectedCount: connectedDevices.length,
    initialized,
    initError,
    scan,
    connect,
    disconnectDevice,
    disconnectAll,
    refreshDevices,
    isDeviceConnected,
  };
}
