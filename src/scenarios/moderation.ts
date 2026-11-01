import type { Scenario } from '@/types';

// ============================================================================
// SCENARIO 06 — THE CONTENT MODERATION DILEMMA
// ============================================================================

export const moderationScenario: Scenario = {
  id: 'moderation',
  name: 'The Content Moderation Dilemma',
  tagline: 'Classify content for review with false positives, false negatives, and ambiguity',
  description:
    'A fictional platform uses rules to classify content for review. The user configures policy rules, confidence thresholds, review priorities, and appeal mechanisms.',
  briefing: `A fictional content platform must classify incoming posts as safe, questionable, or violating. The system uses a rules-based classifier with a confidence score. The user configures thresholds, review priorities, and rules.

Key questions:
- Does a strict policy produce too many false positives (removing safe content)?
- Does a lenient policy produce too many false negatives (allowing violating content)?
- How does the system handle ambiguous cases where confidence is low?
- What is the cost difference between automatic removal and human review?`,
  disclaimer:
    'Uses fictional content examples. This is not a production moderation service.',
  inputSchema: [
    { name: 'contentId', label: 'Content ID', type: 'string', required: true },
    { name: 'flaggedKeywords', label: 'Flagged Keywords Count', type: 'number', required: true, min: 0, max: 20 },
    { name: 'confidenceScore', label: 'Confidence Score (0-100)', type: 'number', required: true, min: 0, max: 100 },
    { name: 'reportedByUsers', label: 'User Reports Count', type: 'number', required: true, min: 0, max: 100 },
    { name: 'category', label: 'Content Category', type: 'enum', required: true, enumValues: ['news', 'opinion', 'personal', 'commercial', 'educational'] },
    { name: 'appealFiled', label: 'Appeal Filed', type: 'boolean', required: false },
  ],
  candidateActions: [
    {
      id: 'auto_remove',
      name: 'Automatic Removal',
      description: 'Remove content automatically without human review',
      attributes: { safetyScore: 9, falseRisk: 4, delay: 0, humanReview: 0, userImpact: 3 },
      eligible: true,
    },
    {
      id: 'human_review',
      name: 'Send to Human Review',
      description: 'Queue for human moderator review',
      attributes: { safetyScore: 7, falseRisk: 1, delay: 24, humanReview: 1, userImpact: 1 },
      eligible: true,
    },
    {
      id: 'flag_and_keep',
      name: 'Flag but Keep Live',
      description: 'Add a warning label but keep content visible',
      attributes: { safetyScore: 5, falseRisk: 2, delay: 0, humanReview: 0, userImpact: 2 },
      eligible: true,
    },
    {
      id: 'allow',
      name: 'Allow (No Action)',
      description: 'No action — content is allowed as-is',
      attributes: { safetyScore: 3, falseRisk: 5, delay: 0, humanReview: 0, userImpact: 0 },
      eligible: true,
    },
  ],
  defaultRules: [
    {
      id: 'rule_high_confidence_remove',
      name: 'High Confidence Removal',
      description: 'Confidence ≥ 85 with 3+ flagged keywords → auto-remove',
      priority: 80,
      condition: {
        gate: 'AND',
        conditions: [
          { field: 'confidenceScore', operator: 'gte', value: 85 },
          { field: 'flaggedKeywords', operator: 'gte', value: 3 },
        ],
      },
      effect: { kind: 'score_adjust', actionId: 'auto_remove', delta: 0.5 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_many_reports',
      name: 'High Report Count',
      description: '10+ user reports require human review (cannot auto-allow)',
      priority: 100,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'reportedByUsers', operator: 'gte', value: 10 }],
      },
      effect: { kind: 'exclude_action', actionId: 'allow' },
      classification: 'hard',
      enabled: true,
    },
    {
      id: 'rule_low_confidence_review',
      name: 'Low Confidence Review',
      description: 'Confidence 30-70 sends to human review',
      priority: 60,
      condition: {
        gate: 'AND',
        conditions: [
          { field: 'confidenceScore', operator: 'gte', value: 30 },
          { field: 'confidenceScore', operator: 'lte', value: 70 },
        ],
      },
      effect: { kind: 'score_adjust', actionId: 'human_review', delta: 0.3 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_education_protect',
      name: 'Educational Content Protection',
      description: 'Educational content gets a boost toward flag-and-keep',
      priority: 50,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'category', operator: 'eq', value: 'educational' }],
      },
      effect: { kind: 'score_adjust', actionId: 'flag_and_keep', delta: 0.25 },
      classification: 'soft',
      enabled: true,
    },
    {
      id: 'rule_appeal_review',
      name: 'Appeal Triggers Review',
      description: 'If an appeal is filed, content must go to human review',
      priority: 90,
      condition: {
        gate: 'AND',
        conditions: [{ field: 'appealFiled', operator: 'eq', value: true }],
      },
      effect: { kind: 'require_action', actionId: 'human_review' },
      classification: 'hard',
      enabled: true,
    },
  ],
  defaultObjectives: [
    {
      id: 'obj_safety',
      name: 'Platform Safety',
      description: 'Maximize safety score of the selected action',
      weight: 0.6,
      metricKey: 'safety',
      direction: 'maximize',
    },
    {
      id: 'obj_low_false',
      name: 'False Positive Minimization',
      description: 'Minimize false positive/negative risk',
      weight: 0.4,
      metricKey: 'false_risk',
      direction: 'minimize',
    },
  ],
  defaultConstraints: [
    {
      id: 'con_human_review_capacity',
      name: 'Human Review Capacity',
      description: 'Cannot exceed human review capacity (1 per item)',
      actionField: 'humanReview',
      operator: 'lte',
      value: 1,
    },
  ],
  evaluationCriteria: [
    {
      id: 'eval_false_positive',
      name: 'False Positive Rate',
      description: 'Proportion of safe content incorrectly removed',
      metricKey: 'false_risk',
      direction: 'minimize',
      target: 2,
    },
    {
      id: 'eval_false_negative',
      name: 'False Negative Rate',
      description: 'Proportion of violating content incorrectly allowed',
      metricKey: 'safety',
      direction: 'maximize',
      target: 7,
    },
    {
      id: 'eval_review_load',
      name: 'Human Review Load',
      description: 'Number of items sent to human review',
      metricKey: 'human_review',
      direction: 'minimize',
    },
  ],
  metricCalculators: {
    safety: (action) => action.attributes.safetyScore as number,
    false_risk: (action) => action.attributes.falseRisk as number,
    human_review: (action) => action.attributes.humanReview as number,
    cost: (action) => action.attributes.userImpact as number,
  },
  testInputs: [
    { id: 'post_01', data: { contentId: 'POST-001', flaggedKeywords: 0, confidenceScore: 15, reportedByUsers: 0, category: 'personal', appealFiled: false } },
    { id: 'post_02', data: { contentId: 'POST-002', flaggedKeywords: 5, confidenceScore: 92, reportedByUsers: 25, category: 'opinion', appealFiled: false } },
    { id: 'post_03', data: { contentId: 'POST-003', flaggedKeywords: 2, confidenceScore: 55, reportedByUsers: 3, category: 'news', appealFiled: false } },
    { id: 'post_04', data: { contentId: 'POST-004', flaggedKeywords: 1, confidenceScore: 40, reportedByUsers: 12, category: 'educational', appealFiled: true } },
    { id: 'post_05', data: { contentId: 'POST-005', flaggedKeywords: 0, confidenceScore: 10, reportedByUsers: 0, category: 'commercial', appealFiled: false } },
    { id: 'post_06', data: { contentId: 'POST-006', flaggedKeywords: 4, confidenceScore: 88, reportedByUsers: 8, category: 'personal', appealFiled: false } },
    { id: 'post_07', data: { contentId: 'POST-007', flaggedKeywords: 1, confidenceScore: 60, reportedByUsers: 15, category: 'educational', appealFiled: false } },
    { id: 'post_08', data: { contentId: 'POST-008', flaggedKeywords: 3, confidenceScore: 75, reportedByUsers: 5, category: 'opinion', appealFiled: true } },
  ],
  defaultWeights: { safety: 0.6, false_risk: 0.4 },
};
