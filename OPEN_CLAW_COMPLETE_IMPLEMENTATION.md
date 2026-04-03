# Open Claw - Complete Implementation Guide

## What is Open Claw?

One Android app that turns your phone into a wireless voice-controlled keyboard/mouse for any laptop or TV. No software installation on the target device. No hardware needed. Zero cost.

```
+---------------------------+                    +-------------------+
|   Open Claw App           |                    |  Laptop / TV      |
|   (Your Phone)            |   Bluetooth HID    |                   |
|                           | -----------------> |  Sees phone as    |
| - Voice input (STT)       |   (Keyboard/Mouse) |  a real keyboard  |
| - AI command parser       |                    |                   |
| - Bluetooth HID sender    |                    |  NO INSTALL       |
| - TTS output              |                    |  NEEDED           |
+---------------------------+                    +-------------------+
```

**Multi-device:** Connect up to 5 devices simultaneously. Send commands to one device or broadcast to all at once.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native + Expo SDK 55 | App framework |
| TypeScript | Type safety |
| expo-router | Tab navigation |
| expo-speech | Text-to-speech |
| expo-linear-gradient | UI gradients |
| react-native-reanimated | Animations |
| Android BluetoothHidDevice API | Bluetooth HID (API 28+) |
| Android SpeechRecognizer | Voice input |
| Qwen 2.5 / Ollama (optional) | AI command parsing |

---

## Project Structure

```
OpenClaw/
|-- app.json                          # Expo config, permissions, plugins
|-- package.json                      # Dependencies
|-- tsconfig.json                     # TypeScript config
|-- index.ts                          # Entry point (expo-router)
|
|-- app/                              # Screens (expo-router file-based routing)
|   |-- _layout.tsx                   # Tab navigator (Connect, Voice, Remote, Settings)
|   |-- index.tsx                     # Connect screen - pair & manage devices
|   |-- voice.tsx                     # Voice command screen - STT + manual input
|   |-- remote.tsx                    # Quick action grid - 20+ one-tap buttons
|   |-- settings.tsx                  # AI endpoint, TTS, Bluetooth settings
|
|-- src/
|   |-- services/
|   |   |-- BluetoothHID.ts           # Bluetooth HID service (multi-device)
|   |   |-- CommandRouter.ts          # Voice text -> keystroke commands
|   |   |-- KeyboardMapper.ts         # HID keystroke executor + sequences
|   |
|   |-- components/
|   |   |-- AnimatedBackground.tsx    # Floating particles + gradient background
|   |   |-- GlassCard.tsx             # Glassmorphism card with glow
|   |   |-- ScalePress.tsx            # Bouncy press animation wrapper
|   |   |-- FadeInView.tsx            # Fade + slide entrance animation
|   |   |-- VoiceButton.tsx           # Mic button with ripple rings
|   |   |-- ConnectedDevicesBar.tsx   # Device selector chips bar
|   |   |-- DeviceCard.tsx            # Bluetooth device list item
|   |   |-- StatusBadge.tsx           # Connection status indicator
|   |   |-- CommandLog.tsx            # Command history list
|   |
|   |-- hooks/
|   |   |-- useBluetooth.ts           # Bluetooth state management
|   |   |-- useVoiceRecognition.ts    # Android STT hook
|   |   |-- useSettings.ts            # Persisted app settings
|   |
|   |-- constants/
|   |   |-- keycodes.ts               # USB HID keycode map + char mapping
|   |   |-- theme.ts                  # Dark theme colors, spacing, fonts
|   |
|   |-- types/
|       |-- index.ts                  # TypeScript interfaces
|
|-- modules/bluetooth-hid/            # Native Android module
    |-- expo-module.config.json       # Expo auto-linking config
    |-- android/
        |-- build.gradle              # Android build config (minSdk 28)
        |-- src/main/
            |-- AndroidManifest.xml   # Bluetooth permissions
            |-- java/com/openclaw/bluetoothhid/
                |-- BluetoothHIDModule.java      # BT HID keyboard/mouse
                |-- BluetoothHIDPackage.java     # React Native package
                |-- VoiceRecognitionModule.java   # Native speech recognizer
```

