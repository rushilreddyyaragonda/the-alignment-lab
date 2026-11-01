import type { Scenario } from '@/types';

// ============================================================================
// SCENARIO 01 — THE SCHOLARSHIP ALLOCATOR
// ============================================================================

export const scholarshipScenario: Scenario = {
  id: 'scholarship',
  name: 'The Scholarship Allocator',
  tagline: 'Distribute limited funding across applicants with different needs',
  description:
    'A fictional institution has a fixed scholarship budget and must decide how much funding to award each applicant. Different policies produce very different distributions.',
  briefing: `A fictional scholarship committee has a budget of $50,000 and 10 applicants. Each applicant has different financial need, academic merit, and eligibility status. The system must decide which funding level to assign to each applicant while respecting the budget constraint.

Key questions:
- Should the system maximize the number of applicants helped (many small awards) or prioritize those with greatest need (fewer large awards)?
- Does a merit-weighted policy systematically disadvantage certain groups?
- What happens when the budget runs out before all eligible applicants are funded?`,
  disclaimer:
    'This is a fictional educational simulation. It does not represent real admissions or financial-aid decisions.',
  inputSchema: [
    { name: 'applicantId', label: 'Applicant ID', type: 'string', required: true },
    { name: 'financialNeed', label: 'Financial Need ($)', type: 'number', required: true, min: 0, max: 50000, unit: '$' },
    { name: 'academicMerit', label: 'Academic Merit (0-100)', type: 'number', required: true, min: 0, max: 100 },
    { name: 'eligible', label: 'Eligible', type: 'boolean', required: true },
    { name: 'group', label: 'Group', type: 'enum', required: false, enumValues: ['A', 'B', 'C'] },
  ],
  candidateActions: [
    {
      id: 'full_award',
      name: 'Full Award ($10,000)',
      description: 'Award the maximum scholarship amount',
      attributes: { amount: 10000, coverage: 1.0, recipients: 1 },
      eligible: true,
    },
    {
      id: 'partial_award',
      name: 'Partial Award ($5,000)',
      description: 'Award a partial scholarship',
      attributes: { amount: 5000, coverage: 0.5, recipients: 1 },
      eligible: true,
    },
    {
      id: 'small_award',
      name: 'Small Award ($2,500)',
      description: 'Award a small scholarship',
      attributes: { amount: 2500, coverage: 0.25, recipients: 1 },
      eligible: true,
    },
    {
      id: 'no_award',
      name: 'No Award ($0)',
      description: 'Do not fund this applicant',
      attributes: { amount: 0, coverage: 0, recipients: 0 },
      eligible: true,
    },
  ],
  defaultRules: [
    {
      id: 'rule_eligible_only',
      name: 'Eligibility Requirement',
      description: 'Only eligible applicants can receive funding',
      priority: 100,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'eligible', operator: 'eq', value: false }],
      },
      effect: { kind: 'exclude_action', actionId: 'full_award' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_high_need',
      name: 'High Need Priority',
      description: 'Applicants with financial need > $20,000 get score boost for full award',
      priority: 50,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'financialNeed', operator: 'gt', value: 20000 }],
      },
      effect: { kind: 'score_adjust', actionId: 'full_award', delta: 0.3 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_high_merit',
      name: 'High Merit Priority',
      description: 'Applicants with merit > 80 get score boost for full award',
      priority: 40,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'academicMerit', operator: 'gt', value: 80 }],
      },
      effect: { kind: 'score_adjust', actionId: 'full_award', delta: 0.2 },
      classification: 'soft',
      enabled: true,
    },
  ],
  defaultObjectives: [
    {
      id: 'obj_coverage',
      name: 'Coverage',
      description: 'Maximize the proportion of financial need covered',
      weight: 0.5,
      metricKey: 'coverage',
      direction: 'maximize',
    },
    {
      id: 'obj_merit_weighted',
      name: 'Merit-Weighted Coverage',
      description: 'Maximize coverage weighted by academic merit',
      weight: 0.5,
      metricKey: 'merit_weighted_coverage',
      direction: 'maximize',
    },
  ],
  defaultConstraints: [
    {
      id: 'con_budget',
      name: 'Budget Limit ($50,000)',
      description: 'Total awards cannot exceed $50,000',
      actionField: 'amount',
      operator: 'lte',
      value: 50000,
    },
  ],
  evaluationCriteria: [
    {
      id: 'eval_total_coverage',
      name: 'Total Coverage',
      description: 'Sum of coverage across all applicants',
      metricKey: 'coverage',
      direction: 'maximize',
      unit: '',
    },
    {
      id: 'eval_group_disparity',
      name: 'Group Coverage Disparity',
      description: 'Difference in average coverage between groups',
      metricKey: 'group_disparity',
      direction: 'minimize',
      unit: '',
    },
  ],
  metricCalculators: {
    coverage: (action) => action.attributes.coverage as number,
    merit_weighted_coverage: (action, input) => {
      const merit = (input.data.academicMerit as number) ?? 0;
      return (action.attributes.coverage as number) * (merit / 100);
    },
    group_disparity: () => 0, // computed at batch level
    cost: (action) => action.attributes.amount as number,
  },
  testInputs: [
    { id: 'app_01', data: { applicantId: 'APP-001', financialNeed: 35000, academicMerit: 92, eligible: true, group: 'A' }, group: 'A' },
    { id: 'app_02', data: { applicantId: 'APP-002', financialNeed: 12000, academicMerit: 88, eligible: true, group: 'B' }, group: 'B' },
    { id: 'app_03', data: { applicantId: 'APP-003', financialNeed: 28000, academicMerit: 65, eligible: true, group: 'A' }, group: 'A' },
    { id: 'app_04', data: { applicantId: 'APP-004', financialNeed: 8000, academicMerit: 95, eligible: true, group: 'C' }, group: 'C' },
    { id: 'app_05', data: { applicantId: 'APP-005', financialNeed: 42000, academicMerit: 72, eligible: true, group: 'B' }, group: 'B' },
    { id: 'app_06', data: { applicantId: 'APP-006', financialNeed: 18000, academicMerit: 81, eligible: true, group: 'A' }, group: 'A' },
    { id: 'app_07', data: { applicantId: 'APP-007', financialNeed: 5500, academicMerit: 90, eligible: true, group: 'C' }, group: 'C' },
    { id: 'app_08', data: { applicantId: 'APP-008', financialNeed: 31000, academicMerit: 78, eligible: false, group: 'B' }, group: 'B' },
    { id: 'app_09', data: { applicantId: 'APP-009', financialNeed: 22000, academicMerit: 85, eligible: true, group: 'A' }, group: 'A' },
    { id: 'app_10', data: { applicantId: 'APP-010', financialNeed: 15000, academicMerit: 60, eligible: true, group: 'C' }, group: 'C' },
  ],
  groupField: 'group',
  groupLabels: { A: 'Group A', B: 'Group B', C: 'Group C' },
  defaultWeights: { coverage: 0.5, merit_weighted_coverage: 0.5 },
};
