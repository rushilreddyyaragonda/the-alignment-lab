import type { Scenario } from '@/types';
import { scholarshipScenario } from './scholarship';
import { emergencyScenario } from './emergency';
import { hiringScenario } from './hiring';
import { resourceScenario } from './resource';
import { crossingScenario } from './crossing';
import { moderationScenario } from './moderation';

export const scenarios: Scenario[] = [
  scholarshipScenario,
  emergencyScenario,
  hiringScenario,
  resourceScenario,
  crossingScenario,
  moderationScenario,
];

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}
