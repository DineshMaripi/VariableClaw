package com.openclaw.ondevicellm;

import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Native module for on-device LLM inference using llama.cpp.
 *
 * Architecture:
 * - llama.cpp compiled as libllama.so for arm64-v8a/armeabi-v7a
 * - JNI bridge calls into native code for model load/inference
 * - Model file (GGUF) stored in app's internal storage
 * - Inference runs on background thread to avoid blocking UI
 *
 * In mock/dev mode (no native lib), it returns rule-based responses
 * so the app works in Expo Go and during development.
 */
public class OnDeviceLLMModule extends ReactContextBaseJavaModule {
    private static final String TAG = "OnDeviceLLM";
    private static final String MODULE_NAME = "OnDeviceLLMModule";

    private final ReactApplicationContext reactContext;
    private HandlerThread inferenceThread;
    private Handler inferenceHandler;
    private boolean modelLoaded = false;
    private boolean nativeAvailable = false;
    private long modelPtr = 0; // Native pointer to loaded model

    // JNI methods — implemented in libllama.so
    // These are stubs until the native library is compiled and bundled
    private static native long nativeLoadModel(String modelPath, int nThreads, int nCtx);
    private static native void nativeUnloadModel(long modelPtr);
    private static native String nativeGenerate(long modelPtr, String prompt, int maxTokens, float temperature);
    private static native String nativeGetInfo(long modelPtr);

    private static boolean nativeLibLoaded = false;

    static {
        try {
            System.loadLibrary("llama-android");
            nativeLibLoaded = true;
            Log.i(TAG, "Native llama library loaded successfully");
        } catch (UnsatisfiedLinkError e) {
            nativeLibLoaded = false;
            Log.w(TAG, "Native llama library not found — running in mock mode. " +
                  "Build with NDK to enable on-device inference.");
        }
    }

    public OnDeviceLLMModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;

        // Only mark native as available if the .so actually loaded
        nativeAvailable = nativeLibLoaded;

        // Background thread for inference
        inferenceThread = new HandlerThread("LLMInference");
        inferenceThread.start();
        inferenceHandler = new Handler(inferenceThread.getLooper());
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void isNativeAvailable(Promise promise) {
        promise.resolve(nativeAvailable);
    }

    /**
     * Load a GGUF model from the given file path.
     * Runs on background thread.
     */
    @ReactMethod
    public void loadModel(String modelPath, int nThreads, int nCtx, Promise promise) {
        inferenceHandler.post(() -> {
            try {
                File modelFile = new File(modelPath);
                if (!modelFile.exists()) {
                    promise.reject("MODEL_NOT_FOUND", "Model file not found: " + modelPath);
                    return;
                }

                long fileSize = modelFile.length();
                Log.i(TAG, "Loading model: " + modelPath + " (" + (fileSize / 1024 / 1024) + " MB)");

                sendEvent("onModelLoadProgress", "status", "loading");

                if (nativeAvailable) {
                    modelPtr = nativeLoadModel(modelPath, nThreads, nCtx);
                    if (modelPtr == 0) {
                        promise.reject("LOAD_FAILED", "Failed to load model");
                        return;
                    }
                } else {
                    // Mock mode — simulate loading
                    Thread.sleep(500);
                    modelPtr = 1; // fake pointer
                }

                modelLoaded = true;
                sendEvent("onModelLoadProgress", "status", "ready");

                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("path", modelPath);
                result.putDouble("sizeBytes", fileSize);
                promise.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Failed to load model", e);
                promise.reject("LOAD_ERROR", e.getMessage());
            }
        });
    }

    /**
     * Unload the current model and free memory.
     */
    @ReactMethod
    public void unloadModel(Promise promise) {
        inferenceHandler.post(() -> {
            try {
                if (modelPtr != 0 && nativeAvailable) {
                    nativeUnloadModel(modelPtr);
                }
                modelPtr = 0;
                modelLoaded = false;
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("UNLOAD_ERROR", e.getMessage());
            }
        });
    }

