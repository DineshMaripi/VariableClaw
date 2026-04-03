import { DeviceType } from '../../types';
import { ollamaService } from '../OllamaService';
import { memoryService } from '../MemoryService';

/**
 * SmartSuggestionAgent — AI-powered context-aware command suggestions.
 * Uses Ollama to generate personalized suggestions based on time,
 * connected devices, and usage history.
 * Falls back to hardcoded rules when AI is unavailable.
 */

export interface Suggestion {
  id: string;
  icon: string;        // Ionicons name
  label: string;
  voiceCommand: string; // What to send to VoiceCommandAgent
  gradient: [string, string];
  reason: string;       // Why this is suggested
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

const SUGGESTION_PROMPT = `You are the AI brain of Variable Claw, a voice-controlled remote app.
Generate 4 smart action suggestions for the user based on their context.

Respond with ONLY a JSON array. Each item must have:
- "label": short button label (2-3 words max)
- "voiceCommand": the exact voice command to execute (e.g. "open chrome", "volume up", "play lofi on youtube")
- "reason": 2-4 word reason shown below the button (e.g. "Start your day", "Relax time")
- "icon": Ionicons icon name (e.g. "globe-outline", "musical-notes-outline", "lock-closed-outline", "moon-outline", "play-circle-outline", "code-slash-outline", "camera-outline", "volume-high-outline")

Available voice commands: open [app], search [query] on youtube, search [query] on google, volume up, volume down, mute, lock the laptop, take a screenshot, close window, minimize all, switch app, new tab, close tab, refresh, sleep the laptop, shutdown the laptop, open [url].
For TV: open youtube, open netflix, open hotstar, volume up/down, mute.

Respond with ONLY the JSON array, nothing else.`;

const GREETING_PROMPT = `You are Variable Claw AI, a friendly voice-controlled remote assistant.
Generate a short, contextual greeting (under 6 words) based on the time and situation.
Be creative but concise. No emojis. Respond with ONLY the greeting text, nothing else.`;

// Gradient palette for AI suggestions
const GRADIENTS: [string, string][] = [
  ['#6c63ff', '#a29bfe'],
  ['#00d4aa', '#7bed9f'],
  ['#ff4757', '#ff6b81'],
  ['#2ed573', '#7bed9f'],
  ['#ffa502', '#ffc048'],
  ['#007ACC', '#45a3e6'],
];

export class SmartSuggestionAgent {
  readonly name = 'SmartSuggestionAgent';

  private recentCommands: string[] = [];
  private maxRecent = 20;
  private _cachedAISuggestions: Suggestion[] | null = null;
  private _cacheTime = 0;
  private _cachedGreeting: string | null = null;
  private _greetingCacheTime = 0;

  /** Record a command that was executed */
  recordCommand(command: string) {
    this.recentCommands.unshift(command.toLowerCase());
    if (this.recentCommands.length > this.maxRecent) {
      this.recentCommands.pop();
    }
    // Invalidate cache when new commands are recorded
    this._cachedAISuggestions = null;
  }

