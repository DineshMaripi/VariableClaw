/**
 * Expo config plugin — embeds native modules directly into the Android app.
 *
 * Modules:
 * 1. Bluetooth HID — Java only (keyboard/mouse control)
 * 2. On-Device LLM — Java + C++ (llama.cpp for on-device AI)
 *
 * Copies source files into android/app/ and modifies build configs.
 */
const {
  withMainApplication,
  withAppBuildGradle,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ─── Bluetooth HID (Java only) ───

const BT_JAVA_DIR = path.join('modules', 'bluetooth-hid', 'android', 'src', 'main', 'java', 'com', 'openclaw', 'bluetoothhid');
const BT_JAVA_FILES = [
  'BluetoothHIDModule.java',
  'BluetoothHIDPackage.java',
  'VoiceRecognitionModule.java',
  'PhoneCommandModule.java',
];

// ─── On-Device LLM (Java + C++) ───

const LLM_JAVA_DIR = path.join('modules', 'on-device-llm', 'android', 'src', 'main', 'java', 'com', 'openclaw', 'ondevicellm');
const LLM_JAVA_FILES = [
  'OnDeviceLLMModule.java',
  'OnDeviceLLMPackage.java',
];
const LLM_CPP_DIR = path.join('modules', 'on-device-llm', 'android', 'src', 'main', 'cpp');
const LLM_CPP_FILES = [
  'llama_jni.cpp',
  'CMakeLists.txt',
];

/**
 * 1. Copy all native source files into android/app/
 */
function withCopyNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.projectRoot;
      const appSrc = path.join(root, 'android', 'app', 'src', 'main');

      // Force arm64-v8a only via gradle.properties (most reliable method)
      const gradlePropsPath = path.join(root, 'android', 'gradle.properties');
      if (fs.existsSync(gradlePropsPath)) {
        let props = fs.readFileSync(gradlePropsPath, 'utf8');
        // Replace existing architectures line or add new one
        if (props.includes('reactNativeArchitectures=')) {
          props = props.replace(/reactNativeArchitectures=.*/g, 'reactNativeArchitectures=arm64-v8a');
        } else {
          props += '\nreactNativeArchitectures=arm64-v8a\n';
        }
        fs.writeFileSync(gradlePropsPath, props);
        console.log('[plugin] Forced reactNativeArchitectures=arm64-v8a');
      }

      // Copy Bluetooth HID Java files
      const btTarget = path.join(appSrc, 'java', 'com', 'openclaw', 'bluetoothhid');
      fs.mkdirSync(btTarget, { recursive: true });
      for (const file of BT_JAVA_FILES) {
        const src = path.join(root, BT_JAVA_DIR, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(btTarget, file));
          console.log(`[plugin] Copied BT: ${file}`);
        }
      }

      // Copy On-Device LLM Java files
      const llmJavaTarget = path.join(appSrc, 'java', 'com', 'openclaw', 'ondevicellm');
      fs.mkdirSync(llmJavaTarget, { recursive: true });
      for (const file of LLM_JAVA_FILES) {
        const src = path.join(root, LLM_JAVA_DIR, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(llmJavaTarget, file));
          console.log(`[plugin] Copied LLM Java: ${file}`);
        }
      }

      // Copy C++ / CMake files for llama.cpp JNI — only if llama.cpp is present
      const llamaCheck1 = path.join(root, 'llama.cpp', 'CMakeLists.txt');
      const llamaCheck2 = path.join(root, 'modules', 'on-device-llm', 'llama.cpp', 'CMakeLists.txt');
      if (fs.existsSync(llamaCheck1) || fs.existsSync(llamaCheck2)) {
        const llmCppTarget = path.join(appSrc, 'cpp');
        fs.mkdirSync(llmCppTarget, { recursive: true });
        for (const file of LLM_CPP_FILES) {
          const src = path.join(root, LLM_CPP_DIR, file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(llmCppTarget, file));
            console.log(`[plugin] Copied LLM C++: ${file}`);
          }
        }
      } else {
        console.log('[plugin] Skipping C++ files — llama.cpp not downloaded');
      }

      return config;
    },
  ]);
}

/**
 * 2. Add CMake configuration to app/build.gradle for llama.cpp
 *    ONLY if llama.cpp source is actually present (downloaded by setup script).
 *    Without llama.cpp, skip CMake entirely to avoid stub library crashes.
 */
