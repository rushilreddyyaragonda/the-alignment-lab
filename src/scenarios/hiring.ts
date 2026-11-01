import type { Scenario } from '@/types';

// ============================================================================
// SCENARIO 03 — THE HIRING FILTER
// ============================================================================

export const hiringScenario: Scenario = {
  id: 'hiring',
  name: 'The Hiring Filter',
  tagline: 'Rank synthetic candidates under configurable selection criteria',
  description:
    'A fictional organization uses a simplified candidate-ranking system. The user modifies criteria, weights, minimum requirements, and review rules.',
  briefing: `A fictional company is reviewing 10 synthetic job applicants. Each candidate has a numerical skills score, experience (years), education level, and a referral status. The system must decide which candidates to advance, reject, or flag for human review.

Key questions:
- Can a ranking policy that optimizes for one set of criteria overlook qualified candidates who excel in others?
- Does weighting referrals heavily systematically disadvantage candidates without professional networks?
- When should the system flag a borderline candidate for human review instead of making an automatic decision?`,
  disclaimer:
    'Uses synthetic applicant profiles. No claims are made about real demographic groups. This is not a production hiring system.',
  inputSchema: [
    { name: 'candidateId', label: 'Candidate ID', type: 'string', required: true },
    { name: 'skillsScore', label: 'Skills Score (0-100)', type: 'number', required: true, min: 0, max: 100 },
    { name: 'experience', label: 'Experience (years)', type: 'number', required: true, min: 0, max: 40, unit: 'yrs' },
    { name: 'educationLevel', label: 'Education Level', type: 'enum', required: true, enumValues: ['high_school', 'bachelors', 'masters', 'phd'] },
    { name: 'referred', label: 'Referred by Employee', type: 'boolean', required: false },
    { name: 'group', label: 'Background Track', type: 'enum', required: false, enumValues: ['traditional', 'nontraditional', 'international'] },
  ],
  candidateActions: [
    {
      id: 'advance',
      name: 'Advance to Interview',
      description: 'Send candidate to the interview round',
      attributes: { quality: 1.0, cost: 500, riskLevel: 1, humanReview: 0 },
      eligible: true,
    },
    {
      id: 'waitlist',
      name: 'Waitlist',
      description: 'Place candidate on a waitlist for potential future review',
      attributes: { quality: 0.5, cost: 50, riskLevel: 2, humanReview: 0 },
      eligible: true,
    },
    {
      id: 'human_review',
      name: 'Flag for Human Review',
      description: 'Escalate to a human reviewer for detailed assessment',
      attributes: { quality: 0.7, cost: 200, riskLevel: 1, humanReview: 1 },
      eligible: true,
    },
    {
      id: 'reject',
      name: 'Reject',
      description: 'Do not advance this candidate',
      attributes: { quality: 0, cost: 0, riskLevel: 3, humanReview: 0 },
      eligible: true,
    },
  ],
  defaultRules: [
    {
      id: 'rule_min_skills',
      name: 'Minimum Skills Threshold',
      description: 'Candidates below 50 skills score cannot be advanced',
      priority: 100,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'skillsScore', operator: 'lt', value: 50 }],
      },
      effect: { kind: 'exclude_action', actionId: 'advance' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_referral_boost',
      name: 'Referral Boost',
      description: 'Referred candidates get a score boost for advancement',
      priority: 50,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'referred', operator: 'eq', value: true }],
      },
      effect: { kind: 'score_adjust', actionId: 'advance', delta: 0.25 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_experience_boost',
      name: 'Experience Boost',
      description: 'Candidates with 5+ years get a boost for advancement',
      priority: 40,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'experience', operator: 'gte', value: 5 }],
      },
      effect: { kind: 'score_adjust', actionId: 'advance', delta: 0.15 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_borderline_review',
      name: 'Borderline Auto-Review',
      description: 'Skills score 50-60 flags for human review',
      priority: 60,
      condition: {
        gate: 'AND',
        conditions: [
          { field: 'skillsScore', operator: 'gte', value: 50 },
          { field: 'skillsScore', operator: 'lte', value: 60 },
        ],
      },
      effect: { kind: 'score_adjust', actionId: 'human_review', delta: 0.5 },
      classification: 'soft',
      enabled: true,
    },
  ],
  defaultObjectives: [
    {
      id: 'obj_quality',
      name: 'Candidate Quality',
      description: 'Maximize the quality of the selected action',
      weight: 0.6,
      metricKey: 'quality',
      direction: 'maximize',
    },
    {
      id: 'obj_efficiency',
      name: 'Process Efficiency',
      description: 'Minimize processing cost',
      weight: 0.4,
      metricKey: 'cost',
      direction: 'minimize',
    },
  ],
  defaultConstraints: [
    {
      id: 'con_risk',
      name: 'Risk Limit',
      description: 'Selected action risk level must be ≤ 3',
      actionField: 'riskLevel',
      operator: 'lte',
      value: 3,
    },
  ],
  evaluationCriteria: [
    {
      id: 'eval_advance_rate',
      name: 'Advancement Rate',
      description: 'Proportion of candidates advanced',
      metricKey: 'quality',
      direction: 'maximize',
    },
    {
      id: 'eval_group_disparity',
      name: 'Group Advancement Disparity',
      description: 'Difference in advancement rates between groups',
      metricKey: 'group_disparity',
      direction: 'minimize',
    },
    {
      id: 'eval_human_review_count',
      name: 'Human Review Count',
      description: 'Number of candidates flagged for human review',
      metricKey: 'human_review',
      direction: 'minimize',
    },
  ],
  metricCalculators: {
    quality: (action) => action.attributes.quality as number,
    cost: (action) => action.attributes.cost as number,
    human_review: (action) => action.attributes.humanReview as number,
    group_disparity: () => 0,
  },
  testInputs: [
    { id: 'cand_01', data: { candidateId: 'CAN-001', skillsScore: 88, experience: 7, educationLevel: 'bachelors', referred: true, group: 'traditional' }, group: 'traditional' },
    { id: 'cand_02', data: { candidateId: 'CAN-002', skillsScore: 72, experience: 3, educationLevel: 'masters', referred: false, group: 'nontraditional' }, group: 'nontraditional' },
    { id: 'cand_03', data: { candidateId: 'CAN-003', skillsScore: 55, experience: 10, educationLevel: 'high_school', referred: false, group: 'nontraditional' }, group: 'nontraditional' },
    { id: 'cand_04', data: { candidateId: 'CAN-004', skillsScore: 95, experience: 12, educationLevel: 'phd', referred: true, group: 'traditional' }, group: 'traditional' },
    { id: 'cand_05', data: { candidateId: 'CAN-005', skillsScore: 68, experience: 2, educationLevel: 'bachelors', referred: false, group: 'international' }, group: 'international' },
    { id: 'cand_06', data: { candidateId: 'CAN-006', skillsScore: 45, experience: 1, educationLevel: 'bachelors', referred: false, group: 'traditional' }, group: 'traditional' },
    { id: 'cand_07', data: { candidateId: 'CAN-007', skillsScore: 82, experience: 8, educationLevel: 'masters', referred: false, group: 'international' }, group: 'international' },
    { id: 'cand_08', data: { candidateId: 'CAN-008', skillsScore: 58, experience: 5, educationLevel: 'high_school', referred: true, group: 'nontraditional' }, group: 'nontraditional' },
    { id: 'cand_09', data: { candidateId: 'CAN-009', skillsScore: 90, experience: 6, educationLevel: 'masters', referred: false, group: 'traditional' }, group: 'traditional' },
    { id: 'cand_10', data: { candidateId: 'CAN-010', skillsScore: 62, experience: 4, educationLevel: 'bachelors', referred: false, group: 'international' }, group: 'international' },
  ],
  groupField: 'group',
  groupLabels: { traditional: 'Traditional Track', nontraditional: 'Non-Traditional Track', international: 'International Track' },
  defaultWeights: { quality: 0.6, cost: 0.4 },
};
