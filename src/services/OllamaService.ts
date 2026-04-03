// OllamaService — Manages connection to Qwen 2.5 via Ollama
// Ollama runs on laptop, phone connects over local WiFi

export type OllamaStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaConfig {
  baseUrl: string; // e.g. http://192.168.1.100:11434
  model: string;   // e.g. qwen2.5, qwen2.5:0.5b
  timeout: number; // ms
}

const SYSTEM_PROMPT = `You are a command parser for a voice-controlled laptop assistant. The user speaks a command and you must convert it into a JSON action.

Available actions and their formats:
- {"action": "openApp", "app": "appname"} - Opens an application via Win+R
- {"action": "openUrl", "url": "https://..."} - Opens a URL in browser
- {"action": "searchYouTube", "query": "search terms"} - Searches YouTube
- {"action": "searchGoogle", "query": "search terms"} - Searches Google
- {"action": "typeText", "text": "text to type"} - Types text
- {"action": "pressKey", "key": "keyname", "modifiers": ["ctrl"]} - Presses a key combo
- {"action": "lockScreen"} - Locks the computer (Win+L)
- {"action": "screenshot"} - Takes a screenshot (Win+PrintScreen)
- {"action": "closeWindow"} - Closes current window (Alt+F4)
- {"action": "minimizeAll"} - Shows desktop (Win+D)
- {"action": "switchApp"} - Alt+Tab
- {"action": "volumeUp"} / {"action": "volumeDown"} / {"action": "mute"}
- {"action": "shutdown"} / {"action": "restart"} / {"action": "sleep"}
- {"action": "newTab"} / {"action": "closeTab"} / {"action": "refresh"} / {"action": "fullscreen"}

Respond with ONLY the JSON, no explanation. If you cannot parse the command, respond with {"action": "unknown", "text": "original text"}.`;

class OllamaServiceClass {
  private _status: OllamaStatus = 'disconnected';
  private _config: OllamaConfig = {
    baseUrl: '',
    model: 'qwen2.5',
    timeout: 10000,
  };
  private _availableModels: string[] = [];
  private _statusCallbacks: ((status: OllamaStatus) => void)[] = [];
  private _lastError: string | null = null;

  // ─── Configuration ───

  configure(baseUrl: string, model?: string) {
    // Normalize: remove trailing slash, ensure no /v1 or /api suffix
    let url = baseUrl.trim().replace(/\/+$/, '');
    // If user pasted full chat completions URL, extract base
    url = url.replace(/\/v1\/chat\/completions$/, '');
    url = url.replace(/\/api\/chat$/, '');
    url = url.replace(/\/api\/generate$/, '');

    this._config.baseUrl = url;
    if (model) this._config.model = model;
  }

  get config(): Readonly<OllamaConfig> {
    return this._config;
  }

  get status(): OllamaStatus {
    return this._status;
  }

  get lastError(): string | null {
    return this._lastError;
  }

  get availableModels(): string[] {
    return this._availableModels;
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  get chatEndpoint(): string {
    return `${this._config.baseUrl}/v1/chat/completions`;
  }

  // ─── Status Callbacks ───

  onStatusChange(callback: (status: OllamaStatus) => void): () => void {
    this._statusCallbacks.push(callback);
    return () => {
      this._statusCallbacks = this._statusCallbacks.filter(cb => cb !== callback);
    };
  }

  private setStatus(status: OllamaStatus) {
    this._status = status;
    this._statusCallbacks.forEach(cb => cb(status));
  }

  // ─── Connection Test ───

  async testConnection(): Promise<boolean> {
    if (!this._config.baseUrl) {
      this._lastError = 'No Ollama URL configured';
      this.setStatus('disconnected');
      return false;
    }

    this.setStatus('connecting');
    this._lastError = null;

    try {
      // Test 1: Check if Ollama is reachable via /api/tags
      const tagsResponse = await fetchWithTimeout(
        `${this._config.baseUrl}/api/tags`,
        { method: 'GET' },
        this._config.timeout
      );

      if (!tagsResponse.ok) {
        throw new Error(`Ollama returned ${tagsResponse.status}`);
      }

      const tagsData = await tagsResponse.json();
      this._availableModels = (tagsData.models || []).map((m: OllamaModel) => m.name);

      // Check if configured model is available
      const modelAvailable = this._availableModels.some(
        m => m.startsWith(this._config.model)
      );

      if (!modelAvailable && this._availableModels.length > 0) {
        // Auto-select first available model with qwen in name, or first model
        const qwenModel = this._availableModels.find(m => m.includes('qwen'));
        this._config.model = qwenModel || this._availableModels[0];
        console.log(`[Ollama] Model auto-selected: ${this._config.model}`);
      }

      this.setStatus('connected');
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Connection failed';
      this._lastError = msg;
      this.setStatus('error');
      console.error('[Ollama] Connection test failed:', msg);
      return false;
    }
  }

  // ─── Send Command to AI ───

  async parseCommand(voiceText: string): Promise<any | null> {
    if (!this._config.baseUrl) return null;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: voiceText },
      ];

      const response = await fetchWithTimeout(
        this.chatEndpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this._config.model,
            messages,
            temperature: 0.1,
            max_tokens: 200,
            stream: false,
          }),
        },
        this._config.timeout
      );

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data = await response.json();
      // Support both OpenAI format and Ollama native format
      const content = data.choices?.[0]?.message?.content
        || data.message?.content
        || '';

      const parsed = JSON.parse(content);
      return parsed;
    } catch (error) {
      console.error('[Ollama] Parse command failed:', error);
      return null;
    }
  }

  // ─── General AI Chat ───

  /**
   * General-purpose AI chat. Used by all agents for AI-powered features.
   * Returns raw text response, or null if Ollama isn't available.
   */
  async chat(systemPrompt: string, userMessage: string, options?: { temperature?: number; maxTokens?: number }): Promise<string | null> {
    if (!this.isConnected || !this._config.baseUrl) return null;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const response = await fetchWithTimeout(
        this.chatEndpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this._config.model,
            messages,
            temperature: options?.temperature ?? 0.3,
            max_tokens: options?.maxTokens ?? 300,
            stream: false,
          }),
        },
        this._config.timeout
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.choices?.[0]?.message?.content || data.message?.content || null;
    } catch {
      return null;
    }
  }

  /**
   * AI chat that expects a JSON response. Parses and returns the object, or null.
   */
  async chatJSON<T = any>(systemPrompt: string, userMessage: string, options?: { temperature?: number; maxTokens?: number }): Promise<T | null> {
    const raw = await this.chat(systemPrompt, userMessage, options);
    if (!raw) return null;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if (arrMatch) return JSON.parse(arrMatch[0]);
      return null;
    } catch {
      return null;
    }
  }

  // ─── Pull Model (if not installed) ───

  async pullModel(modelName?: string): Promise<boolean> {
    const model = modelName || this._config.model;
    try {
      const response = await fetch(`${this._config.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Fetch with timeout helper
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export const ollamaService = new OllamaServiceClass();
