import type { ModelCapability } from './ProviderPresets';

export const ALL_SCENARIOS = [
  'LLM_CHAT',
  'LLM_REASONING',
  'VISION_OCR',
  'VISION_ANALYSIS',
  'EMBEDDING',
  'PAPER_RECOGNITION',
  'PAPER_GRADING',
] as const;

export type AiScenarioKey = (typeof ALL_SCENARIOS)[number];

export const SCENARIO_CAPABILITY: Record<AiScenarioKey, ModelCapability> = {
  LLM_CHAT: 'LLM',
  LLM_REASONING: 'LLM',
  VISION_OCR: 'VISION',
  VISION_ANALYSIS: 'VISION',
  EMBEDDING: 'EMBEDDING',
  PAPER_RECOGNITION: 'VISION',
  PAPER_GRADING: 'LLM',
};

export function capabilityFor(scenario: AiScenarioKey): ModelCapability {
  return SCENARIO_CAPABILITY[scenario];
}
