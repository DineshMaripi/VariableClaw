import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export type ModelStatus = 'none' | 'downloading' | 'downloaded' | 'loading' | 'ready' | 'error';

interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
}

interface ModelInfo {
  name: string;
  path: string;
  sizeBytes: number;
}

interface OnDeviceLLMNative {
  isNativeAvailable(): Promise<boolean>;
  loadModel(modelPath: string, nThreads: number, nCtx: number): Promise<{
    success: boolean;
    path: string;
    sizeBytes: number;
  }>;
  unloadModel(): Promise<boolean>;
  generate(prompt: string, maxTokens: number, temperature: number): Promise<string>;
  isModelLoaded(): Promise<boolean>;
  getModelDirectory(): Promise<string>;
  downloadModel(url: string, fileName: string): Promise<{
    path: string;
    sizeBytes: number;
    cached: boolean;
  }>;
  deleteModel(fileName: string): Promise<boolean>;
  listModels(): Promise<ModelInfo[]>;
}

// Available model options — Qwen 2.5 GGUF quantized variants
export const AVAILABLE_MODELS = [
  {
    id: 'qwen2.5-0.5b-q4',
    name: 'Qwen 2.5 0.5B (Q4_K_M)',
    fileName: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sizeLabel: '~400 MB',
    sizeBytes: 420_000_000,
    description: 'Smallest, fastest. Good for command parsing.',
    recommended: true,
  },
  {
    id: 'qwen2.5-1.5b-q4',
    name: 'Qwen 2.5 1.5B (Q4_K_M)',
    fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    sizeLabel: '~1 GB',
    sizeBytes: 1_050_000_000,
    description: 'Better understanding. Needs 4GB+ RAM phone.',
    recommended: false,
  },
] as const;

export type AvailableModel = typeof AVAILABLE_MODELS[number];

// Build the AI system prompt dynamically based on device type.
// This prompt powers ALL voice commands in Variable Claw.
function buildSystemPrompt(deviceType: string): string {
  const deviceSection = getDeviceSection(deviceType);

  return `You are Variable Claw AI — the command brain of a voice-controlled Bluetooth remote.
You receive spoken commands. You output ONLY one JSON object. Never explain. Never add text outside JSON.

TARGET DEVICE: ${deviceType.toUpperCase()}

═══ RESPONSE FORMAT ═══
Always respond with exactly one JSON object. Examples:
{"action":"openApp","app":"chrome"}
{"action":"searchYouTube","query":"lofi beats"}
{"action":"volumeUp"}

═══ CORE ACTIONS (LAPTOP/DESKTOP) ═══
APPS:       {"action":"openApp","app":"NAME"}  — chrome, notepad, code, spotify, discord, slack, telegram, calc, mspaint, cmd, excel, word, powerpnt, explorer, ms-settings:, taskmgr
WEB:        {"action":"openUrl","url":"https://..."}
YOUTUBE:    {"action":"searchYouTube","query":"..."}
GOOGLE:     {"action":"searchGoogle","query":"..."}
TYPE:       {"action":"typeText","text":"..."}
KEYS:       {"action":"pressKey","key":"a-z|enter|escape|tab|space|backspace|delete|up|down|left|right|f1-f12|home|end","modifiers":["ctrl","alt","shift","win"]}
WINDOW:     {"action":"closeWindow"} | {"action":"minimizeAll"} | {"action":"switchApp"} | {"action":"fullscreen"}
SYSTEM:     {"action":"lockScreen"} | {"action":"screenshot"} | {"action":"shutdown"} | {"action":"restart"} | {"action":"sleep"}
MEDIA:      {"action":"volumeUp"} | {"action":"volumeDown"} | {"action":"mute"}
BROWSER:    {"action":"newTab"} | {"action":"closeTab"} | {"action":"refresh"}

═══ NATURAL LANGUAGE MAPPING ═══
The user speaks casually. You MUST understand intent, not just keywords:

INTENT → ACTION:
"put on some music" / "play something" → searchYouTube "music playlist"
"open my browser" / "internet" → openApp "chrome"
"make it louder" / "turn up" / "I can't hear" → volumeUp
"shh" / "quiet" / "silence" / "shut up" → mute
"I'm leaving" / "done for today" / "secure it" / "brb" → lockScreen
"get rid of this" / "close it" / "kill this" → closeWindow
"go back" / "previous app" / "switch" → switchApp
"show desktop" / "hide everything" / "clear screen" → minimizeAll
"find me X" / "what is X" / "how to X" → searchGoogle "X"
"play X on youtube" / "watch X" / "listen to X" → searchYouTube "X"
"type my email" → typeText with the email
"undo" → pressKey key "z" modifiers ["ctrl"]
"redo" → pressKey key "y" modifiers ["ctrl"]
"copy" → pressKey key "c" modifiers ["ctrl"]
"paste" → pressKey key "v" modifiers ["ctrl"]
"save" / "save this" → pressKey key "s" modifiers ["ctrl"]
"select all" → pressKey key "a" modifiers ["ctrl"]
"print" → pressKey key "p" modifiers ["ctrl"]
"new tab" → newTab
"close tab" → closeTab
"refresh" / "reload" → refresh

${deviceSection}

═══ ROUTING RULES ═══
- LAPTOP/DESKTOP → use openApp, searchYouTube, searchGoogle, pressKey, etc.
- TV → use tvOpenApp, tvSearch, tvPlay, tvHome, tvBack, tvNavigate, tvSelect
- PHONE → use phoneOpenApp, phoneCall, phoneSMS, phoneAlarm, phoneCamera, phoneFlashlight, etc.
- UNKNOWN → {"action":"askDeviceType","text":"original command"}

═══ FALLBACK ═══
If you truly cannot understand: {"action":"unknown","text":"original command"}

Remember: Output ONLY the JSON. No explanation. No markdown. Just the raw JSON object.`;
}

