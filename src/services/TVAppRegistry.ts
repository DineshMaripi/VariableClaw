// Registry of TV app packages for Android TV / Fire TV
// Used to build reliable app-launch sequences

export interface TVApp {
  name: string;
  aliases: string[];
  androidTV: string;  // Android TV package
  fireTV: string;     // Fire TV package (often same)
  hasSearch: boolean;  // Does the app have a built-in search?
}

export const TV_APPS: TVApp[] = [
  {
    name: 'YouTube',
    aliases: ['youtube', 'yt'],
    androidTV: 'com.google.android.youtube.tv',
    fireTV: 'com.amazon.firetv.youtube',
    hasSearch: true,
  },
  {
    name: 'Hotstar',
    aliases: ['hotstar', 'disney+', 'disney plus', 'disney plus hotstar'],
    androidTV: 'in.startv.hotstar',
    fireTV: 'in.startv.hotstar',
    hasSearch: true,
  },
  {
    name: 'Netflix',
    aliases: ['netflix'],
    androidTV: 'com.netflix.ninja',
    fireTV: 'com.netflix.ninja',
    hasSearch: true,
  },
  {
    name: 'Amazon Prime Video',
    aliases: ['prime video', 'amazon prime', 'prime'],
    androidTV: 'com.amazon.avod',
    fireTV: 'com.amazon.avod',
    hasSearch: true,
  },
  {
    name: 'JioCinema',
    aliases: ['jio cinema', 'jiocinema', 'jio'],
    androidTV: 'com.jio.media.stb',
    fireTV: 'com.jio.media.stb',
    hasSearch: true,
  },
  {
    name: 'ZEE5',
    aliases: ['zee5', 'zee'],
    androidTV: 'com.graymatrix.did',
    fireTV: 'com.graymatrix.did',
    hasSearch: true,
  },
  {
    name: 'SonyLIV',
    aliases: ['sony liv', 'sonyliv', 'sony'],
    androidTV: 'com.sonyliv',
    fireTV: 'com.sonyliv',
    hasSearch: true,
  },
  {
    name: 'Spotify',
    aliases: ['spotify'],
    androidTV: 'com.spotify.tv.android',
    fireTV: 'com.spotify.tv.android',
    hasSearch: true,
  },
  {
    name: 'Chrome',
    aliases: ['chrome', 'browser'],
    androidTV: 'com.android.chrome',
    fireTV: 'com.amazon.silk',
    hasSearch: false,
  },
  {
    name: 'Plex',
    aliases: ['plex'],
    androidTV: 'com.plexapp.android',
    fireTV: 'com.plexapp.android',
    hasSearch: true,
  },
  {
    name: 'Kodi',
    aliases: ['kodi'],
    androidTV: 'org.xbmc.kodi',
    fireTV: 'org.xbmc.kodi',
    hasSearch: true,
  },
  {
    name: 'VLC',
    aliases: ['vlc', 'vlc player'],
    androidTV: 'org.videolan.vlc',
    fireTV: 'org.videolan.vlc',
    hasSearch: false,
  },
  {
    name: 'MX Player',
    aliases: ['mx player', 'mx'],
    androidTV: 'com.mxtech.videoplayer.ad',
    fireTV: 'com.mxtech.videoplayer.ad',
    hasSearch: false,
  },
  {
    name: 'Voot',
    aliases: ['voot'],
    androidTV: 'com.tv.v18.viola',
    fireTV: 'com.tv.v18.viola',
    hasSearch: true,
  },
  {
    name: 'Aha',
    aliases: ['aha'],
    androidTV: 'com.aha.video',
    fireTV: 'com.aha.video',
    hasSearch: true,
  },
  {
    name: 'Sun NXT',
    aliases: ['sun nxt', 'sunnxt'],
    androidTV: 'com.suntv.sunnxt',
    fireTV: 'com.suntv.sunnxt',
    hasSearch: true,
  },
];

export function findTVApp(name: string): TVApp | undefined {
  const lower = name.toLowerCase().trim();
  return TV_APPS.find(app =>
    app.name.toLowerCase() === lower ||
    app.aliases.some(a => a === lower)
  );
}

export function getTVAppPackage(name: string, tvType: 'androidtv' | 'firetv' = 'androidtv'): string | undefined {
  const app = findTVApp(name);
  if (!app) return undefined;
  return tvType === 'firetv' ? app.fireTV : app.androidTV;
}
