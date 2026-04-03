import { useState, useEffect, useCallback } from 'react';
import { memoryService } from '../services/MemoryService';
import { eventBus } from '../services/EventBus';
import { CommandHistoryEntry, RoutineDefinition, AppUsage, TimePattern } from '../types/agents';

/**
 * useMemory — React hook for accessing MemoryService data reactively.
 * Auto-refreshes when commands are executed or routines change.
 */
export function useMemory() {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [routines, setRoutines] = useState<RoutineDefinition[]>([]);
  const [frequentApps, setFrequentApps] = useState<AppUsage[]>([]);
  const [timePatterns, setTimePatterns] = useState<TimePattern[]>([]);
  const [totalCommands, setTotalCommands] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(true);

  const refresh = useCallback(() => {
    setHistory(memoryService.getRecentCommands(20));
    setRoutines(memoryService.getRoutines());
    setFrequentApps(memoryService.getFrequentApps(5));
    setTimePatterns(memoryService.getTimePatterns().slice(0, 10));
    setTotalCommands(memoryService.totalCommands);
    setIsFirstTime(memoryService.isFirstTime);
  }, []);

  useEffect(() => {
    // Initial load
    memoryService.initialize().then(refresh);

    // Refresh on events
    const unsub1 = eventBus.on('command:executed', refresh);
    const unsub2 = eventBus.on('routine:triggered', refresh);

    return () => { unsub1(); unsub2(); };
  }, [refresh]);

  const clearHistory = useCallback(async () => {
    await memoryService.clearHistory();
    refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await memoryService.clearAll();
    refresh();
  }, [refresh]);

  return {
    history,
    routines,
    frequentApps,
    timePatterns,
    totalCommands,
    isFirstTime,
    refresh,
    clearHistory,
    clearAll,
  };
}