  /** Get time-of-day context */
  private getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /** Get AI-powered greeting, with fallback */
  async getGreeting(): Promise<string> {
    // Cache for 10 minutes
    if (this._cachedGreeting && Date.now() - this._greetingCacheTime < 600_000) {
      return this._cachedGreeting;
    }

    const time = this.getTimeOfDay();
    const hour = new Date().getHours();

    if (ollamaService.isConnected) {
      try {
        const greeting = await ollamaService.chat(
          GREETING_PROMPT,
          `Time: ${time}, hour: ${hour}:00. Recent activity: ${this.recentCommands.slice(0, 3).join(', ') || 'none yet'}`,
          { temperature: 0.7, maxTokens: 20 }
        );
        if (greeting && greeting.length < 40) {
          this._cachedGreeting = greeting.replace(/['"]/g, '').trim();
          this._greetingCacheTime = Date.now();
          return this._cachedGreeting;
        }
      } catch { /* fall through */ }
    }

    // Fallback
    const fallback = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Working late?' };
    return fallback[time];
  }

  /**
   * Generate AI-powered suggestions. Falls back to hardcoded rules.
   * Returns cached results if less than 5 minutes old.
   */
  async getAISuggestions(connectedDeviceTypes: DeviceType[]): Promise<Suggestion[]> {
    // Return cache if fresh (5 min)
    if (this._cachedAISuggestions && Date.now() - this._cacheTime < 300_000) {
      return this._cachedAISuggestions;
    }

    if (ollamaService.isConnected) {
      try {
        // Pull pattern data from MemoryService
        const frequentApps = memoryService.getFrequentApps(3);
        const timePatterns = memoryService.getTimePatterns().slice(0, 5);
        const recentHistory = memoryService.getRecentCommands(5);

        const context = [
          `Time: ${this.getTimeOfDay()} (${new Date().getHours()}:00)`,
          `Day: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]}`,
          `Connected devices: ${connectedDeviceTypes.join(', ') || 'none'}`,
          `Recent commands: ${recentHistory.map(c => c.text).join(', ') || this.recentCommands.slice(0, 5).join(', ') || 'none yet'}`,
          `Most used apps: ${frequentApps.map(a => `${a.name} (${a.count}x)`).join(', ') || 'none yet'}`,
          `Time patterns: ${timePatterns.map(p => `${p.action} at ${p.hour}:00 (${p.count}x)`).join(', ') || 'none detected'}`,
          `Total commands ever: ${memoryService.totalCommands}`,
        ].join('\n');

        const result = await ollamaService.chatJSON<any[]>(
          SUGGESTION_PROMPT,
          context,
          { temperature: 0.5, maxTokens: 400 }
        );

        if (Array.isArray(result) && result.length > 0) {
          const suggestions: Suggestion[] = result.slice(0, 6).map((item, i) => ({
            id: `ai-${Date.now()}-${i}`,
            icon: item.icon || 'sparkles-outline',
            label: String(item.label || '').slice(0, 20),
            voiceCommand: String(item.voiceCommand || ''),
            gradient: GRADIENTS[i % GRADIENTS.length],
            reason: `✨ ${String(item.reason || 'AI suggested').slice(0, 30)}`,
          })).filter(s => s.voiceCommand.length > 0);

          if (suggestions.length > 0) {
            this._cachedAISuggestions = suggestions;
            this._cacheTime = Date.now();
            return suggestions;
          }
        }
      } catch { /* fall through to hardcoded */ }
    }

    // Fallback to hardcoded suggestions
    return this.getHardcodedSuggestions(connectedDeviceTypes);
  }

  /**
   * Synchronous hardcoded suggestions (original logic).
   * Used as fallback when AI is unavailable.
   */
  getHardcodedSuggestions(connectedDeviceTypes: DeviceType[]): Suggestion[] {
    const time = this.getTimeOfDay();
    const hasTV = connectedDeviceTypes.includes('tv');
    const hasLaptop = connectedDeviceTypes.includes('laptop') || connectedDeviceTypes.includes('desktop');
    const suggestions: Suggestion[] = [];

    if (time === 'morning' && hasLaptop) {
      suggestions.push({ id: 'morning-chrome', icon: 'globe-outline', label: 'Open Browser', voiceCommand: 'open chrome', gradient: ['#6c63ff', '#a29bfe'], reason: 'Start your day' });
      suggestions.push({ id: 'morning-news', icon: 'newspaper-outline', label: 'News', voiceCommand: 'search today news on google', gradient: ['#00d4aa', '#7bed9f'], reason: 'Morning briefing' });
    }

    if (time === 'evening') {
      if (hasTV) {
        suggestions.push({ id: 'evening-tv-youtube', icon: 'play-circle-outline', label: 'YouTube', voiceCommand: 'open youtube', gradient: ['#ff4757', '#ff6b81'], reason: 'Relax time' });
      }
      if (hasLaptop) {
        suggestions.push({ id: 'evening-lock', icon: 'lock-closed-outline', label: 'Lock Laptop', voiceCommand: 'lock the laptop', gradient: ['#ffa502', '#ffc048'], reason: 'Done for the day?' });
      }
    }

    if (time === 'night') {
      if (hasLaptop) {
        suggestions.push({ id: 'night-sleep', icon: 'moon-outline', label: 'Sleep PC', voiceCommand: 'sleep the laptop', gradient: ['#5352ed', '#7c7cf7'], reason: 'Time to rest' });
      }
    }

    if (time === 'afternoon' && hasLaptop) {
      suggestions.push({ id: 'afternoon-music', icon: 'musical-notes-outline', label: 'Focus Music', voiceCommand: 'play lofi hip hop on youtube', gradient: ['#2ed573', '#7bed9f'], reason: 'Stay productive' });
      suggestions.push({ id: 'afternoon-code', icon: 'code-slash-outline', label: 'VS Code', voiceCommand: 'open vs code', gradient: ['#007ACC', '#45a3e6'], reason: 'Code time' });
    }

    if (hasLaptop && suggestions.length < 6) {
      suggestions.push({ id: 'screenshot', icon: 'camera-outline', label: 'Screenshot', voiceCommand: 'take a screenshot', gradient: ['#FF6B6B', '#ff9f9f'], reason: 'Quick capture' });
    }

    // Frequent command suggestions
    const frequentApps = this.getMostFrequentApps();
    for (const app of frequentApps) {
      if (suggestions.length >= 6) break;
      if (!suggestions.find(s => s.voiceCommand.includes(app))) {
        suggestions.push({
          id: `frequent-${app}`,
          icon: 'star-outline',
          label: app.charAt(0).toUpperCase() + app.slice(1),
          voiceCommand: `open ${app}`,
          gradient: ['#6c63ff', '#a29bfe'],
          reason: 'Used often',
        });
      }
    }

    return suggestions.slice(0, 6);
  }

  /** Extract most frequently opened apps from command history */
  private getMostFrequentApps(): string[] {
    const appCounts = new Map<string, number>();
    for (const cmd of this.recentCommands) {
      const match = cmd.match(/(?:open|launch)\s+(.+)/i);
      if (match) {
        const app = match[1].trim();
        appCounts.set(app, (appCounts.get(app) || 0) + 1);
      }
    }
    return Array.from(appCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([app]) => app);
  }
}

export const smartSuggestionAgent = new SmartSuggestionAgent();