    /**
     * Generate a response from the loaded model.
     * This is the core inference method.
     */
    @ReactMethod
    public void generate(String prompt, int maxTokens, double temperature, Promise promise) {
        if (!modelLoaded) {
            promise.reject("NO_MODEL", "No model loaded. Call loadModel first.");
            return;
        }

        inferenceHandler.post(() -> {
            try {
                String result;

                if (nativeAvailable && modelPtr != 0) {
                    result = nativeGenerate(modelPtr, prompt, maxTokens, (float) temperature);
                } else {
                    // Mock mode — parse command with simple rules
                    result = mockGenerate(prompt);
                }

                promise.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Generation failed", e);
                promise.reject("GENERATE_ERROR", e.getMessage());
            }
        });
    }

    /**
     * Check if a model is currently loaded and ready.
     */
    @ReactMethod
    public void isModelLoaded(Promise promise) {
        promise.resolve(modelLoaded);
    }

    /**
     * Get the path to app's model storage directory.
     */
    @ReactMethod
    public void getModelDirectory(Promise promise) {
        File dir = new File(reactContext.getFilesDir(), "models");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        promise.resolve(dir.getAbsolutePath());
    }

    /**
     * Download a model file from URL to local storage.
     * Emits progress events.
     */
    @ReactMethod
    public void downloadModel(String url, String fileName, Promise promise) {
        inferenceHandler.post(() -> {
            try {
                File modelsDir = new File(reactContext.getFilesDir(), "models");
                if (!modelsDir.exists()) modelsDir.mkdirs();

                File outputFile = new File(modelsDir, fileName);

                // If already downloaded, skip
                if (outputFile.exists() && outputFile.length() > 0) {
                    WritableMap result = Arguments.createMap();
                    result.putString("path", outputFile.getAbsolutePath());
                    result.putDouble("sizeBytes", outputFile.length());
                    result.putBoolean("cached", true);
                    promise.resolve(result);
                    return;
                }

                Log.i(TAG, "Downloading model from: " + url);
                sendEvent("onModelDownloadProgress", "progress", 0);

                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(30000);
                connection.setReadTimeout(60000);
                connection.connect();

                int totalSize = connection.getContentLength();
                InputStream input = new BufferedInputStream(connection.getInputStream());
                FileOutputStream output = new FileOutputStream(outputFile);

                byte[] buffer = new byte[8192];
                int bytesRead;
                long downloaded = 0;
                int lastPercent = 0;

                while ((bytesRead = input.read(buffer)) != -1) {
                    output.write(buffer, 0, bytesRead);
                    downloaded += bytesRead;

                    if (totalSize > 0) {
                        int percent = (int) (downloaded * 100 / totalSize);
                        if (percent > lastPercent) {
                            lastPercent = percent;
                            sendDownloadProgress(percent, downloaded, totalSize);
                        }
                    }
                }

                output.flush();
                output.close();
                input.close();
                connection.disconnect();

                sendDownloadProgress(100, downloaded, totalSize);

                WritableMap result = Arguments.createMap();
                result.putString("path", outputFile.getAbsolutePath());
                result.putDouble("sizeBytes", outputFile.length());
                result.putBoolean("cached", false);
                promise.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Download failed", e);
                promise.reject("DOWNLOAD_ERROR", e.getMessage());
            }
        });
    }

