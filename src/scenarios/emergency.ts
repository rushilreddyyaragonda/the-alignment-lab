import type { Scenario } from '@/types';

// ============================================================================
// SCENARIO 02 — THE EMERGENCY DISPATCHER
// ============================================================================

export const emergencyScenario: Scenario = {
  id: 'emergency',
  name: 'The Emergency Dispatcher',
  tagline: 'Assign limited response resources to competing emergency requests',
  description:
    'A fictional emergency service must decide which unit to dispatch to incoming requests, balancing urgency, response time, and resource availability.',
  briefing: `A fictional emergency response center has 3 available units and must dispatch one to each incoming request. Requests differ in urgency (1-5), estimated response time (minutes), and type.

Key questions:
- Should the system minimize average response time (helping more people faster) or prioritize the most urgent cases first?
- What happens when the nearest unit is already assigned?
- Does optimizing for average response time systematically delay high-urgency requests in certain areas?`,
  disclaimer:
    'This is a simplified educational simulation. It is not a real emergency dispatch system.',
  inputSchema: [
    { name: 'requestId', label: 'Request ID', type: 'string', required: true },
    { name: 'urgency', label: 'Urgency (1-5)', type: 'number', required: true, min: 1, max: 5 },
    { name: 'responseTime', label: 'Est. Response Time (min)', type: 'number', required: true, min: 0, max: 60, unit: 'min' },
    { name: 'requestType', label: 'Request Type', type: 'enum', required: true, enumValues: ['medical', 'fire', 'security', 'rescue'] },
    { name: 'pedestrianInvolved', label: 'Pedestrian Involved', type: 'boolean', required: false },
    { name: 'area', label: 'Area', type: 'enum', required: false, enumValues: ['north', 'south', 'east', 'west'] },
  ],
  candidateActions: [
    {
      id: 'dispatch_nearest',
      name: 'Dispatch Nearest Unit',
      description: 'Send the closest available unit',
      attributes: { responseTime: 5, coverage: 0.9, riskLevel: 2, capacity: 1 },
      eligible: true,
    },
    {
      id: 'dispatch_fastest',
      name: 'Dispatch Fastest Unit',
      description: 'Send the unit with shortest estimated travel time',
      attributes: { responseTime: 3, coverage: 0.7, riskLevel: 3, capacity: 1 },
      eligible: true,
    },
    {
      id: 'dispatch_specialist',
      name: 'Dispatch Specialist Unit',
      description: 'Send a specialist team (slower but better equipped)',
      attributes: { responseTime: 12, coverage: 1.0, riskLevel: 1, capacity: 1 },
      eligible: true,
    },
    {
      id: 'queue_request',
      name: 'Queue Request',
      description: 'Hold the request until a unit becomes available',
      attributes: { responseTime: 30, coverage: 0.1, riskLevel: 5, capacity: 0 },
      eligible: true,
    },
  ],
  defaultRules: [
    {
      id: 'rule_critical_urgent',
      name: 'Critical Urgency Rule',
      description: 'Urgency level 5 requires specialist dispatch',
      priority: 100,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'urgency', operator: 'gte', value: 5 }],
      },
      effect: { kind: 'require_action', actionId: 'dispatch_specialist' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_pedestrian',
      name: 'Pedestrian Safety',
      description: 'If pedestrian involved, prefer specialist unit',
      priority: 80,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'pedestrianInvolved', operator: 'eq', value: true }],
      },
      effect: { kind: 'score_adjust', actionId: 'dispatch_specialist', delta: 0.4 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_fire_specialist',
      name: 'Fire Requires Specialist',
      description: 'Fire requests require specialist unit',
      priority: 90,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'requestType', operator: 'eq', value: 'fire' }],
      },
      effect: { kind: 'require_action', actionId: 'dispatch_specialist' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_fast_response',
      name: 'Fast Response Preference',
      description: 'Requests with response time > 10 min get boost for nearest unit',
      priority: 40,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'responseTime', operator: 'gt', value: 10 }],
      },
      effect: { kind: 'score_adjust', actionId: 'dispatch_nearest', delta: 0.2 },
      classification: 'soft',
      enabled: true,
    },
  ],
  defaultObjectives: [
    {
      id: 'obj_response_speed',
      name: 'Response Speed',
      description: 'Minimize response time',
      weight: 0.6,
      metricKey: 'response_time_metric',
      direction: 'minimize',
    },
    {
      id: 'obj_coverage',
      name: 'Coverage Quality',
      description: 'Maximize dispatch coverage quality',
      weight: 0.4,
      metricKey: 'coverage',
      direction: 'maximize',
    },
  ],
  defaultConstraints: [
    {
      id: 'con_capacity',
      name: 'Capacity Constraint',
      description: 'Cannot exceed available unit capacity',
      actionField: 'capacity',
      operator: 'lte',
      value: 1,
    },
    {
      id: 'con_safety',
      name: 'Safety Constraint',
      description: 'Risk level must be 3 or below for dispatch',
      actionField: 'riskLevel',
      operator: 'lte',
      value: 3,
    },
  ],
  evaluationCriteria: [
    {
      id: 'eval_avg_response',
      name: 'Average Response Time',
      description: 'Mean response time across all dispatched requests',
      metricKey: 'response_time_metric',
      direction: 'minimize',
      unit: 'min',
    },
    {
      id: 'eval_urgent_delay',
      name: 'High-Urgency Delay',
      description: 'Response time for urgency >= 4 requests',
      metricKey: 'response_time_metric',
      direction: 'minimize',
      unit: 'min',
      target: 10,
    },
  ],
  metricCalculators: {
    response_time_metric: (action) => action.attributes.responseTime as number,
    coverage: (action) => action.attributes.coverage as number,
    cost: (action) => action.attributes.riskLevel as number,
  },
  testInputs: [
    { id: 'req_01', data: { requestId: 'REQ-001', urgency: 3, responseTime: 5, requestType: 'medical', pedestrianInvolved: false, area: 'north' }, group: 'north' },
    { id: 'req_02', data: { requestId: 'REQ-002', urgency: 5, responseTime: 15, requestType: 'fire', pedestrianInvolved: true, area: 'south' }, group: 'south' },
    { id: 'req_03', data: { requestId: 'REQ-003', urgency: 2, responseTime: 3, requestType: 'security', pedestrianInvolved: false, area: 'east' }, group: 'east' },
    { id: 'req_04', data: { requestId: 'REQ-004', urgency: 4, responseTime: 8, requestType: 'medical', pedestrianInvolved: true, area: 'west' }, group: 'west' },
    { id: 'req_05', data: { requestId: 'REQ-005', urgency: 1, responseTime: 2, requestType: 'security', pedestrianInvolved: false, area: 'north' }, group: 'north' },
    { id: 'req_06', data: { requestId: 'REQ-006', urgency: 5, responseTime: 20, requestType: 'rescue', pedestrianInvolved: true, area: 'south' }, group: 'south' },
    { id: 'req_07', data: { requestId: 'REQ-007', urgency: 3, responseTime: 12, requestType: 'medical', pedestrianInvolved: false, area: 'east' }, group: 'east' },
    { id: 'req_08', data: { requestId: 'REQ-008', urgency: 4, responseTime: 6, requestType: 'fire', pedestrianInvolved: false, area: 'west' }, group: 'west' },
  ],
  groupField: 'area',
  groupLabels: { north: 'North Area', south: 'South Area', east: 'East Area', west: 'West Area' },
  defaultWeights: { response_time_metric: 0.6, coverage: 0.4 },
};
