import { TV_APPS, findTVApp, getTVAppPackage } from '../../services/TVAppRegistry';

describe('TVAppRegistry', () => {
  // ─── Registry integrity ───

  describe('TV_APPS registry', () => {
    it('should have at least 10 apps', () => {
      expect(TV_APPS.length).toBeGreaterThanOrEqual(10);
    });

    it('every app should have required fields', () => {
      for (const app of TV_APPS) {
        expect(app.name).toBeTruthy();
        expect(app.aliases.length).toBeGreaterThan(0);
        expect(app.androidTV).toBeTruthy();
        expect(app.fireTV).toBeTruthy();
        expect(typeof app.hasSearch).toBe('boolean');
      }
    });

    it('should have no duplicate names', () => {
      const names = TV_APPS.map(a => a.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    });

    it('should have no duplicate aliases across apps', () => {
      const allAliases = TV_APPS.flatMap(a => a.aliases);
      expect(new Set(allAliases).size).toBe(allAliases.length);
    });
  });

  // ─── findTVApp ───

  describe('findTVApp()', () => {
    it('should find YouTube by name', () => {
      const app = findTVApp('YouTube');
      expect(app).toBeDefined();
      expect(app!.name).toBe('YouTube');
    });

    it('should find Hotstar by alias', () => {
      const app = findTVApp('hotstar');
      expect(app).toBeDefined();
      expect(app!.name).toBe('Hotstar');
    });

    it('should find Netflix case-insensitively', () => {
      expect(findTVApp('netflix')).toBeDefined();
      expect(findTVApp('Netflix')).toBeDefined();
      expect(findTVApp('NETFLIX')).toBeDefined();
    });

    it('should find Disney+ Hotstar by alias', () => {
      const app = findTVApp('disney plus hotstar');
      expect(app).toBeDefined();
      expect(app!.name).toBe('Hotstar');
    });

    it('should find Amazon Prime by alias', () => {
      expect(findTVApp('prime video')).toBeDefined();
      expect(findTVApp('amazon prime')).toBeDefined();
    });

    it('should find JioCinema', () => {
      expect(findTVApp('jio cinema')).toBeDefined();
      expect(findTVApp('jiocinema')).toBeDefined();
    });

    it('should find ZEE5', () => {
      expect(findTVApp('zee5')).toBeDefined();
    });

    it('should find SonyLIV', () => {
      expect(findTVApp('sony liv')).toBeDefined();
      expect(findTVApp('sonyliv')).toBeDefined();
    });

    it('should find Spotify', () => {
      expect(findTVApp('spotify')).toBeDefined();
    });

    it('should return undefined for unknown app', () => {
      expect(findTVApp('nonexistentapp')).toBeUndefined();
    });
  });

  // ─── getTVAppPackage ───

  describe('getTVAppPackage()', () => {
    it('should return Android TV package for YouTube', () => {
      const pkg = getTVAppPackage('youtube', 'androidtv');
      expect(pkg).toBe('com.google.android.youtube.tv');
    });

    it('should return Fire TV package for YouTube', () => {
      const pkg = getTVAppPackage('youtube', 'firetv');
      expect(pkg).toBe('com.amazon.firetv.youtube');
    });

    it('should return Hotstar package', () => {
      expect(getTVAppPackage('hotstar')).toBe('in.startv.hotstar');
    });

    it('should return Netflix package', () => {
      expect(getTVAppPackage('netflix')).toBe('com.netflix.ninja');
    });

    it('should default to androidtv when no type specified', () => {
      const pkg = getTVAppPackage('youtube');
      expect(pkg).toBe('com.google.android.youtube.tv');
    });

    it('should return undefined for unknown app', () => {
      expect(getTVAppPackage('fakeapp')).toBeUndefined();
    });
  });

  // ─── Specific Indian apps ───

  describe('Indian streaming apps', () => {
    const indianApps = ['hotstar', 'jio cinema', 'zee5', 'sony liv', 'aha', 'sun nxt', 'voot'];

    it.each(indianApps)('should have %s in registry', (name) => {
      expect(findTVApp(name)).toBeDefined();
    });

    it.each(indianApps)('%s should have search capability', (name) => {
      const app = findTVApp(name);
      expect(app!.hasSearch).toBe(true);
    });
  });
});
