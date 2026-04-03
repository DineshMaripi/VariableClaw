// USB HID Keyboard/Keypad Usage IDs
// Reference: USB HID Usage Tables, Section 10

export const HID_KEY = {
  NONE: 0x00,
  A: 0x04,
  B: 0x05,
  C: 0x06,
  D: 0x07,
  E: 0x08,
  F: 0x09,
  G: 0x0a,
  H: 0x0b,
  I: 0x0c,
  J: 0x0d,
  K: 0x0e,
  L: 0x0f,
  M: 0x10,
  N: 0x11,
  O: 0x12,
  P: 0x13,
  Q: 0x14,
  R: 0x15,
  S: 0x16,
  T: 0x17,
  U: 0x18,
  V: 0x19,
  W: 0x1a,
  X: 0x1b,
  Y: 0x1c,
  Z: 0x1d,
  NUM_1: 0x1e,
  NUM_2: 0x1f,
  NUM_3: 0x20,
  NUM_4: 0x21,
  NUM_5: 0x22,
  NUM_6: 0x23,
  NUM_7: 0x24,
  NUM_8: 0x25,
  NUM_9: 0x26,
  NUM_0: 0x27,
  ENTER: 0x28,
  ESCAPE: 0x29,
  BACKSPACE: 0x2a,
  TAB: 0x2b,
  SPACE: 0x2c,
  MINUS: 0x2d,
  EQUAL: 0x2e,
  LEFT_BRACKET: 0x2f,
  RIGHT_BRACKET: 0x30,
  BACKSLASH: 0x31,
  SEMICOLON: 0x33,
  QUOTE: 0x34,
  GRAVE: 0x35,
  COMMA: 0x36,
  PERIOD: 0x37,
  SLASH: 0x38,
  CAPS_LOCK: 0x39,
  F1: 0x3a,
  F2: 0x3b,
  F3: 0x3c,
  F4: 0x3d,
  F5: 0x3e,
  F6: 0x3f,
  F7: 0x40,
  F8: 0x41,
  F9: 0x42,
  F10: 0x43,
  F11: 0x44,
  F12: 0x45,
  PRINT_SCREEN: 0x46,
  SCROLL_LOCK: 0x47,
  PAUSE: 0x48,
  INSERT: 0x49,
  HOME: 0x4a,
  PAGE_UP: 0x4b,
  DELETE: 0x4c,
  END: 0x4d,
  PAGE_DOWN: 0x4e,
  RIGHT_ARROW: 0x4f,
  LEFT_ARROW: 0x50,
  DOWN_ARROW: 0x51,
  UP_ARROW: 0x52,
  // Media keys
  MUTE: 0xe2,
  VOLUME_UP: 0xe9,
  VOLUME_DOWN: 0xea,
} as const;

// HID Modifier bits (byte 0 of report)
export const HID_MODIFIER = {
  NONE: 0x00,
  LEFT_CTRL: 0x01,
  LEFT_SHIFT: 0x02,
  LEFT_ALT: 0x04,
  LEFT_GUI: 0x08, // Windows/Super key
  RIGHT_CTRL: 0x10,
  RIGHT_SHIFT: 0x20,
  RIGHT_ALT: 0x40,
  RIGHT_GUI: 0x80,
} as const;

// Character to HID keycode mapping
const CHAR_MAP: Record<string, { keyCode: number; shift: boolean }> = {};