---

## How It Works - Complete Flow

### 1. User Speaks a Command

```
User says: "Play Arijit Singh on YouTube"
                    |
                    v
         Phone microphone captures audio
                    |
                    v
         Android SpeechRecognizer (STT)
         Converts speech to text
                    |
                    v
         transcript = "Play Arijit Singh on YouTube"
```

**Code path:** `useVoiceRecognition.ts` -> Android `VoiceRecognitionModule.java` -> `SpeechRecognizer` API

### 2. App Parses the Command

```
"Play Arijit Singh on YouTube"
                |
                v
    CommandRouter.parseCommand(text)
                |
    Tries regex: /play\s+(.+)\s+on\s+youtube/i
                |
    Match found! capture group = "Arijit Singh"
                |
                v
    Returns ParsedCommand {
      target: 'laptop',
      action: 'searchYouTube',
      keystrokes: [Win+R, "chrome", Enter, wait, Ctrl+L, "youtube.com", Enter, wait, Tab*3, "Arijit Singh", Enter],
      ttsResponse: "Playing Arijit Singh on YouTube"
    }
```

**If no regex match:** Falls back to Qwen 2.5 AI via Ollama API (if configured in Settings).

**Code path:** `CommandRouter.ts` -> `parseCommand()` or `parseCommandWithAI()`

### 3. Keystrokes Sent via Bluetooth HID

```
Phone                              Laptop
  |                                  |
  |-- HID Report: Win+R ----------->|  Run dialog opens
  |   [modifier=0x08, key=0x15]     |
  |                                  |
  |-- HID Report: 'c' ------------->|  Types 'c'
  |-- HID Report: 'h' ------------->|  Types 'h'
  |-- HID Report: 'r' ------------->|  ...
  |-- HID Report: 'o' ------------->|
  |-- HID Report: 'm' ------------->|
  |-- HID Report: 'e' ------------->|  "chrome" typed
  |-- HID Report: Enter ----------->|  Chrome launches
  |                                  |
  |   (wait 2000ms)                  |  Chrome loads
  |                                  |
  |-- HID Report: Ctrl+L ---------->|  Address bar focused
  |-- HID Report: 'y','o','u'... -->|  "youtube.com" typed
  |-- HID Report: Enter ----------->|  YouTube loads
  |                                  |
  |   (wait 3000ms)                  |  Page loads
  |                                  |
  |-- HID Report: Tab (x3) -------->|  Search bar focused
  |-- HID Report: 'A','r','i'... -->|  "Arijit Singh" typed
  |-- HID Report: Enter ----------->|  Search results!
```

**HID Report format (keyboard):**
```
Byte 0: Modifier keys (Ctrl=0x01, Shift=0x02, Alt=0x04, Win=0x08)
Byte 1: Reserved (0x00)
Byte 2-7: Up to 6 simultaneous key codes
```

**HID Report format (mouse):**
```
Byte 0: Buttons (left=0x01, right=0x02)
Byte 1: X movement (-127 to 127)
Byte 2: Y movement (-127 to 127)
Byte 3: Scroll wheel (-127 to 127)
```

**Code path:** `KeyboardMapper.ts` -> `executeKeyActions()` -> `BluetoothHID.ts` -> `BluetoothHIDModule.java` -> `BluetoothHidDevice.sendReport()`

### 4. TTS Response to User

```
Phone speaks: "Playing Arijit Singh on YouTube"

Command log shows:
  [checkmark] 10:34 AM
  "Play Arijit Singh on YouTube"
  Searching YouTube for "Arijit Singh"
```

**Code path:** `expo-speech` -> `Speech.speak(command.ttsResponse)`

---

## Multi-Device Architecture

### Connection Model

