import type { Scenario } from '@/types';

// ============================================================================
// SCENARIO 05 — THE AUTONOMOUS CROSSING
// ============================================================================

export const crossingScenario: Scenario = {
  id: 'crossing',
  name: 'The Autonomous Crossing',
  tagline: 'A transportation controller navigates competing traffic and pedestrian demands',
  description:
    'A fictional transportation controller must choose actions at a crossing under different traffic, pedestrian, and accessibility conditions. The user defines rules for waiting, proceeding, prioritization, and safe stopping.',
  briefing: `A fictional autonomous crossing controller must decide what action to take at an intersection given current conditions: traffic density, pedestrian presence, accessibility needs, sensor confidence, and weather.

Key questions:
- Can a system that optimizes for traffic throughput systematically disadvantage pedestrians or accessibility users?
- What happens when sensor confidence is low — should the system proceed with incomplete information?
- Can safety constraints ever conflict with efficiency objectives?`,
  disclaimer:
    'This is a simplified educational simulation. It is not a production traffic controller or validated autonomous-vehicle system.',
  inputSchema: [
    { name: 'intersectionId', label: 'Intersection ID', type: 'string', required: true },
    { name: 'trafficDensity', label: 'Traffic Density (0-100)', type: 'number', required: true, min: 0, max: 100 },
    { name: 'pedestrianPresent', label: 'Pedestrian Present', type: 'boolean', required: true },
    { name: 'accessibilityRequest', label: 'Accessibility Request', type: 'boolean', required: false },
    { name: 'sensorConfidence', label: 'Sensor Confidence (0-100)', type: 'number', required: true, min: 0, max: 100 },
    { name: 'weatherCondition', label: 'Weather Condition', type: 'enum', required: true, enumValues: ['clear', 'rain', 'fog', 'snow'] },
  ],
  candidateActions: [
    {
      id: 'proceed',
      name: 'Proceed Through Crossing',
      description: 'Vehicle proceeds through the intersection',
      attributes: { throughput: 1.0, safetyScore: 5, delay: 0, riskLevel: 3 },
      eligible: true,
    },
    {
      id: 'yield',
      name: 'Yield and Slow',
      description: 'Slow down but continue through the crossing',
      attributes: { throughput: 0.6, safetyScore: 7, delay: 5, riskLevel: 2 },
      eligible: true,
    },
    {
      id: 'stop',
      name: 'Full Stop',
      description: 'Come to a complete stop and wait',
      attributes: { throughput: 0.1, safetyScore: 10, delay: 30, riskLevel: 1 },
      eligible: true,
    },
    {
      id: 'emergency_stop',
      name: 'Emergency Stop',
      description: 'Immediate emergency stop for hazard response',
      attributes: { throughput: 0, safetyScore: 10, delay: 60, riskLevel: 0 },
      eligible: true,
    },
  ],
  defaultRules: [
    {
      id: 'rule_pedestrian_stop',
      name: 'Pedestrian Safety Rule',
      description: 'If pedestrian present, must stop or yield — never proceed',
      priority: 100,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'pedestrianPresent', operator: 'eq', value: true }],
      },
      effect: { kind: 'exclude_action', actionId: 'proceed' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_accessibility_priority',
      name: 'Accessibility Priority',
      description: 'Accessibility requests require full stop',
      priority: 95,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'accessibilityRequest', operator: 'eq', value: true }],
      },
      effect: { kind: 'require_action', actionId: 'stop' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_low_sensor',
      name: 'Low Sensor Confidence',
      description: 'Sensor confidence below 50 requires yield or stop',
      priority: 90,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'sensorConfidence', operator: 'lt', value: 50 }],
      },
      effect: { kind: 'exclude_action', actionId: 'proceed' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_bad_weather',
      name: 'Bad Weather Caution',
      description: 'Snow or fog conditions boost yield score',
      priority: 50,
      condition: {
        gate: 'OR',
        conditions: [
          { field: 'weatherCondition', operator: 'eq', value: 'snow' },
          { field: 'weatherCondition', operator: 'eq', value: 'fog' },
        ],
      },
      effect: { kind: 'score_adjust', actionId: 'yield', delta: 0.3 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_high_traffic',
      name: 'High Traffic Preference',
      description: 'High traffic density (>70) boosts proceed score',
      priority: 30,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'trafficDensity', operator: 'gt', value: 70 }],
      },
      effect: { kind: 'score_adjust', actionId: 'proceed', delta: 0.2 },
      classification: 'soft',
      enabled: true,
    },
  ],
  defaultObjectives: [
    {
      id: 'obj_throughput',
      name: 'Traffic Throughput',
      description: 'Maximize traffic throughput',
      weight: 0.5,
      metricKey: 'throughput',
      direction: 'maximize',
    },
    {
      id: 'obj_safety',
      name: 'Safety Score',
      description: 'Maximize safety score',
      weight: 0.5,
      metricKey: 'safety',
      direction: 'maximize',
    },
  ],
  defaultConstraints: [
    {
      id: 'con_safety_min',
      name: 'Minimum Safety',
      description: 'Safety score must be at least 5',
      actionField: 'safetyScore',
      operator: 'gte',
      value: 5,
    },
    {
      id: 'con_risk_max',
      name: 'Maximum Risk',
      description: 'Risk level must not exceed 3',
      actionField: 'riskLevel',
      operator: 'lte',
      value: 3,
    },
  ],
  evaluationCriteria: [
    {
      id: 'eval_throughput',
      name: 'Average Throughput',
      description: 'Mean throughput across all decisions',
      metricKey: 'throughput',
      direction: 'maximize',
    },
    {
      id: 'eval_safety',
      name: 'Average Safety',
      description: 'Mean safety score',
      metricKey: 'safety',
      direction: 'maximize',
      target: 7,
    },
    {
      id: 'eval_pedestrian_safety',
      name: 'Pedestrian Safety Compliance',
      description: 'Proportion of pedestrian-present cases where vehicle stops',
      metricKey: 'safety',
      direction: 'maximize',
      target: 7,
    },
  ],
  metricCalculators: {
    throughput: (action) => action.attributes.throughput as number,
    safety: (action) => action.attributes.safetyScore as number,
    cost: (action) => action.attributes.delay as number,
  },
  testInputs: [
    { id: 'int_01', data: { intersectionId: 'INT-001', trafficDensity: 45, pedestrianPresent: true, accessibilityRequest: false, sensorConfidence: 85, weatherCondition: 'clear' } },
    { id: 'int_02', data: { intersectionId: 'INT-002', trafficDensity: 80, pedestrianPresent: false, accessibilityRequest: false, sensorConfidence: 90, weatherCondition: 'clear' } },
    { id: 'int_03', data: { intersectionId: 'INT-003', trafficDensity: 30, pedestrianPresent: true, accessibilityRequest: true, sensorConfidence: 70, weatherCondition: 'rain' } },
    { id: 'int_04', data: { intersectionId: 'INT-004', trafficDensity: 60, pedestrianPresent: false, accessibilityRequest: false, sensorConfidence: 40, weatherCondition: 'fog' } },
    { id: 'int_05', data: { intersectionId: 'INT-005', trafficDensity: 90, pedestrianPresent: true, accessibilityRequest: false, sensorConfidence: 95, weatherCondition: 'clear' } },
    { id: 'int_06', data: { intersectionId: 'INT-006', trafficDensity: 20, pedestrianPresent: false, accessibilityRequest: true, sensorConfidence: 25, weatherCondition: 'snow' } },
    { id: 'int_07', data: { intersectionId: 'INT-007', trafficDensity: 55, pedestrianPresent: true, accessibilityRequest: true, sensorConfidence: 60, weatherCondition: 'rain' } },
    { id: 'int_08', data: { intersectionId: 'INT-008', trafficDensity: 75, pedestrianPresent: false, accessibilityRequest: false, sensorConfidence: 80, weatherCondition: 'clear' } },
  ],
  defaultWeights: { throughput: 0.5, safety: 0.5 },
};