// Lowercase letters
for (let i = 0; i < 26; i++) {
  const char = String.fromCharCode(97 + i); // a-z
  CHAR_MAP[char] = { keyCode: HID_KEY.A + i, shift: false };
}
// Uppercase letters
for (let i = 0; i < 26; i++) {
  const char = String.fromCharCode(65 + i); // A-Z
  CHAR_MAP[char] = { keyCode: HID_KEY.A + i, shift: true };
}
// Numbers
const numKeys = [
  HID_KEY.NUM_0, HID_KEY.NUM_1, HID_KEY.NUM_2, HID_KEY.NUM_3, HID_KEY.NUM_4,
  HID_KEY.NUM_5, HID_KEY.NUM_6, HID_KEY.NUM_7, HID_KEY.NUM_8, HID_KEY.NUM_9,
];
for (let i = 0; i <= 9; i++) {
  CHAR_MAP[i.toString()] = { keyCode: numKeys[i], shift: false };
}
// Special characters
CHAR_MAP[' '] = { keyCode: HID_KEY.SPACE, shift: false };
CHAR_MAP['\n'] = { keyCode: HID_KEY.ENTER, shift: false };
CHAR_MAP['\t'] = { keyCode: HID_KEY.TAB, shift: false };
CHAR_MAP['-'] = { keyCode: HID_KEY.MINUS, shift: false };
CHAR_MAP['='] = { keyCode: HID_KEY.EQUAL, shift: false };
CHAR_MAP['['] = { keyCode: HID_KEY.LEFT_BRACKET, shift: false };
CHAR_MAP[']'] = { keyCode: HID_KEY.RIGHT_BRACKET, shift: false };
CHAR_MAP['\\'] = { keyCode: HID_KEY.BACKSLASH, shift: false };
CHAR_MAP[';'] = { keyCode: HID_KEY.SEMICOLON, shift: false };
CHAR_MAP["'"] = { keyCode: HID_KEY.QUOTE, shift: false };
CHAR_MAP['`'] = { keyCode: HID_KEY.GRAVE, shift: false };
CHAR_MAP[','] = { keyCode: HID_KEY.COMMA, shift: false };
CHAR_MAP['.'] = { keyCode: HID_KEY.PERIOD, shift: false };
CHAR_MAP['/'] = { keyCode: HID_KEY.SLASH, shift: false };
// Shifted special characters
CHAR_MAP['!'] = { keyCode: HID_KEY.NUM_1, shift: true };
CHAR_MAP['@'] = { keyCode: HID_KEY.NUM_2, shift: true };
CHAR_MAP['#'] = { keyCode: HID_KEY.NUM_3, shift: true };
CHAR_MAP['$'] = { keyCode: HID_KEY.NUM_4, shift: true };
CHAR_MAP['%'] = { keyCode: HID_KEY.NUM_5, shift: true };
CHAR_MAP['^'] = { keyCode: HID_KEY.NUM_6, shift: true };
CHAR_MAP['&'] = { keyCode: HID_KEY.NUM_7, shift: true };
CHAR_MAP['*'] = { keyCode: HID_KEY.NUM_8, shift: true };
CHAR_MAP['('] = { keyCode: HID_KEY.NUM_9, shift: true };
CHAR_MAP[')'] = { keyCode: HID_KEY.NUM_0, shift: true };
CHAR_MAP['_'] = { keyCode: HID_KEY.MINUS, shift: true };
CHAR_MAP['+'] = { keyCode: HID_KEY.EQUAL, shift: true };
CHAR_MAP['{'] = { keyCode: HID_KEY.LEFT_BRACKET, shift: true };
CHAR_MAP['}'] = { keyCode: HID_KEY.RIGHT_BRACKET, shift: true };
CHAR_MAP['|'] = { keyCode: HID_KEY.BACKSLASH, shift: true };
CHAR_MAP[':'] = { keyCode: HID_KEY.SEMICOLON, shift: true };
CHAR_MAP['"'] = { keyCode: HID_KEY.QUOTE, shift: true };
CHAR_MAP['~'] = { keyCode: HID_KEY.GRAVE, shift: true };
CHAR_MAP['<'] = { keyCode: HID_KEY.COMMA, shift: true };
CHAR_MAP['>'] = { keyCode: HID_KEY.PERIOD, shift: true };
CHAR_MAP['?'] = { keyCode: HID_KEY.SLASH, shift: true };

export { CHAR_MAP };