```
Phone (Open Claw)
    |
    |-- BT HID --> Laptop A  (HP Pavilion)
    |-- BT HID --> Laptop B  (Dell Inspiron)
    |-- BT HID --> TV        (Smart TV)
    |-- BT HID --> Desktop   (ASUS ROG)
    |-- BT HID --> Tablet    (Surface Pro)
    |
    Max: 5 simultaneous connections
```

### How Devices Are Identified

Each device has a unique Bluetooth MAC address:

```
connectedDevices = {
  "A4:34:D9:1F:8C:02" -> HP Pavilion Gaming
  "B8:27:EB:3A:F1:44" -> Dell Inspiron 15
  "DC:A6:32:7E:5B:90" -> Smart TV
}
```

### Targeting Modes

**Single device:** `sendKeyReportTo(address, modifier, keyCode)` - only that device receives input

**Broadcast:** `sendKeyReportAll(modifier, keyCode)` - all connected devices receive input simultaneously

**UI selector:** Tap device chip to switch target

```
[All] [HP Pavilion*] [Dell Inspiron] [Smart TV]
                 ^ selected - only this gets keystrokes
```

### Native Java Implementation

```java
// Single device
public void sendKeyReportTo(String address, int modifier, int keyCode, Promise promise) {
    BluetoothDevice device = connectedDevices.get(address);
    byte[] report = new byte[]{(byte) modifier, 0x00, (byte) keyCode, 0, 0, 0, 0, 0};
    hidDevice.sendReport(device, 1, report);
}

// Broadcast to all
public void sendKeyReportAll(int modifier, int keyCode, Promise promise) {
    byte[] report = new byte[]{(byte) modifier, 0x00, (byte) keyCode, 0, 0, 0, 0, 0};
    for (BluetoothDevice device : connectedDevices.values()) {
        hidDevice.sendReport(device, 1, report);
    }
}
```

---

## Supported Voice Commands

### Application Control

| Command | Keystrokes Sent |
|---|---|
| "Open Chrome" | Win+R -> "chrome" -> Enter |
| "Open VS Code" | Win+R -> "code" -> Enter |
| "Open Notepad" | Win+R -> "notepad" -> Enter |
| "Open File Explorer" | Win+E |
| "Open Task Manager" | Ctrl+Shift+Esc |
| "Open [any app name]" | Win+R -> app name -> Enter |

### Web & Search

| Command | Keystrokes Sent |
|---|---|
| "Play [song] on YouTube" | Open Chrome -> youtube.com -> search query -> Enter |
| "Search [query] on Google" | Open Chrome -> google.com -> query -> Enter |
| "Go to [url]" | Open Chrome -> Ctrl+L -> URL -> Enter |
| "New tab" | Ctrl+T |
| "Close tab" | Ctrl+W |
| "Refresh" | F5 |
| "Fullscreen" | F11 |

### Window Management

| Command | Keystrokes Sent |
|---|---|
| "Close window" | Alt+F4 |
| "Minimize all" / "Show desktop" | Win+D |
| "Switch app" | Alt+Tab |
| "Lock the laptop" | Win+L |
| "Take a screenshot" | Win+PrintScreen |

### Media Control

| Command | Keystrokes Sent |
|---|---|
| "Volume up" | Volume Up key (x3) |
| "Volume down" | Volume Down key (x3) |
| "Mute" | Mute key |
| "Play/Pause" | Space |

### System Power

| Command | Keystrokes Sent |
|---|---|
| "Shutdown laptop" | Win+R -> "shutdown /s /t 60" -> Enter (with confirmation) |
| "Restart" | Win+R -> "shutdown /r /t 60" -> Enter |
| "Sleep" | Win+R -> "rundll32.exe powrprof.dll,SetSuspendState 0,1,0" -> Enter |

### Text Input

| Command | Action |
|---|---|
| "Type hello world" | Types "hello world" character by character |
| "Press Enter" | Sends Enter key |
| "Press Ctrl+C" | Sends Ctrl+C |

---

## AI Command Parsing (Optional)

When local regex matching fails, the app can forward the command to a Qwen 2.5 instance running via Ollama.

### Setup

