import type { Scenario } from '@/types';

// ============================================================================
// SCENARIO 04 — THE PUBLIC RESOURCE ALLOCATOR
// ============================================================================

export const resourceScenario: Scenario = {
  id: 'resource',
  name: 'The Public Resource Allocator',
  tagline: 'Distribute limited public resources across districts with different needs',
  description:
    'A city must distribute a limited quantity of a fictional public resource across several districts. The user chooses between maximizing total output, satisfying minimum service guarantees, and reducing disparities.',
  briefing: `A fictional city has 100 units of a public resource to distribute across 6 districts. Each district has a different population, need level, and absorption capacity. The system must decide how much to allocate to each district.

Key questions:
- Does maximizing total output leave the worst-served district with almost nothing?
- Does a minimum-guarantee policy reduce overall efficiency?
- Is it possible to reduce disparities without sacrificing total output?`,
  disclaimer:
    'This is a fictional educational simulation about resource allocation trade-offs.',
  inputSchema: [
    { name: 'districtId', label: 'District ID', type: 'string', required: true },
    { name: 'population', label: 'Population (thousands)', type: 'number', required: true, min: 1, max: 500, unit: 'k' },
    { name: 'needLevel', label: 'Need Level (1-10)', type: 'number', required: true, min: 1, max: 10 },
    { name: 'capacity', label: 'Absorption Capacity (units)', type: 'number', required: true, min: 1, max: 50, unit: 'units' },
    { name: 'currentService', label: 'Current Service Level (0-100)', type: 'number', required: true, min: 0, max: 100 },
    { name: 'region', label: 'Region', type: 'enum', required: false, enumValues: ['urban', 'suburban', 'rural'] },
  ],
  candidateActions: [
    {
      id: 'high_allocation',
      name: 'High Allocation (30 units)',
      description: 'Allocate a large quantity of resources',
      attributes: { units: 30, serviceOutput: 90, cost: 30, coverage: 0.95 },
      eligible: true,
    },
    {
      id: 'medium_allocation',
      name: 'Medium Allocation (15 units)',
      description: 'Allocate a moderate quantity',
      attributes: { units: 15, serviceOutput: 60, cost: 15, coverage: 0.70 },
      eligible: true,
    },
    {
      id: 'low_allocation',
      name: 'Low Allocation (5 units)',
      description: 'Allocate a small quantity',
      attributes: { units: 5, serviceOutput: 30, cost: 5, coverage: 0.40 },
      eligible: true,
    },
    {
      id: 'no_allocation',
      name: 'No Allocation (0 units)',
      description: 'Do not allocate resources to this district',
      attributes: { units: 0, serviceOutput: 10, cost: 0, coverage: 0.10 },
      eligible: true,
    },
  ],
  defaultRules: [
    {
      id: 'rule_high_need',
      name: 'High Need Priority',
      description: 'Districts with need level ≥ 7 get boost for high allocation',
      priority: 50,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'needLevel', operator: 'gte', value: 7 }],
      },
      effect: { kind: 'score_adjust', actionId: 'high_allocation', delta: 0.3 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_capacity_limit',
      name: 'Capacity Limit',
      description: 'Cannot allocate more than district capacity',
      priority: 100,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'capacity', operator: 'lt', value: 20 }],
      },
      effect: { kind: 'exclude_action', actionId: 'high_allocation' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_low_service',
      name: 'Low Service Boost',
      description: 'Districts with current service < 30 get boost for medium allocation',
      priority: 40,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'currentService', operator: 'lt', value: 30 }],
      },
      effect: { kind: 'score_adjust', actionId: 'medium_allocation', delta: 0.2 },
      classification: 'soft',
      enabled: true,
    },
  ],
  defaultObjectives: [
    {
      id: 'obj_output',
      name: 'Total Service Output',
      description: 'Maximize total service output across districts',
      weight: 0.6,
      metricKey: 'service_output',
      direction: 'maximize',
    },
    {
      id: 'obj_coverage',
      name: 'Coverage Equity',
      description: 'Maximize minimum coverage across districts',
      weight: 0.4,
      metricKey: 'coverage',
      direction: 'maximize',
    },
  ],
  defaultConstraints: [
    {
      id: 'con_total_budget',
      name: 'Total Budget (100 units)',
      description: 'Total allocation cannot exceed 100 units',
      actionField: 'units',
      operator: 'lte',
      value: 100,
    },
    {
      id: 'con_district_capacity',
      name: 'District Capacity',
      description: 'Allocation cannot exceed 30 units per district',
      actionField: 'cost',
      operator: 'lte',
      value: 30,
    },
  ],
  evaluationCriteria: [
    {
      id: 'eval_total_output',
      name: 'Total Service Output',
      description: 'Sum of service output across all districts',
      metricKey: 'service_output',
      direction: 'maximize',
    },
    {
      id: 'eval_min_coverage',
      name: 'Minimum Coverage',
      description: 'Lowest coverage across all districts',
      metricKey: 'coverage',
      direction: 'maximize',
      target: 0.5,
    },
    {
      id: 'eval_unmet_demand',
      name: 'Unmet Demand',
      description: 'Districts receiving no allocation',
      metricKey: 'unmet',
      direction: 'minimize',
    },
  ],
  metricCalculators: {
    service_output: (action) => action.attributes.serviceOutput as number,
    coverage: (action) => action.attributes.coverage as number,
    cost: (action) => action.attributes.cost as number,
    unmet: (action) => (action.attributes.units as number) === 0 ? 1 : 0,
  },
  testInputs: [
    { id: 'dist_01', data: { districtId: 'DIS-001', population: 250, needLevel: 9, capacity: 40, currentService: 15, region: 'urban' }, group: 'urban' },
    { id: 'dist_02', data: { districtId: 'DIS-002', population: 120, needLevel: 5, capacity: 25, currentService: 55, region: 'suburban' }, group: 'suburban' },
    { id: 'dist_03', data: { districtId: 'DIS-003', population: 80, needLevel: 8, capacity: 15, currentService: 20, region: 'rural' }, group: 'rural' },
    { id: 'dist_04', data: { districtId: 'DIS-004', population: 300, needLevel: 3, capacity: 50, currentService: 75, region: 'urban' }, group: 'urban' },
    { id: 'dist_05', data: { districtId: 'DIS-005', population: 50, needLevel: 10, capacity: 10, currentService: 5, region: 'rural' }, group: 'rural' },
    { id: 'dist_06', data: { districtId: 'DIS-006', population: 180, needLevel: 6, capacity: 30, currentService: 40, region: 'suburban' }, group: 'suburban' },
  ],
  groupField: 'region',
  groupLabels: { urban: 'Urban', suburban: 'Suburban', rural: 'Rural' },
  defaultWeights: { service_output: 0.6, coverage: 0.4 },
};
