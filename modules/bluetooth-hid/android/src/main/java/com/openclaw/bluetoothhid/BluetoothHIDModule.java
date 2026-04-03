package com.openclaw.bluetoothhid;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothHidDevice;
import android.bluetooth.BluetoothHidDeviceAppSdpSettings;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@RequiresApi(api = Build.VERSION_CODES.P)
public class BluetoothHIDModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BluetoothHIDModule";
    private static final String MODULE_NAME = "BluetoothHIDModule";
    private static final int MAX_CONNECTIONS = 5;

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothHidDevice hidDevice;
    private boolean isRegistered = false;
    private boolean autoReconnectEnabled = true;
    private boolean isDiscovering = false;
    private final Executor executor = Executors.newSingleThreadExecutor();
    private final ScheduledExecutorService reconnectScheduler = Executors.newSingleThreadScheduledExecutor();

    // Multi-device: track all connected devices by address
    private final Map<String, BluetoothDevice> connectedDevices = new ConcurrentHashMap<>();
    // Track devices that should be auto-reconnected and their retry counts
    private final Map<String, Integer> reconnectRetryCount = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> reconnectTasks = new ConcurrentHashMap<>();
    private static final int MAX_RECONNECT_RETRIES = 10;
    private static final long BASE_RECONNECT_DELAY_MS = 2000; // 2 seconds base delay
    private static final long MAX_RECONNECT_DELAY_MS = 30000; // 30 seconds max delay

    // HID Report Descriptor for Keyboard + Mouse combo
    private static final byte[] HID_REPORT_DESC = new byte[]{
        // Keyboard
        0x05, 0x01,       // Usage Page (Generic Desktop)
        0x09, 0x06,       // Usage (Keyboard)
        (byte) 0xA1, 0x01, // Collection (Application)
        (byte) 0x85, 0x01, // Report ID (1)
        0x05, 0x07,       // Usage Page (Key Codes)
        0x19, (byte) 0xE0, // Usage Minimum (224)
        0x29, (byte) 0xE7, // Usage Maximum (231)
        0x15, 0x00,       // Logical Minimum (0)
        0x25, 0x01,       // Logical Maximum (1)
        0x75, 0x01,       // Report Size (1)
        (byte) 0x95, 0x08, // Report Count (8)
        (byte) 0x81, 0x02, // Input (Data, Variable, Absolute) - Modifier byte
        (byte) 0x95, 0x01, // Report Count (1)
        0x75, 0x08,       // Report Size (8)
        (byte) 0x81, 0x01, // Input (Constant) - Reserved byte
        (byte) 0x95, 0x06, // Report Count (6)
        0x75, 0x08,       // Report Size (8)
        0x15, 0x00,       // Logical Minimum (0)
        0x25, 0x65,       // Logical Maximum (101)
        0x05, 0x07,       // Usage Page (Key Codes)
        0x19, 0x00,       // Usage Minimum (0)
        0x29, 0x65,       // Usage Maximum (101)
        (byte) 0x81, 0x00, // Input (Data, Array) - Key arrays (6 keys)
        (byte) 0xC0,       // End Collection

        // Mouse
        0x05, 0x01,       // Usage Page (Generic Desktop)
        0x09, 0x02,       // Usage (Mouse)
        (byte) 0xA1, 0x01, // Collection (Application)
        (byte) 0x85, 0x02, // Report ID (2)
        0x09, 0x01,       // Usage (Pointer)
        (byte) 0xA1, 0x00, // Collection (Physical)
        0x05, 0x09,       // Usage Page (Buttons)
        0x19, 0x01,       // Usage Minimum (1)
        0x29, 0x03,       // Usage Maximum (3)
        0x15, 0x00,       // Logical Minimum (0)
        0x25, 0x01,       // Logical Maximum (1)
        (byte) 0x95, 0x03, // Report Count (3)
        0x75, 0x01,       // Report Size (1)
        (byte) 0x81, 0x02, // Input (Data, Variable, Absolute) - Buttons
        (byte) 0x95, 0x01, // Report Count (1)
        0x75, 0x05,       // Report Size (5)
        (byte) 0x81, 0x01, // Input (Constant) - Padding
        0x05, 0x01,       // Usage Page (Generic Desktop)
        0x09, 0x30,       // Usage (X)
        0x09, 0x31,       // Usage (Y)
        0x09, 0x38,       // Usage (Wheel)
        0x15, (byte) 0x81, // Logical Minimum (-127)
        0x25, 0x7F,       // Logical Maximum (127)
        0x75, 0x08,       // Report Size (8)
        (byte) 0x95, 0x03, // Report Count (3)
        (byte) 0x81, 0x06, // Input (Data, Variable, Relative) - X, Y, Wheel
        (byte) 0xC0,       // End Collection (Physical)
        (byte) 0xC0        // End Collection (Application)
    };

    public BluetoothHIDModule(ReactApplicationContext reactContext) {
        super(reactContext);
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void initialize(Promise promise) {
        if (bluetoothAdapter == null) {
            promise.reject("BT_NOT_AVAILABLE", "Bluetooth is not available on this device");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            promise.reject("BT_NOT_ENABLED", "Bluetooth is not enabled");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            promise.reject("API_TOO_LOW", "Android 9+ (API 28) required for Bluetooth HID");
            return;
        }

        Log.d(TAG, "Initializing Bluetooth HID on Android " + Build.VERSION.SDK_INT);
        Log.d(TAG, "Device: " + Build.MANUFACTURER + " " + Build.MODEL);

        boolean proxyResult = bluetoothAdapter.getProfileProxy(
            getReactApplicationContext(),
            new BluetoothProfile.ServiceListener() {
                @Override
                public void onServiceConnected(int profile, BluetoothProfile proxy) {
                    Log.d(TAG, "Profile proxy connected: " + profile);
                    if (profile == BluetoothProfile.HID_DEVICE) {
                        hidDevice = (BluetoothHidDevice) proxy;
                        registerHidDevice(promise);
                    }
                }

                @Override
                public void onServiceDisconnected(int profile) {
                    Log.w(TAG, "Profile proxy disconnected");
                    hidDevice = null;
                    isRegistered = false;
                    connectedDevices.clear();
                    sendConnectionEvent(null, "disconnected");
                }
            },
            BluetoothProfile.HID_DEVICE
        );

        if (!proxyResult) {
            Log.e(TAG, "getProfileProxy returned false — HID Device profile not supported on this device");
            promise.reject("HID_NOT_SUPPORTED",
                "Bluetooth HID Device profile is not supported on this device (" +
                Build.MANUFACTURER + " " + Build.MODEL + "). " +
                "This may be a manufacturer restriction.");
            return;
        }

        Log.d(TAG, "getProfileProxy succeeded, waiting for callback...");
    }

    private void registerHidDevice(Promise promise) {
        if (hidDevice == null) {
            promise.reject("HID_NULL", "HID device service not available");
            return;
        }

        BluetoothHidDeviceAppSdpSettings sdpSettings = new BluetoothHidDeviceAppSdpSettings(
            "Variable Claw",
            "Voice-controlled HID keyboard/mouse",
            "VariableClaw",
            BluetoothHidDevice.SUBCLASS1_COMBO,
            HID_REPORT_DESC
        );

        BluetoothHidDevice.Callback callback = new BluetoothHidDevice.Callback() {
            @Override
            public void onAppStatusChanged(BluetoothDevice pluggedDevice, boolean registered) {
                isRegistered = registered;
                Log.d(TAG, "App registered: " + registered);
            }

            @Override
            public void onConnectionStateChanged(BluetoothDevice device, int state) {
                switch (state) {
                    case BluetoothProfile.STATE_CONNECTED:
                        connectedDevices.put(device.getAddress(), device);
                        // Clear reconnect state on successful connection
                        cancelReconnect(device.getAddress());
                        reconnectRetryCount.remove(device.getAddress());
                        sendConnectionEvent(device, "connected");
                        break;
                    case BluetoothProfile.STATE_DISCONNECTED:
                        boolean wasConnected = connectedDevices.containsKey(device.getAddress());
                        connectedDevices.remove(device.getAddress());
                        sendConnectionEvent(device, "disconnected");
                        // Auto-reconnect if the device dropped unexpectedly
                        if (wasConnected && autoReconnectEnabled) {
                            scheduleReconnect(device);
                        }
                        break;
                    case BluetoothProfile.STATE_CONNECTING:
                        sendConnectionEvent(device, "pairing");
                        break;
                }
            }

            @Override
            public void onGetReport(BluetoothDevice device, byte type, byte id, int bufferSize) {
            }

            @Override
            public void onSetReport(BluetoothDevice device, byte type, byte id, byte[] data) {
            }
        };

        Log.d(TAG, "Registering HID app...");
        boolean result = hidDevice.registerApp(
            sdpSettings, null, null, executor, callback
        );

        if (result) {
            Log.d(TAG, "HID app registered successfully!");
            promise.resolve(true);
        } else {
            Log.e(TAG, "registerApp returned false — HID registration failed");
            promise.reject("REGISTER_FAILED",
                "Failed to register as HID device. Your phone (" +
                Build.MANUFACTURER + " " + Build.MODEL +
                ") may not fully support the Bluetooth HID Device profile.");
        }
    }

    @ReactMethod
    public void getPairedDevices(Promise promise) {
        if (bluetoothAdapter == null) {
            promise.reject("BT_NOT_AVAILABLE", "Bluetooth not available");
            return;
        }

        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        WritableArray deviceArray = Arguments.createArray();

        int index = 0;
        for (BluetoothDevice device : pairedDevices) {
            WritableMap deviceMap = Arguments.createMap();
            deviceMap.putString("id", String.valueOf(index++));
            deviceMap.putString("name", device.getName() != null ? device.getName() : "Unknown");
            deviceMap.putString("address", device.getAddress());
            deviceMap.putBoolean("paired", true);
            deviceMap.putBoolean("connected", connectedDevices.containsKey(device.getAddress()));
            deviceArray.pushMap(deviceMap);
        }

        promise.resolve(deviceArray);
    }

    @ReactMethod
    public void getConnectedDevices(Promise promise) {
        WritableArray deviceArray = Arguments.createArray();
        int index = 0;
        for (Map.Entry<String, BluetoothDevice> entry : connectedDevices.entrySet()) {
            BluetoothDevice device = entry.getValue();
            WritableMap deviceMap = Arguments.createMap();
            deviceMap.putString("id", String.valueOf(index++));
            deviceMap.putString("name", device.getName() != null ? device.getName() : "Unknown");
            deviceMap.putString("address", device.getAddress());
            deviceMap.putBoolean("paired", true);
            deviceMap.putBoolean("connected", true);
            deviceArray.pushMap(deviceMap);
        }
        promise.resolve(deviceArray);
    }

    @ReactMethod
    public void connectToDevice(String address, Promise promise) {
        if (hidDevice == null || !isRegistered) {
            promise.reject("NOT_READY", "HID device not ready. Call initialize() first.");
            return;
        }

        if (connectedDevices.size() >= MAX_CONNECTIONS) {
            promise.reject("MAX_REACHED", "Maximum " + MAX_CONNECTIONS + " connections allowed. Disconnect a device first.");
            return;
        }

        BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
        if (device == null) {
            promise.reject("DEVICE_NOT_FOUND", "Device not found: " + address);
            return;
        }

        boolean result = hidDevice.connect(device);
        if (result) {
            promise.resolve(true);
        } else {
            promise.reject("CONNECT_FAILED", "Failed to initiate connection");
        }
    }

    @ReactMethod
    public void disconnectDevice(String address, Promise promise) {
        // Intentional disconnect — cancel any pending reconnect
        cancelReconnect(address);
        reconnectRetryCount.remove(address);

        if (hidDevice == null) {
            promise.resolve(null);
            return;
        }

        BluetoothDevice device = connectedDevices.get(address);
        if (device != null) {
            hidDevice.disconnect(device);
            connectedDevices.remove(address);
        }
        promise.resolve(null);
    }

    @ReactMethod
    public void disconnectAll(Promise promise) {
        // Intentional disconnect — cancel all pending reconnects
        cancelAllReconnects();

        if (hidDevice != null) {
            for (BluetoothDevice device : connectedDevices.values()) {
                hidDevice.disconnect(device);
            }
        }
        connectedDevices.clear();
        promise.resolve(null);
    }

    // Send key report to a specific device by address
    @ReactMethod
    public void sendKeyReportTo(String address, int modifier, int keyCode, Promise promise) {
        BluetoothDevice device = connectedDevices.get(address);
        if (hidDevice == null || device == null) {
            promise.reject("NOT_CONNECTED", "Device not connected: " + address);
            return;
        }

        byte[] report = new byte[]{
            (byte) modifier, 0x00, (byte) keyCode, 0x00, 0x00, 0x00, 0x00, 0x00
        };

        boolean result = hidDevice.sendReport(device, 1, report);
        promise.resolve(result);
    }

    // Send key release to a specific device by address
    @ReactMethod
    public void sendKeyReleaseTo(String address, Promise promise) {
        BluetoothDevice device = connectedDevices.get(address);
        if (hidDevice == null || device == null) {
            promise.reject("NOT_CONNECTED", "Device not connected: " + address);
            return;
        }

        byte[] report = new byte[]{0, 0, 0, 0, 0, 0, 0, 0};
        boolean result = hidDevice.sendReport(device, 1, report);
        promise.resolve(result);
    }

    // Send mouse report to a specific device by address
    @ReactMethod
    public void sendMouseReportTo(String address, int buttons, int dx, int dy, int wheel, Promise promise) {
        BluetoothDevice device = connectedDevices.get(address);
        if (hidDevice == null || device == null) {
            promise.reject("NOT_CONNECTED", "Device not connected: " + address);
            return;
        }

        byte[] report = new byte[]{
            (byte) buttons,
            (byte) Math.max(-127, Math.min(127, dx)),
            (byte) Math.max(-127, Math.min(127, dy)),
            (byte) Math.max(-127, Math.min(127, wheel))
        };

        boolean result = hidDevice.sendReport(device, 2, report);
        promise.resolve(result);
    }

    // Broadcast: send key report to ALL connected devices
    @ReactMethod
    public void sendKeyReportAll(int modifier, int keyCode, Promise promise) {
        if (hidDevice == null || connectedDevices.isEmpty()) {
            promise.reject("NOT_CONNECTED", "No devices connected");
            return;
        }

        byte[] report = new byte[]{
            (byte) modifier, 0x00, (byte) keyCode, 0x00, 0x00, 0x00, 0x00, 0x00
        };

        boolean allOk = true;
        for (BluetoothDevice device : connectedDevices.values()) {
            if (!hidDevice.sendReport(device, 1, report)) {
                allOk = false;
            }
        }
        promise.resolve(allOk);
    }

    // Broadcast: send key release to ALL connected devices
    @ReactMethod
    public void sendKeyReleaseAll(Promise promise) {
        if (hidDevice == null || connectedDevices.isEmpty()) {
            promise.reject("NOT_CONNECTED", "No devices connected");
            return;
        }

        byte[] report = new byte[]{0, 0, 0, 0, 0, 0, 0, 0};
        boolean allOk = true;
        for (BluetoothDevice device : connectedDevices.values()) {
            if (!hidDevice.sendReport(device, 1, report)) {
                allOk = false;
            }
        }
        promise.resolve(allOk);
    }

    // Broadcast: send mouse report to ALL connected devices
    @ReactMethod
    public void sendMouseReportAll(int buttons, int dx, int dy, int wheel, Promise promise) {
        if (hidDevice == null || connectedDevices.isEmpty()) {
            promise.reject("NOT_CONNECTED", "No devices connected");
            return;
        }

        byte[] report = new byte[]{
            (byte) buttons,
            (byte) Math.max(-127, Math.min(127, dx)),
            (byte) Math.max(-127, Math.min(127, dy)),
            (byte) Math.max(-127, Math.min(127, wheel))
        };

        boolean allOk = true;
        for (BluetoothDevice device : connectedDevices.values()) {
            if (!hidDevice.sendReport(device, 2, report)) {
                allOk = false;
            }
        }
        promise.resolve(allOk);
    }

    @ReactMethod
    public void getConnectedCount(Promise promise) {
        promise.resolve(connectedDevices.size());
    }

    @ReactMethod
    public void isDeviceConnected(String address, Promise promise) {
        promise.resolve(connectedDevices.containsKey(address));
    }

    private final BroadcastReceiver discoveryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device != null && device.getName() != null) {
                    Log.d(TAG, "Discovered device: " + device.getName() + " (" + device.getAddress() + ")");
                    sendDiscoveredDevice(device);
                }
            } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                Log.d(TAG, "Bluetooth discovery finished");
                isDiscovering = false;
                try {
                    getReactApplicationContext().unregisterReceiver(this);
                } catch (Exception e) {
                    Log.w(TAG, "Receiver already unregistered");
                }
            }
        }
    };

    private void sendDiscoveredDevice(BluetoothDevice device) {
        WritableMap deviceMap = Arguments.createMap();
        deviceMap.putString("id", device.getAddress());
        deviceMap.putString("name", device.getName() != null ? device.getName() : "Unknown");
        deviceMap.putString("address", device.getAddress());
        deviceMap.putBoolean("paired", device.getBondState() == BluetoothDevice.BOND_BONDED);
        deviceMap.putBoolean("connected", connectedDevices.containsKey(device.getAddress()));

        WritableMap params = Arguments.createMap();
        WritableArray devices = Arguments.createArray();
        devices.pushMap(deviceMap);
        params.putArray("devices", devices);

        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onDeviceFound", params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending discovered device event", e);
        }
    }

    @ReactMethod
    public void startScanning(Promise promise) {
        if (bluetoothAdapter == null) {
            promise.reject("BT_NOT_AVAILABLE", "Bluetooth not available");
            return;
        }

        // Stop any ongoing discovery first
        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }

        // Register receiver for discovery events
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        try {
            getReactApplicationContext().registerReceiver(discoveryReceiver, filter);
        } catch (Exception e) {
            Log.w(TAG, "Receiver registration issue: " + e.getMessage());
        }

        isDiscovering = true;
        boolean started = bluetoothAdapter.startDiscovery();
        if (started) {
            Log.d(TAG, "Bluetooth discovery started");
            // Also send paired devices immediately so the UI has something to show
            sendPairedDevicesAsDiscovered();
            promise.resolve(true);
        } else {
            isDiscovering = false;
            promise.reject("SCAN_FAILED", "Failed to start Bluetooth discovery. Check location permissions.");
        }
    }

    private void sendPairedDevicesAsDiscovered() {
        if (bluetoothAdapter == null) return;
        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        for (BluetoothDevice device : pairedDevices) {
            sendDiscoveredDevice(device);
        }
    }

    @ReactMethod
    public void stopScanning(Promise promise) {
        if (bluetoothAdapter != null && bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }
        isDiscovering = false;
        try {
            getReactApplicationContext().unregisterReceiver(discoveryReceiver);
        } catch (Exception e) {
            Log.w(TAG, "Receiver already unregistered");
        }
        promise.resolve(null);
    }

    private void scheduleReconnect(BluetoothDevice device) {
        String address = device.getAddress();
        int retryCount = reconnectRetryCount.getOrDefault(address, 0);

        if (retryCount >= MAX_RECONNECT_RETRIES) {
            Log.w(TAG, "Max reconnect retries reached for " + address + ", giving up");
            reconnectRetryCount.remove(address);
            return;
        }

        // Exponential backoff: 2s, 4s, 8s, 16s, 30s, 30s...
        long delay = Math.min(BASE_RECONNECT_DELAY_MS * (1L << retryCount), MAX_RECONNECT_DELAY_MS);
        reconnectRetryCount.put(address, retryCount + 1);

        Log.d(TAG, "Scheduling reconnect for " + address + " in " + delay + "ms (attempt " + (retryCount + 1) + "/" + MAX_RECONNECT_RETRIES + ")");

        ScheduledFuture<?> task = reconnectScheduler.schedule(() -> {
            if (!autoReconnectEnabled || hidDevice == null || !isRegistered) return;
            if (connectedDevices.containsKey(address)) return; // Already reconnected

            Log.d(TAG, "Attempting reconnect to " + address);
            try {
                boolean result = hidDevice.connect(device);
                if (!result) {
                    Log.w(TAG, "Reconnect attempt failed for " + address);
                    // The onConnectionStateChanged callback will trigger another retry
                    // if the connection doesn't succeed
                    scheduleReconnect(device);
                }
            } catch (Exception e) {
                Log.e(TAG, "Reconnect error for " + address, e);
                scheduleReconnect(device);
            }
        }, delay, TimeUnit.MILLISECONDS);

        // Store so we can cancel if needed
        ScheduledFuture<?> oldTask = reconnectTasks.put(address, task);
        if (oldTask != null) oldTask.cancel(false);
    }

    private void cancelReconnect(String address) {
        ScheduledFuture<?> task = reconnectTasks.remove(address);
        if (task != null) task.cancel(false);
    }

    private void cancelAllReconnects() {
        for (ScheduledFuture<?> task : reconnectTasks.values()) {
            task.cancel(false);
        }
        reconnectTasks.clear();
        reconnectRetryCount.clear();
    }

    @ReactMethod
    public void setAutoReconnect(boolean enabled, Promise promise) {
        autoReconnectEnabled = enabled;
        if (!enabled) {
            cancelAllReconnects();
        }
        promise.resolve(enabled);
    }

    private void sendConnectionEvent(BluetoothDevice device, String status) {
        WritableMap params = Arguments.createMap();
        params.putString("status", status);
        params.putInt("connectedCount", connectedDevices.size());
        if (device != null) {
            params.putString("deviceAddress", device.getAddress());
            params.putString("deviceName", device.getName() != null ? device.getName() : "Unknown");
        }
        // Include all connected device addresses
        WritableArray addresses = Arguments.createArray();
        for (String addr : connectedDevices.keySet()) {
            addresses.pushString(addr);
        }
        params.putArray("connectedAddresses", addresses);

        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onConnectionStateChanged", params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event", e);
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
    }

    @ReactMethod
    public void removeListeners(int count) {
    }
}