1. Install Ollama on any machine on your network
2. Run: `ollama run qwen2.5`
3. In Open Claw Settings, enter: `http://192.168.1.100:11434/v1/chat/completions`

### How It Works

```
User says: "make the screen brighter"
    |
    v
Local regex: no match
    |
    v
Sends to Qwen 2.5:
{
  "model": "qwen2.5",
  "messages": [
    {"role": "system", "content": "You are a command parser..."},
    {"role": "user", "content": "make the screen brighter"}
  ]
}
    |
    v
AI responds: {"action": "pressKey", "key": "f12", "modifiers": []}
    |
    v
App maps to keystrokes and sends via HID
```

### Supported AI Response Actions

```json
{"action": "openApp", "app": "appname"}
{"action": "openUrl", "url": "https://..."}
{"action": "searchYouTube", "query": "search terms"}
{"action": "searchGoogle", "query": "search terms"}
{"action": "typeText", "text": "text to type"}
{"action": "pressKey", "key": "keyname", "modifiers": ["ctrl"]}
{"action": "lockScreen"}
{"action": "screenshot"}
{"action": "closeWindow"}
{"action": "minimizeAll"}
{"action": "volumeUp"} / {"action": "volumeDown"} / {"action": "mute"}
{"action": "shutdown"} / {"action": "restart"} / {"action": "sleep"}
```

---

## UI Design & Animations

### Theme

Dark glassmorphism design with:
- Background: `#0a0a1a` with floating particle animations
- Cards: Semi-transparent with gradient borders and glow effects
- Primary: `#6c63ff` (purple)
- Accent: `#00d4aa` (teal)

### Animated Components

| Component | Animation |
|---|---|
| AnimatedBackground | 12 floating particles with random drift, fade in/out, scale |
| GlassCard | Slide-up + scale spring entrance, gradient shine overlay |
| ScalePress | Spring scale to 0.92x on press, bounce back on release |
| FadeInView | Fade + slide from any direction, staggered delays |
| VoiceButton | 4 expanding ripple rings when listening, state-based gradients, breathe animation |
| StatusBadge | Pulsing dot with glow ring, speed varies by state |
| DeviceCard | Staggered slide-up entrance, border color animates on connect |
| ConnectedDevicesBar | Chips slide in from right with stagger |
| CommandLog | Entries slide in from left with gradient status backgrounds |
| ActionButton (Remote) | Pop-in with spring, per-row stagger delay |

### Screen Breakdown

**Connect Tab:** Logo bounce-in with rotation -> title fade -> status badge pulse -> device list staggered slide-up -> instructions in GlassCard

**Voice Tab:** Particle background (purple tint) -> ConnectedDevicesBar with animated chips -> VoiceButton with 4 ripple rings -> transcript in GlassCard -> pill-shaped input -> command history with status gradients

**Remote Tab:** Particle background -> device bar -> 5 sections of 4 gradient buttons each, pop-in animation staggered by row and column

**Settings Tab:** Particle background -> 4 GlassCard sections with colored glow lines, staggered entrance (0ms, 150ms, 300ms, 450ms) -> gradient stepper buttons -> gradient action buttons

---

## USB HID Keycode Reference

### Modifier Keys (Byte 0 of keyboard report)

```
LEFT_CTRL   = 0x01
LEFT_SHIFT  = 0x02
LEFT_ALT    = 0x04
LEFT_GUI    = 0x08  (Windows key)
RIGHT_CTRL  = 0x10
RIGHT_SHIFT = 0x20
RIGHT_ALT   = 0x40
RIGHT_GUI   = 0x80
```

### Common Key Codes

```
A-Z         = 0x04 - 0x1D
1-0         = 0x1E - 0x27
Enter       = 0x28
Escape      = 0x29
Backspace   = 0x2A
Tab         = 0x2B
Space       = 0x2C
F1-F12      = 0x3A - 0x45
PrintScreen = 0x46
Arrow Keys  = 0x4F - 0x52
Volume Mute = 0xE2
Volume Up   = 0xE9
Volume Down = 0xEA
```