    /**
     * Delete a downloaded model file.
     */
    @ReactMethod
    public void deleteModel(String fileName, Promise promise) {
        try {
            File modelsDir = new File(reactContext.getFilesDir(), "models");
            File modelFile = new File(modelsDir, fileName);
            if (modelFile.exists()) {
                modelFile.delete();
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("DELETE_ERROR", e.getMessage());
        }
    }

    /**
     * List downloaded models.
     */
    @ReactMethod
    public void listModels(Promise promise) {
        try {
            File modelsDir = new File(reactContext.getFilesDir(), "models");
            com.facebook.react.bridge.WritableArray arr = Arguments.createArray();
            if (modelsDir.exists()) {
                for (File f : modelsDir.listFiles()) {
                    if (f.getName().endsWith(".gguf")) {
                        WritableMap m = Arguments.createMap();
                        m.putString("name", f.getName());
                        m.putString("path", f.getAbsolutePath());
                        m.putDouble("sizeBytes", f.length());
                        arr.pushMap(m);
                    }
                }
            }
            promise.resolve(arr);
        } catch (Exception e) {
            promise.reject("LIST_ERROR", e.getMessage());
        }
    }

    // ─── Mock inference for dev mode ───

    private String mockGenerate(String prompt) {
        // Simulate delay
        try { Thread.sleep(300); } catch (InterruptedException ignored) {}

        String lower = prompt.toLowerCase();

        // Simple keyword extraction from the user message part of the prompt
        if (lower.contains("chrome") || lower.contains("browser"))
            return "{\"action\":\"openApp\",\"app\":\"chrome\"}";
        if (lower.contains("youtube"))
            return "{\"action\":\"searchYouTube\",\"query\":\"music\"}";
        if (lower.contains("google") || lower.contains("search"))
            return "{\"action\":\"searchGoogle\",\"query\":\"search\"}";
        if (lower.contains("lock"))
            return "{\"action\":\"lockScreen\"}";
        if (lower.contains("screenshot") || lower.contains("screen capture"))
            return "{\"action\":\"screenshot\"}";
        if (lower.contains("volume up") || lower.contains("louder"))
            return "{\"action\":\"volumeUp\"}";
        if (lower.contains("volume down") || lower.contains("quieter"))
            return "{\"action\":\"volumeDown\"}";
        if (lower.contains("mute"))
            return "{\"action\":\"mute\"}";
        if (lower.contains("close") || lower.contains("shut"))
            return "{\"action\":\"closeWindow\"}";
        if (lower.contains("minimize") || lower.contains("desktop"))
            return "{\"action\":\"minimizeAll\"}";
        if (lower.contains("switch") || lower.contains("alt tab"))
            return "{\"action\":\"switchApp\"}";
        if (lower.contains("shutdown") || lower.contains("power off"))
            return "{\"action\":\"shutdown\"}";
        if (lower.contains("restart") || lower.contains("reboot"))
            return "{\"action\":\"restart\"}";
        if (lower.contains("sleep"))
            return "{\"action\":\"sleep\"}";
        if (lower.contains("notepad"))
            return "{\"action\":\"openApp\",\"app\":\"notepad\"}";
        if (lower.contains("code") || lower.contains("vs code"))
            return "{\"action\":\"openApp\",\"app\":\"code\"}";
        if (lower.contains("file") || lower.contains("explorer"))
            return "{\"action\":\"openApp\",\"app\":\"explorer\"}";

        return "{\"action\":\"unknown\",\"text\":\"" + prompt.replace("\"", "'") + "\"}";
    }

    // ─── Event helpers ───

    private void sendEvent(String eventName, String key, Object value) {
        WritableMap params = Arguments.createMap();
        if (value instanceof String) {
            params.putString(key, (String) value);
        } else if (value instanceof Integer) {
            params.putInt(key, (Integer) value);
        }
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.w(TAG, "Failed to send event: " + eventName);
        }
    }

    private void sendDownloadProgress(int percent, long downloaded, long total) {
        WritableMap params = Arguments.createMap();
        params.putInt("percent", percent);
        params.putDouble("downloaded", downloaded);
        params.putDouble("total", total);
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onModelDownloadProgress", params);
        } catch (Exception e) {
            Log.w(TAG, "Failed to send download progress");
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        if (inferenceThread != null) {
            inferenceThread.quitSafely();
        }
        if (modelPtr != 0 && nativeAvailable) {
            nativeUnloadModel(modelPtr);
        }
    }
}