function getDeviceSection(deviceType: string): string {
  if (deviceType === 'tv') {
    return `═══ TV ACTIONS (ACTIVE — this is a TV) ═══
{"action":"tvOpenApp","app":"NAME"} — hotstar, youtube, netflix, primevideo, zee5, sonyliv, jiocinema, spotify
{"action":"tvSearch","app":"NAME","query":"..."} — open app then search
{"action":"tvPlay","app":"NAME","query":"..."} — open app, search, and play first result
{"action":"tvHome"} — go to home screen
{"action":"tvBack"} — go back
{"action":"tvNavigate","direction":"up|down|left|right"} — D-pad
{"action":"tvSelect"} — press OK/confirm
{"action":"volumeUp"} / {"action":"volumeDown"} / {"action":"mute"} — TV volume

TV NATURAL LANGUAGE:
"open hotstar" → tvOpenApp "hotstar"
"play karthika deepam on hotstar" → tvPlay app:"hotstar" query:"karthika deepam"
"search money heist on netflix" → tvSearch app:"netflix" query:"money heist"
"go home" / "home screen" → tvHome
"go back" / "back" → tvBack
"select" / "ok" / "enter" / "click" → tvSelect
"up" / "down" / "left" / "right" → tvNavigate`;
  }

  if (deviceType === 'phone') {
    return `═══ PHONE ACTIONS (ACTIVE — this is a phone) ═══
{"action":"phoneOpenApp","app":"NAME"} — whatsapp, instagram, youtube, chrome, settings, camera, gallery, spotify, telegram
{"action":"phoneCall","number":"9876543210"}
{"action":"phoneSMS","number":"9876543210","message":"Hi!"}
{"action":"phoneAlarm","hour":7,"minute":0,"label":"Wake up"}
{"action":"phoneTimer","seconds":300,"label":"Tea"}
{"action":"phoneCamera"}
{"action":"phoneFlashlight","state":"on|off|toggle"}
{"action":"phoneVolume","direction":"up|down|mute"}
{"action":"phoneUrl","url":"https://..."}
{"action":"phoneSearch","query":"..."}
{"action":"phoneSettings","section":"wifi|bluetooth|display|sound|battery"}
{"action":"phoneShare","text":"..."}
{"action":"phoneBrightness","level":"up|down"}

PHONE NATURAL LANGUAGE:
"call 9876543210" / "call mom" → phoneCall
"message 9876543210 saying hello" → phoneSMS
"set alarm for 7 AM" → phoneAlarm hour:7 minute:0
"timer 5 minutes" → phoneTimer seconds:300
"take a photo" / "selfie" / "camera" → phoneCamera
"flashlight on" / "torch" → phoneFlashlight state:"on"
"open settings" → phoneSettings
"turn on wifi" → phoneSettings section:"wifi"
"brightness up" → phoneBrightness level:"up"
"open whatsapp" → phoneOpenApp "whatsapp"
"search restaurants near me" → phoneSearch`;
  }

  // Laptop/desktop — no extra section needed, core actions cover it
  return '';
}

type StatusCallback = (status: ModelStatus) => void;
type ProgressCallback = (progress: DownloadProgress) => void;

class OnDeviceLLMService {
  private nativeModule: OnDeviceLLMNative | null = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private _status: ModelStatus = 'none';
  private _nativeAvailable = false;
  private _modelPath: string | null = null;
  private _lastError: string | null = null;
  private _downloadProgress: DownloadProgress = { percent: 0, downloaded: 0, total: 0 };
  private _statusCallbacks: StatusCallback[] = [];
  private _progressCallbacks: ProgressCallback[] = [];