function withLLMBuildConfig(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const root = config.modRequest.projectRoot;

    // Check if llama.cpp source actually exists
    const llamaDir1 = path.join(root, 'llama.cpp', 'CMakeLists.txt');
    const llamaDir2 = path.join(root, 'modules', 'on-device-llm', 'llama.cpp', 'CMakeLists.txt');
    const hasLlamaCpp = fs.existsSync(llamaDir1) || fs.existsSync(llamaDir2);

    if (!hasLlamaCpp) {
      console.log('[plugin] llama.cpp not found — skipping CMake/NDK config (AI will use mock mode)');
      // Remove any existing CMake config that may have been added previously
      contents = contents.replace(/\s*\/\/ On-device LLM: NDK config[^]*?externalNativeBuild \{[^]*?\}\s*\}/m, '');
      contents = contents.replace(/\s*\/\/ On-device LLM: CMake build for llama\.cpp\s*externalNativeBuild \{[^]*?\}\s*\}/m, '');
      config.modResults.contents = contents;
      return config;
    }

    console.log('[plugin] llama.cpp found — adding CMake/NDK build config');

    // Force arm64-v8a only — remove armeabi-v7a if present anywhere
    contents = contents.replace(/abiFilters.*armeabi-v7a.*/g, 'abiFilters "arm64-v8a"');

    // Add CMake config if not already present
    if (!contents.includes('externalNativeBuild')) {
      // Add NDK abiFilters and CMake config inside defaultConfig
      const defaultConfigEnd = 'buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"';
      if (contents.includes(defaultConfigEnd)) {
        contents = contents.replace(
          defaultConfigEnd,
          `// On-device LLM: NDK config
        ndk {
            abiFilters "arm64-v8a"
        }
        externalNativeBuild {
            cmake {
                arguments "-DANDROID_STL=c++_shared"
                cppFlags "-std=c++17 -O2 -DNDEBUG"
            }
        }

        ${defaultConfigEnd}`
        );
      }

      // Add externalNativeBuild block at android {} level
      const androidBlockEnd = '    signingConfigs {';
      if (contents.includes(androidBlockEnd)) {
        contents = contents.replace(
          androidBlockEnd,
          `    // On-device LLM: CMake build for llama.cpp
    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
            version "3.22.1+"
        }
    }

    ${androidBlockEnd}`
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

/**
 * 3. Register both packages in MainApplication.kt
 */
function withRegisterPackages(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const imports = [
      'import com.openclaw.bluetoothhid.BluetoothHIDPackage',
      'import com.openclaw.ondevicellm.OnDeviceLLMPackage',
    ];
    const packages = [
      'add(BluetoothHIDPackage())',
      'add(OnDeviceLLMPackage())',
    ];

    // Add imports
    for (const imp of imports) {
      if (!contents.includes(imp)) {
        const anchors = [
          'import expo.modules.ApplicationLifecycleDispatcher',
          'import expo.modules.ExpoReactHostFactory',
          /import expo\.modules\.\w+/,
        ];
        for (const anchor of anchors) {
          if (typeof anchor === 'string' && contents.includes(anchor)) {
            contents = contents.replace(anchor, `${imp}\n${anchor}`);
            break;
          } else if (anchor instanceof RegExp && anchor.test(contents)) {
            contents = contents.replace(anchor, (m) => `${imp}\n${m}`);
            break;
          }
        }
      }
    }

    // Add package registrations
    for (const pkg of packages) {
      if (!contents.includes(pkg)) {
        const pkgAnchors = [
          { search: /\/\/ Packages that cannot be autolinked[^\n]*/, replace: (m) => `${m}\n          ${pkg}` },
          { search: /\.packages\.apply\s*\{/, replace: (m) => `${m}\n          ${pkg}` },
          { search: /\/\/\s*add\(MyReactNativePackage\(\)\)/, replace: (m) => `${pkg}\n          ${m}` },
        ];
        for (const { search, replace } of pkgAnchors) {
          if (search.test(contents)) {
            contents = contents.replace(search, replace);
            break;
          }
        }
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

/**
 * Compose all modifications
 */
function withNativeModules(config) {
  config = withCopyNativeFiles(config);
  config = withLLMBuildConfig(config);
  config = withRegisterPackages(config);
  return config;
}

module.exports = withNativeModules;
