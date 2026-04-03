import { HID_KEY, HID_MODIFIER, CHAR_MAP } from '../../constants/keycodes';

describe('HID_KEY constants', () => {
  it('should have correct letter keycodes (A=0x04 through Z=0x1d)', () => {
    expect(HID_KEY.A).toBe(0x04);
    expect(HID_KEY.Z).toBe(0x1d);
    // Sequential
    expect(HID_KEY.B).toBe(HID_KEY.A + 1);
    expect(HID_KEY.M).toBe(HID_KEY.A + 12);
  });

  it('should have correct number keycodes', () => {
    expect(HID_KEY.NUM_1).toBe(0x1e);
    expect(HID_KEY.NUM_0).toBe(0x27);
  });

  it('should have correct special keys', () => {
    expect(HID_KEY.ENTER).toBe(0x28);
    expect(HID_KEY.ESCAPE).toBe(0x29);
    expect(HID_KEY.BACKSPACE).toBe(0x2a);
    expect(HID_KEY.TAB).toBe(0x2b);
    expect(HID_KEY.SPACE).toBe(0x2c);
    expect(HID_KEY.DELETE).toBe(0x4c);
  });

  it('should have correct function keys', () => {
    expect(HID_KEY.F1).toBe(0x3a);
    expect(HID_KEY.F12).toBe(0x45);
    // Sequential
    for (let i = 0; i < 12; i++) {
      expect(HID_KEY[`F${i + 1}` as keyof typeof HID_KEY]).toBe(0x3a + i);
    }
  });

  it('should have correct arrow keys', () => {
    expect(HID_KEY.RIGHT_ARROW).toBe(0x4f);
    expect(HID_KEY.LEFT_ARROW).toBe(0x50);
    expect(HID_KEY.DOWN_ARROW).toBe(0x51);
    expect(HID_KEY.UP_ARROW).toBe(0x52);
  });

  it('should have correct media keys', () => {
    expect(HID_KEY.MUTE).toBe(0xe2);
    expect(HID_KEY.VOLUME_UP).toBe(0xe9);
    expect(HID_KEY.VOLUME_DOWN).toBe(0xea);
  });

  it('should have NONE as 0x00', () => {
    expect(HID_KEY.NONE).toBe(0x00);
  });

  it('should have navigation keys', () => {
    expect(HID_KEY.HOME).toBe(0x4a);
    expect(HID_KEY.END).toBe(0x4d);
    expect(HID_KEY.PAGE_UP).toBe(0x4b);
    expect(HID_KEY.PAGE_DOWN).toBe(0x4e);
    expect(HID_KEY.INSERT).toBe(0x49);
  });

  it('should have punctuation keys', () => {
    expect(HID_KEY.MINUS).toBe(0x2d);
    expect(HID_KEY.EQUAL).toBe(0x2e);
    expect(HID_KEY.LEFT_BRACKET).toBe(0x2f);
    expect(HID_KEY.RIGHT_BRACKET).toBe(0x30);
    expect(HID_KEY.BACKSLASH).toBe(0x31);
    expect(HID_KEY.SEMICOLON).toBe(0x33);
    expect(HID_KEY.QUOTE).toBe(0x34);
    expect(HID_KEY.GRAVE).toBe(0x35);
    expect(HID_KEY.COMMA).toBe(0x36);
    expect(HID_KEY.PERIOD).toBe(0x37);
    expect(HID_KEY.SLASH).toBe(0x38);
  });

  it('should have no duplicate keycodes (except NONE)', () => {
    const values = Object.values(HID_KEY).filter(v => v !== 0x00);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('HID_MODIFIER constants', () => {
  it('should have correct modifier bits', () => {
    expect(HID_MODIFIER.NONE).toBe(0x00);
    expect(HID_MODIFIER.LEFT_CTRL).toBe(0x01);
    expect(HID_MODIFIER.LEFT_SHIFT).toBe(0x02);
    expect(HID_MODIFIER.LEFT_ALT).toBe(0x04);
    expect(HID_MODIFIER.LEFT_GUI).toBe(0x08);
    expect(HID_MODIFIER.RIGHT_CTRL).toBe(0x10);
    expect(HID_MODIFIER.RIGHT_SHIFT).toBe(0x20);
    expect(HID_MODIFIER.RIGHT_ALT).toBe(0x40);
    expect(HID_MODIFIER.RIGHT_GUI).toBe(0x80);
  });

  it('should be combinable via bitwise OR', () => {
    const ctrlShift = HID_MODIFIER.LEFT_CTRL | HID_MODIFIER.LEFT_SHIFT;
    expect(ctrlShift).toBe(0x03);
    const ctrlAltDel = HID_MODIFIER.LEFT_CTRL | HID_MODIFIER.LEFT_ALT;
    expect(ctrlAltDel).toBe(0x05);
    const allLeft = HID_MODIFIER.LEFT_CTRL | HID_MODIFIER.LEFT_SHIFT |
                    HID_MODIFIER.LEFT_ALT | HID_MODIFIER.LEFT_GUI;
    expect(allLeft).toBe(0x0f);
  });

  it('each modifier should be a single bit (power of 2)', () => {
    const mods = [
      HID_MODIFIER.LEFT_CTRL, HID_MODIFIER.LEFT_SHIFT,
      HID_MODIFIER.LEFT_ALT, HID_MODIFIER.LEFT_GUI,
      HID_MODIFIER.RIGHT_CTRL, HID_MODIFIER.RIGHT_SHIFT,
      HID_MODIFIER.RIGHT_ALT, HID_MODIFIER.RIGHT_GUI,
    ];
    for (const mod of mods) {
      expect(mod & (mod - 1)).toBe(0); // power of 2 check
      expect(mod).toBeGreaterThan(0);
    }
  });
});

describe('CHAR_MAP', () => {
  // ─── Lowercase Letters ───

  it('should map all lowercase a-z', () => {
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(97 + i);
      expect(CHAR_MAP[char]).toBeDefined();
      expect(CHAR_MAP[char].keyCode).toBe(HID_KEY.A + i);
      expect(CHAR_MAP[char].shift).toBe(false);
    }
  });

  // ─── Uppercase Letters ───

  it('should map all uppercase A-Z with shift=true', () => {
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      expect(CHAR_MAP[char]).toBeDefined();
      expect(CHAR_MAP[char].keyCode).toBe(HID_KEY.A + i);
      expect(CHAR_MAP[char].shift).toBe(true);
    }
  });

  // ─── Numbers ───

  it('should map digits 0-9', () => {
    for (let i = 0; i <= 9; i++) {
      const char = i.toString();
      expect(CHAR_MAP[char]).toBeDefined();
      expect(CHAR_MAP[char].shift).toBe(false);
    }
  });

  it('digit 0 maps to NUM_0, digit 1 maps to NUM_1', () => {
    expect(CHAR_MAP['0'].keyCode).toBe(HID_KEY.NUM_0);
    expect(CHAR_MAP['1'].keyCode).toBe(HID_KEY.NUM_1);
  });

  // ─── Special Characters (unshifted) ───

  it('should map space, enter, tab', () => {
    expect(CHAR_MAP[' '].keyCode).toBe(HID_KEY.SPACE);
    expect(CHAR_MAP[' '].shift).toBe(false);
    expect(CHAR_MAP['\n'].keyCode).toBe(HID_KEY.ENTER);
    expect(CHAR_MAP['\t'].keyCode).toBe(HID_KEY.TAB);
  });

  it('should map punctuation without shift', () => {
    const unshifted: Record<string, number> = {
      '-': HID_KEY.MINUS,
      '=': HID_KEY.EQUAL,
      '[': HID_KEY.LEFT_BRACKET,
      ']': HID_KEY.RIGHT_BRACKET,
      '\\': HID_KEY.BACKSLASH,
      ';': HID_KEY.SEMICOLON,
      "'": HID_KEY.QUOTE,
      '`': HID_KEY.GRAVE,
      ',': HID_KEY.COMMA,
      '.': HID_KEY.PERIOD,
      '/': HID_KEY.SLASH,
    };
    for (const [char, code] of Object.entries(unshifted)) {
      expect(CHAR_MAP[char]).toBeDefined();
      expect(CHAR_MAP[char].keyCode).toBe(code);
      expect(CHAR_MAP[char].shift).toBe(false);
    }
  });

  // ─── Shifted Special Characters ───

  it('should map shifted number-row symbols', () => {
    const shifted: Record<string, number> = {
      '!': HID_KEY.NUM_1,
      '@': HID_KEY.NUM_2,
      '#': HID_KEY.NUM_3,
      '$': HID_KEY.NUM_4,
      '%': HID_KEY.NUM_5,
      '^': HID_KEY.NUM_6,
      '&': HID_KEY.NUM_7,
      '*': HID_KEY.NUM_8,
      '(': HID_KEY.NUM_9,
      ')': HID_KEY.NUM_0,
    };
    for (const [char, code] of Object.entries(shifted)) {
      expect(CHAR_MAP[char]).toBeDefined();
      expect(CHAR_MAP[char].keyCode).toBe(code);
      expect(CHAR_MAP[char].shift).toBe(true);
    }
  });

  it('should map shifted punctuation', () => {
    const shifted: Record<string, number> = {
      '_': HID_KEY.MINUS,
      '+': HID_KEY.EQUAL,
      '{': HID_KEY.LEFT_BRACKET,
      '}': HID_KEY.RIGHT_BRACKET,
      '|': HID_KEY.BACKSLASH,
      ':': HID_KEY.SEMICOLON,
      '"': HID_KEY.QUOTE,
      '~': HID_KEY.GRAVE,
      '<': HID_KEY.COMMA,
      '>': HID_KEY.PERIOD,
      '?': HID_KEY.SLASH,
    };
    for (const [char, code] of Object.entries(shifted)) {
      expect(CHAR_MAP[char]).toBeDefined();
      expect(CHAR_MAP[char].keyCode).toBe(code);
      expect(CHAR_MAP[char].shift).toBe(true);
    }
  });

  // ─── Coverage check ───

  it('should cover at least 85 characters', () => {
    // 26 lower + 26 upper + 10 digits + 3 whitespace + 11 unshifted punct + 21 shifted = 97
    const total = Object.keys(CHAR_MAP).length;
    expect(total).toBeGreaterThanOrEqual(85);
  });

  it('every CHAR_MAP entry has a valid keyCode > 0', () => {
    for (const [char, mapping] of Object.entries(CHAR_MAP)) {
      expect(mapping.keyCode).toBeGreaterThan(0);
      expect(typeof mapping.shift).toBe('boolean');
    }
  });
});
