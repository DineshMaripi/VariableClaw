// Core agents
export { BaseAgent } from './BaseAgent';
export type { AgentResult } from './BaseAgent';
export { VoiceCommandAgent, voiceCommandAgent } from './VoiceCommandAgent';
export { CommandExecutionAgent, commandExecutionAgent } from './CommandExecutionAgent';
export type { ExecutionResult } from './CommandExecutionAgent';
export { SmartSuggestionAgent, smartSuggestionAgent } from './SmartSuggestionAgent';
export type { Suggestion } from './SmartSuggestionAgent';
export { DeviceTypeDetectorAgent, deviceTypeDetectorAgent } from './DeviceTypeDetectorAgent';
export { DeviceConnectionAgent, deviceConnectionAgent } from './DeviceConnectionAgent';

// New agents (Phase 2)
export { ConversationAgent, conversationAgent } from './ConversationAgent';
export { RoutineAgent, routineAgent } from './RoutineAgent';
export { agentOrchestrator } from './AgentOrchestrator';
export type { OrchestratorResult } from './AgentOrchestrator';

// Foundation services
export { eventBus } from '../EventBus';
export { memoryService } from '../MemoryService';
export { contextManager } from '../ContextManager';
