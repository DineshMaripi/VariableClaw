package com.openclaw.bluetoothhid;

import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.Locale;

public class VoiceRecognitionModule extends ReactContextBaseJavaModule implements RecognitionListener {
    private static final String TAG = "VoiceRecognitionModule";
    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;

    public VoiceRecognitionModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "VoiceRecognitionModule";
    }

    @ReactMethod
    public void startListening(String locale, Promise promise) {
        if (getCurrentActivity() == null) {
            promise.reject("NO_ACTIVITY", "No activity available");
            return;
        }

        if (!SpeechRecognizer.isRecognitionAvailable(getReactApplicationContext())) {
            promise.reject("NOT_AVAILABLE", "Speech recognition is not available");
            return;
        }

        getCurrentActivity().runOnUiThread(() -> {
            try {
                if (speechRecognizer != null) {
                    speechRecognizer.destroy();
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getReactApplicationContext());
                speechRecognizer.setRecognitionListener(this);

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale != null ? locale : Locale.getDefault().toString());
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

                speechRecognizer.startListening(intent);
                isListening = true;
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("START_FAILED", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void stopListening(Promise promise) {
        if (getCurrentActivity() == null) {
            promise.resolve(null);
            return;
        }

        getCurrentActivity().runOnUiThread(() -> {
            try {
                if (speechRecognizer != null && isListening) {
                    speechRecognizer.stopListening();
                    isListening = false;
                }
                promise.resolve(null);
            } catch (Exception e) {
                promise.reject("STOP_FAILED", e.getMessage());
            }
        });
    }

    @Override
    public void onResults(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) {
            sendEvent("onSpeechResult", matches.get(0));
        }
        isListening = false;
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) {
            sendEvent("onSpeechPartialResult", matches.get(0));
        }
    }

    @Override
    public void onError(int error) {
        String errorMessage;
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: errorMessage = "Audio recording error"; break;
            case SpeechRecognizer.ERROR_CLIENT: errorMessage = "Client side error"; break;
            case SpeechRecognizer.ERROR_NETWORK: errorMessage = "Network error"; break;
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: errorMessage = "Network timeout"; break;
            case SpeechRecognizer.ERROR_NO_MATCH: errorMessage = "No speech detected"; break;
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: errorMessage = "Recognizer busy"; break;
            case SpeechRecognizer.ERROR_SERVER: errorMessage = "Server error"; break;
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: errorMessage = "Speech timeout"; break;
            default: errorMessage = "Unknown error: " + error; break;
        }

        WritableMap params = Arguments.createMap();
        params.putString("error", errorMessage);
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onSpeechError", params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending error event", e);
        }
        isListening = false;
    }

    @Override public void onReadyForSpeech(Bundle params) {}
    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() {}
    @Override public void onEvent(int eventType, Bundle params) {}

    private void sendEvent(String eventName, String text) {
        WritableMap params = Arguments.createMap();
        params.putString("text", text);
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event", e);
        }
    }

    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(int count) {}
}
