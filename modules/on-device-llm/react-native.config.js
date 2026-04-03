module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.openclaw.ondevicellm.OnDeviceLLMPackage;',
        packageInstance: 'new OnDeviceLLMPackage()',
      },
      ios: null,
    },
  },
};
