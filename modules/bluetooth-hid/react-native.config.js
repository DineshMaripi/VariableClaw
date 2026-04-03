module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.openclaw.bluetoothhid.BluetoothHIDPackage;',
        packageInstance: 'new BluetoothHIDPackage()',
      },
      ios: null,
    },
  },
};
