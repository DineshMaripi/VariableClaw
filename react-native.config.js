/**
 * Root react-native.config.js
 *
 * Native modules are handled by the Expo config plugin (plugins/with-native-modules.js)
 * which copies Java/C++ files directly into android/app/ during prebuild.
 *
 * Explicitly disable autolinking for our local modules to prevent duplicate classes.
 */
module.exports = {
  dependencies: {
    'bluetooth-hid': {
      platforms: { android: null, ios: null },
    },
    'on-device-llm': {
      platforms: { android: null, ios: null },
    },
  },
};