### Character Mapping

Every printable character is mapped to its HID keycode + shift state:
- `a` -> keyCode=0x04, shift=false
- `A` -> keyCode=0x04, shift=true
- `!` -> keyCode=0x1E (1 key), shift=true
- `/` -> keyCode=0x38, shift=false
- `?` -> keyCode=0x38, shift=true

Full mapping in `src/constants/keycodes.ts`.

---

## Android Native Module

### BluetoothHIDModule.java

Registers the phone as a Bluetooth HID combo device (keyboard + mouse) using `BluetoothHidDevice` API (Android 9+).

**Key methods:**

| Method | Purpose |
|---|---|
| `initialize()` | Get BT adapter, register HID app with SDP settings |
| `connectToDevice(address)` | Connect to a paired device (max 5) |
| `disconnectDevice(address)` | Disconnect one device |
| `disconnectAll()` | Disconnect all devices |
| `sendKeyReportTo(address, mod, key)` | Send keystroke to one device |
| `sendKeyReportAll(mod, key)` | Broadcast keystroke to all |
| `sendKeyReleaseTo(address)` | Release keys on one device |
| `sendKeyReleaseAll()` | Release keys on all |
| `sendMouseReportTo(address, btn, dx, dy, wheel)` | Mouse to one device |
| `sendMouseReportAll(btn, dx, dy, wheel)` | Mouse to all |
| `getPairedDevices()` | List paired BT devices |
| `getConnectedDevices()` | List currently connected |
| `getConnectedCount()` | Number connected |
| `isDeviceConnected(address)` | Check if specific device connected |

**HID Report Descriptor:** Defines a combo device with:
- Report ID 1: Keyboard (8 bytes: modifier + reserved + 6 keys)
- Report ID 2: Mouse (4 bytes: buttons + X + Y + wheel)

### VoiceRecognitionModule.java

Wraps Android `SpeechRecognizer` for React Native.

**Events emitted:**
- `onSpeechResult` - final recognized text
- `onSpeechPartialResult` - partial text while speaking
- `onSpeechError` - error description

### BluetoothHIDPackage.java

Standard React Native package registration. Checks API level >= 28 before registering the HID module.

---

## App Settings (Persisted)

Stored in AsyncStorage under `@openclaw_settings`:

```typescript
interface AppSettings {
  aiEndpoint: string;      // Ollama/Qwen API URL (empty = offline only)
  keystrokeDelay: number;  // ms between keystrokes (default: 50)
  ttsEnabled: boolean;     // Speak confirmations (default: true)
  ttsRate: number;         // Speech speed 0.5-2.0 (default: 1.0)
  ttsPitch: number;        // Speech pitch 0.5-2.0 (default: 1.0)
  autoReconnect: boolean;  // Reconnect on app start (default: true)
}
```

---

## Android Permissions Required

```xml
BLUETOOTH              - Basic Bluetooth access
BLUETOOTH_ADMIN        - Manage connections
BLUETOOTH_CONNECT      - Connect to devices (Android 12+)
BLUETOOTH_SCAN         - Discover devices (Android 12+)
BLUETOOTH_ADVERTISE    - Advertise as HID (Android 12+)
RECORD_AUDIO           - Microphone for voice input
ACCESS_FINE_LOCATION   - Required for BT scanning on some Android versions
```

---

## Build & Run

### Development (Mock Mode - Expo Go)

```bash
cd OpenClaw
npx expo start
```

Mock mode: UI works fully, Bluetooth HID commands logged to console, 2 devices auto-connected for testing.

### Production (Real Bluetooth HID)

```bash
cd OpenClaw
npx expo prebuild
npx expo run:android
```

Requires physical Android device with Bluetooth. Cannot test HID in emulator.

### One-Time User Setup

1. Install Open Claw app on phone
2. Open app -> tap "Scan"
3. Select laptop/TV from list
4. Accept Bluetooth pairing on laptop/TV
5. Done! Start speaking commands.

---