  // ─── Initialization ───

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      this._lastError = 'On-device LLM only supported on Android';
      return false;
    }

    try {
      const module = NativeModules.OnDeviceLLMModule;
      if (!module) {
        this._lastError = 'OnDeviceLLMModule not found. Build with expo-dev-client.';
        this._nativeAvailable = false;
        return false;
      }

      this.nativeModule = module as OnDeviceLLMNative;
      this.eventEmitter = new NativeEventEmitter(module);
      this.setupEventListeners();
      this._nativeAvailable = await this.nativeModule.isNativeAvailable();

      if (!this._nativeAvailable) {
        console.log('[OnDeviceLLM] Native llama library not loaded — running in mock mode (keyword-based AI).');
        console.log('[OnDeviceLLM] To enable real AI: npm run setup:llama && npx expo run:android');
      }

      // Check if model is already downloaded
      const models = await this.nativeModule.listModels();
      if (models.length > 0) {
        this._modelPath = models[0].path;
        this.setStatus('downloaded');
      }

      return true;
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'Init failed';
      return false;
    }
  }

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('onModelDownloadProgress', (event: DownloadProgress) => {
      this._downloadProgress = event;
      this._progressCallbacks.forEach(cb => cb(event));
    });

    this.eventEmitter.addListener('onModelLoadProgress', (event: { status: string }) => {
      if (event.status === 'loading') this.setStatus('loading');
      if (event.status === 'ready') this.setStatus('ready');
    });
  }

  // ─── Status ───

  get status(): ModelStatus { return this._status; }
  get isReady(): boolean { return this._status === 'ready'; }
  get isNativeAvailable(): boolean { return this._nativeAvailable; }
  get lastError(): string | null { return this._lastError; }
  get downloadProgress(): DownloadProgress { return this._downloadProgress; }
  get modelPath(): string | null { return this._modelPath; }

  private setStatus(status: ModelStatus) {
    this._status = status;
    this._statusCallbacks.forEach(cb => cb(status));
  }

  onStatusChange(callback: StatusCallback): () => void {
    this._statusCallbacks.push(callback);
    return () => {
      this._statusCallbacks = this._statusCallbacks.filter(cb => cb !== callback);
    };
  }

  onDownloadProgress(callback: ProgressCallback): () => void {
    this._progressCallbacks.push(callback);
    return () => {
      this._progressCallbacks = this._progressCallbacks.filter(cb => cb !== callback);
    };
  }

  // ─── Model Management ───

  async downloadModel(model: AvailableModel): Promise<boolean> {
    this.setStatus('downloading');
    this._lastError = null;

    try {
      if (!this.nativeModule) {
        this._lastError = 'Native module not available';
        this.setStatus('error');
        return false;
      }

      const result = await this.nativeModule.downloadModel(model.url, model.fileName);
      this._modelPath = result.path;

      if (result.cached) {
        console.log('[OnDeviceLLM] Model already downloaded:', result.path);
      } else {
        console.log('[OnDeviceLLM] Model downloaded:', result.path, `(${Math.round(result.sizeBytes / 1024 / 1024)} MB)`);
      }

      this.setStatus('downloaded');
      return true;
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'Download failed';
      this.setStatus('error');
      return false;
    }
  }

  async loadModel(nThreads = 4, nCtx = 512): Promise<boolean> {
    if (!this._modelPath) {
      this._lastError = 'No model downloaded';
      this.setStatus('error');
      return false;
    }

    this.setStatus('loading');
    this._lastError = null;

    try {
      if (!this.nativeModule) {
        this._lastError = 'Native module not available';
        this.setStatus('error');
        return false;
      }
      await this.nativeModule.loadModel(this._modelPath, nThreads, nCtx);
      this.setStatus('ready');
      return true;
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'Load failed';
      this.setStatus('error');
      return false;
    }
  }

  async unloadModel(): Promise<void> {
    if (this.nativeModule) {
      await this.nativeModule.unloadModel();
    }
    this.setStatus(this._modelPath ? 'downloaded' : 'none');
  }

  async deleteModel(fileName: string): Promise<void> {
    if (this.nativeModule) {
      await this.nativeModule.unloadModel();
      await this.nativeModule.deleteModel(fileName);
    }
    this._modelPath = null;
    this.setStatus('none');
  }

  async listDownloadedModels(): Promise<ModelInfo[]> {
    if (!this.nativeModule) return [];
    return await this.nativeModule.listModels();
  }

  // ─── Inference ───

  async parseCommand(voiceText: string, deviceType: string = 'laptop'): Promise<any | null> {
    const systemPrompt = buildSystemPrompt(deviceType);
    const prompt = `${systemPrompt}\n\nUser: ${voiceText}\nAssistant:`;

    try {
      if (!this.nativeModule) {
        console.error('[OnDeviceLLM] Native module not available for inference');
        return null;
      }

      const response = await this.nativeModule.generate(prompt, 200, 0.1);

      // Extract JSON from response (model might add extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('[OnDeviceLLM] Inference failed:', error);
      return null;
    }
  }

}

export const onDeviceLLM = new OnDeviceLLMService();
