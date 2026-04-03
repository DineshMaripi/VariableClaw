package com.openclaw.bluetoothhid;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.provider.AlarmClock;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

/**
 * Native module for controlling the phone itself via Android Intents.
 * No Bluetooth needed — runs commands directly on the phone.
 */
public class PhoneCommandModule extends ReactContextBaseJavaModule {
    private static final String TAG = "PhoneCommand";
    private final ReactApplicationContext reactContext;
    private boolean flashlightOn = false;

    public PhoneCommandModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "PhoneCommandModule";
    }

    // ─── Open Apps ───

    @ReactMethod
    public void openApp(String packageName, Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            Intent intent = pm.getLaunchIntentForPackage(packageName);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } else {
                // Try as a URI scheme (e.g., "whatsapp://")
                try {
                    Intent uriIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(packageName + "://"));
                    uriIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(uriIntent);
                    promise.resolve(true);
                } catch (Exception e) {
                    promise.reject("APP_NOT_FOUND", "App not found: " + packageName);
                }
            }
        } catch (Exception e) {
            promise.reject("OPEN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openAppByName(String appName, Promise promise) {
        // Map common names to package names
        String pkg = resolvePackageName(appName.toLowerCase().trim());
        if (pkg != null) {
            openApp(pkg, promise);
        } else {
            // Try Play Store search as fallback
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW,
                    Uri.parse("market://search?q=" + appName));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("APP_NOT_FOUND", "Cannot find app: " + appName);
            }
        }
    }

    // ─── Phone Calls ───

    @ReactMethod
    public void makeCall(String number, Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + number));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CALL_ERROR", e.getMessage());
        }
    }

    // ─── SMS ───

    @ReactMethod
    public void sendSMS(String number, String message, Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + number));
            intent.putExtra("sms_body", message);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SMS_ERROR", e.getMessage());
        }
    }

    // ─── Alarm ───

    @ReactMethod
    public void setAlarm(int hour, int minute, String label, Promise promise) {
        try {
            Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM);
            intent.putExtra(AlarmClock.EXTRA_HOUR, hour);
            intent.putExtra(AlarmClock.EXTRA_MINUTES, minute);
            if (label != null && !label.isEmpty()) {
                intent.putExtra(AlarmClock.EXTRA_MESSAGE, label);
            }
            intent.putExtra(AlarmClock.EXTRA_SKIP_UI, false);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ALARM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setTimer(int seconds, String label, Promise promise) {
        try {
            Intent intent = new Intent(AlarmClock.ACTION_SET_TIMER);
            intent.putExtra(AlarmClock.EXTRA_LENGTH, seconds);
            if (label != null && !label.isEmpty()) {
                intent.putExtra(AlarmClock.EXTRA_MESSAGE, label);
            }
            intent.putExtra(AlarmClock.EXTRA_SKIP_UI, false);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("TIMER_ERROR", e.getMessage());
        }
    }

    // ─── Camera ───

    @ReactMethod
    public void openCamera(Promise promise) {
        try {
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CAMERA_ERROR", e.getMessage());
        }
    }

    // ─── Flashlight ───

    @ReactMethod
    public void toggleFlashlight(Promise promise) {
        try {
            CameraManager cameraManager = (CameraManager)
                reactContext.getSystemService(Context.CAMERA_SERVICE);
            String cameraId = cameraManager.getCameraIdList()[0];
            flashlightOn = !flashlightOn;
            cameraManager.setTorchMode(cameraId, flashlightOn);
            promise.resolve(flashlightOn);
        } catch (CameraAccessException e) {
            promise.reject("FLASH_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setFlashlight(boolean on, Promise promise) {
        try {
            CameraManager cameraManager = (CameraManager)
                reactContext.getSystemService(Context.CAMERA_SERVICE);
            String cameraId = cameraManager.getCameraIdList()[0];
            flashlightOn = on;
            cameraManager.setTorchMode(cameraId, on);
            promise.resolve(on);
        } catch (CameraAccessException e) {
            promise.reject("FLASH_ERROR", e.getMessage());
        }
    }

    // ─── Volume ───

    @ReactMethod
    public void setVolume(String direction, Promise promise) {
        try {
            AudioManager audio = (AudioManager)
                reactContext.getSystemService(Context.AUDIO_SERVICE);
            switch (direction.toLowerCase()) {
                case "up":
                    audio.adjustVolume(AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI);
                    break;
                case "down":
                    audio.adjustVolume(AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI);
                    break;
                case "mute":
                    audio.adjustVolume(AudioManager.ADJUST_TOGGLE_MUTE, AudioManager.FLAG_SHOW_UI);
                    break;
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("VOLUME_ERROR", e.getMessage());
        }
    }

    // ─── Open URLs ───

    @ReactMethod
    public void openUrl(String url, Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("URL_ERROR", e.getMessage());
        }
    }

    // ─── Search ───

    @ReactMethod
    public void webSearch(String query, Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_WEB_SEARCH);
            intent.putExtra("query", query);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SEARCH_ERROR", e.getMessage());
        }
    }

    // ─── Settings ───

    @ReactMethod
    public void openSettings(String section, Promise promise) {
        try {
            String action;
            switch (section.toLowerCase()) {
                case "wifi": action = Settings.ACTION_WIFI_SETTINGS; break;
                case "bluetooth": action = Settings.ACTION_BLUETOOTH_SETTINGS; break;
                case "display": action = Settings.ACTION_DISPLAY_SETTINGS; break;
                case "sound": action = Settings.ACTION_SOUND_SETTINGS; break;
                case "battery": action = Settings.ACTION_BATTERY_SAVER_SETTINGS; break;
                case "storage": action = Settings.ACTION_INTERNAL_STORAGE_SETTINGS; break;
                case "location": action = Settings.ACTION_LOCATION_SOURCE_SETTINGS; break;
                default: action = Settings.ACTION_SETTINGS; break;
            }
            Intent intent = new Intent(action);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SETTINGS_ERROR", e.getMessage());
        }
    }

    // ─── Share text ───

    @ReactMethod
    public void shareText(String text, Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_TEXT, text);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(Intent.createChooser(intent, "Share via").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SHARE_ERROR", e.getMessage());
        }
    }

    // ─── Brightness ───

    @ReactMethod
    public void setBrightness(String level, Promise promise) {
        try {
            if (level.equals("up") || level.equals("down")) {
                // Open display settings since direct brightness change needs WRITE_SETTINGS
                Intent intent = new Intent(Settings.ACTION_DISPLAY_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("BRIGHTNESS_ERROR", e.getMessage());
        }
    }

    // ─── Package name resolver ───

    private String resolvePackageName(String name) {
        switch (name) {
            // Social
            case "whatsapp": return "com.whatsapp";
            case "instagram": return "com.instagram.android";
            case "facebook": return "com.facebook.katana";
            case "twitter": case "x": return "com.twitter.android";
            case "telegram": return "org.telegram.messenger";
            case "snapchat": return "com.snapchat.android";
            case "discord": return "com.discord";
            case "reddit": return "com.reddit.frontpage";

            // Video/Entertainment
            case "youtube": return "com.google.android.youtube";
            case "netflix": return "com.netflix.mediaclient";
            case "hotstar": case "disney+": case "disney plus hotstar": return "in.startv.hotstar";
            case "amazon prime": case "prime video": return "com.amazon.avod.thirdpartyclient";
            case "spotify": return "com.spotify.music";
            case "jio cinema": case "jiocinema": return "com.jio.media.ondemand";
            case "zee5": return "com.graymatrix.did";
            case "sony liv": case "sonyliv": return "com.sonyliv";
            case "mx player": return "com.mxtech.videoplayer.ad";
            case "vlc": return "org.videolan.vlc";

            // Productivity
            case "gmail": return "com.google.android.gm";
            case "chrome": case "browser": return "com.android.chrome";
            case "maps": case "google maps": return "com.google.android.apps.maps";
            case "drive": case "google drive": return "com.google.android.apps.docs";
            case "photos": case "google photos": return "com.google.android.apps.photos";
            case "calendar": return "com.google.android.calendar";
            case "calculator": return "com.google.android.calculator";
            case "clock": case "alarm": return "com.google.android.deskclock";
            case "files": case "file manager": return "com.google.android.apps.nbu.files";
            case "notes": case "keep": return "com.google.android.keep";

            // Communication
            case "phone": case "dialer": return "com.google.android.dialer";
            case "messages": case "sms": return "com.google.android.apps.messaging";
            case "contacts": return "com.google.android.contacts";

            // Utility
            case "camera": return "com.android.camera2";
            case "settings": return "com.android.settings";
            case "play store": return "com.android.vending";

            // Payment
            case "gpay": case "google pay": return "com.google.android.apps.nbu.paisa.user";
            case "phonepe": return "com.phonepe.app";
            case "paytm": return "net.one97.paytm";

            default: return null;
        }
    }
}