## Limits & Requirements

| Requirement | Value |
|---|---|
| Android version | 9+ (API 28) |
| Root needed | No |
| Max connections | 5 simultaneous |
| Laptop install | Nothing |
| Internet needed | No (AI features optional) |
| Cost | Free |

---

## Real-World Usage Examples

### Example 1: Laptop + TV Setup

```
Phone connected to:
  - Laptop (HP Pavilion)    A4:34:D9:1F:8C:02
  - Smart TV                DC:A6:32:7E:5B:90

Target: HP Pavilion
Say: "Open VS Code"          -> Laptop opens VS Code

Target: Smart TV
Say: "Play lofi on YouTube"  -> TV plays YouTube

Target: All
Say: "Volume up"             -> Both devices volume up

Target: Smart TV
Tap: Play/Pause button       -> TV pauses movie
```

### Example 2: Office Multi-Monitor

```
Phone connected to:
  - Work Laptop     B8:27:EB:3A:F1:44
  - Desktop PC      E8:6F:38:92:AE:5C

Say: "Lock the laptop"       -> Target device locks
Say: "Take a screenshot"     -> Target device screenshots
Say: "Open file explorer"    -> Target device opens Explorer
Type: "meeting notes.docx"   -> Types on target device
```

---

## File-by-File Summary

| File | Lines | Purpose |
|---|---|---|
| `app/_layout.tsx` | Tab navigation with 4 tabs, dark theme styling |
| `app/index.tsx` | Connect screen: logo animation, device list, connected banner |
| `app/voice.tsx` | Voice screen: mic button, STT, command processing, history |
| `app/remote.tsx` | Remote screen: 20 quick action buttons in 5 categories |
| `app/settings.tsx` | Settings: AI endpoint, TTS config, BT config, about |
| `src/services/BluetoothHID.ts` | Multi-device BT HID service, targeted + broadcast sends |
| `src/services/CommandRouter.ts` | 30+ regex patterns + AI fallback for command parsing |
| `src/services/KeyboardMapper.ts` | Keystroke executor + 25 pre-built key sequences |
| `src/components/AnimatedBackground.tsx` | Floating particles over gradient |
| `src/components/GlassCard.tsx` | Glassmorphism card with entrance animation |
| `src/components/ScalePress.tsx` | Spring bounce press wrapper |
| `src/components/FadeInView.tsx` | Directional fade+slide entrance |
| `src/components/VoiceButton.tsx` | Mic button with 4 ripple rings, state gradients |
| `src/components/ConnectedDevicesBar.tsx` | Animated device chip selector |
| `src/components/DeviceCard.tsx` | Animated BT device card |
| `src/components/StatusBadge.tsx` | Pulsing connection status dot |
| `src/components/CommandLog.tsx` | Animated command history entries |
| `src/constants/keycodes.ts` | Full USB HID keycode + character map |
| `src/constants/theme.ts` | Colors, spacing, font sizes, border radii |
| `src/hooks/useBluetooth.ts` | Multi-device BT state hook |
| `src/hooks/useVoiceRecognition.ts` | STT hook with native module |
| `src/hooks/useSettings.ts` | AsyncStorage persisted settings |
| `src/types/index.ts` | All TypeScript interfaces |
| `BluetoothHIDModule.java` | Native BT HID with multi-device ConcurrentHashMap |
| `BluetoothHIDPackage.java` | RN package registration |
| `VoiceRecognitionModule.java` | Native Android SpeechRecognizer |

---

## Summary

```
ENTIRE PRODUCT = 1 ANDROID APP

  Voice Input -----> Command Parser -----> Keystroke Builder
  (Android STT)      (Regex + AI)          (HID keycodes)
       |                                        |
       v                                        v
  TTS Response                          Bluetooth HID Send
  ("Playing song")                      (to 1 or all devices)
       |                                        |
       v                                        v
  Phone speaks                          Laptop/TV executes
  + shows log                           the action
```

**One app. Up to 5 devices. Zero install on targets. Zero cost.**
