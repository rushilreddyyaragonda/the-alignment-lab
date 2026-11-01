// ============================================================================
// THE ALIGNMENT LAB — Core Type System
// ============================================================================

// --- Primitives -------------------------------------------------------------

export type FieldType = 'number' | 'string' | 'boolean' | 'enum' | 'array';

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  min?: number;
  max?: number;
  enumValues?: string[];
  unit?: string;
  description?: string;
  group?: string; // for distributional analysis, e.g. "district", "category"
  defaultValue?: number | string | boolean;
}

export type ComparisonOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'present'
  | 'missing'
  | 'in_range'
  | 'not_in_range';

export type LogicGate = 'AND' | 'OR';

export interface Condition {
  field: string;
  operator: ComparisonOperator;
  value?: number | string | boolean;
  rangeMin?: number;
  rangeMax?: number;
}

export interface ConditionGroup {
  gate: LogicGate;
  conditions: Condition[];
}

export type RuleEffect =
  | { kind: 'require_action'; actionId: string }
  | { kind: 'exclude_action'; actionId: string }
  | { kind: 'score_adjust'; actionId: string; delta: number }
  | { kind: 'set_score'; actionId: string; score: number }
  | { kind: 'flag'; message: string };

export type RuleClassification = 'hard' | 'soft';

export interface Rule {
  id: string;
  name: string;
  description: string;
  priority: number; // higher = evaluated first
  condition: ConditionGroup;
  effect: RuleEffect;
  classification: RuleClassification;
  enabled: boolean;
}

export interface ObjectiveComponent {
  id: string;
  name: string;
  description: string;
  weight: number;
  // function key referencing scenario-specific calculations
  metricKey: string;
  // whether to maximize or minimize
  direction: 'maximize' | 'minimize';
}

export interface Constraint {
  id: string;
  name: string;
  description: string;
  // which action attribute to check
  actionField: string;
  operator: ComparisonOperator;
  value?: number | string | boolean;
  rangeMin?: number;
  rangeMax?: number;
}

export interface CandidateAction {
  id: string;
  name: string;
  description: string;
  attributes: Record<string, number | string | boolean>;
  eligible: boolean; // static eligibility
}

export interface InputRecord {
  id: string;
  data: Record<string, number | string | boolean | null>;
  group?: string;
}

export interface ObjectiveDefinition {
  id: string;
  name: string;
  components: ObjectiveComponent[];
  normalizationMethod: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  // metric key from scenario
  metricKey: string;
  direction: 'maximize' | 'minimize' | 'equalize';
  target?: number;
  unit?: string;
}

export interface Scenario {
  id: string;
  name: string;
  tagline: string;
  description: string;
  briefing: string;
  disclaimer: string;
  inputSchema: FieldSchema[];
  candidateActions: CandidateAction[];
  defaultRules: Rule[];
  defaultObjectives: ObjectiveComponent[];
  defaultConstraints: Constraint[];
  evaluationCriteria: EvaluationCriterion[];
  // metric calculators keyed by metricKey
  // each receives (action, input, decision) and returns a number
  metricCalculators: Record<string, MetricCalculator>;
  testInputs: InputRecord[];
  groupField?: string;
  groupLabels?: Record<string, string>;
  defaultWeights: Record<string, number>;
}

export type MetricCalculator = (
  action: CandidateAction,
  input: InputRecord,
  context: DecisionContext
) => number;

// --- Decision Engine Types --------------------------------------------------

export interface Policy {
  id: string;
  name: string;
  scenarioId: string;
  rules: Rule[];
  objectives: ObjectiveComponent[];
  constraints: Constraint[];
  weights: Record<string, number>; // metricKey -> weight
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning';
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  priority: number;
  classification: RuleClassification;
  matched: boolean;
  enabled: boolean;
  conditionResults: { condition: Condition; matched: boolean }[];
  effect: RuleEffect;
  explanation: string;
}

export interface ConstraintCheckResult {
  constraintId: string;
  constraintName: string;
  actionId: string;
  satisfied: boolean;
  explanation: string;
}

export interface ActionScoreBreakdown {
  actionId: string;
  actionName: string;
  eligible: boolean;
  constraintViolations: string[];
  metricValues: Record<string, number>;
  normalizedMetrics: Record<string, number>;
  weightedContributions: Record<string, number>;
  ruleAdjustments: Record<string, number>;
  finalScore: number;
  rejected: boolean;
  rejectionReason?: string;
}

export interface DecisionTrace {
  inputId: string;
  inputData: Record<string, number | string | boolean | null>;
  validationIssues: ValidationIssue[];
  inputValid: boolean;
  candidateActions: {
    actionId: string;
    actionName: string;
    eligible: boolean;
  }[];
  ruleEvaluations: RuleEvaluationResult[];
  constraintChecks: ConstraintCheckResult[];
  scoreBreakdowns: ActionScoreBreakdown[];
  selectedActionId: string | null;
  selectedActionName: string | null;
  infeasible: boolean;
  infeasibilityReasons: string[];
  outcomeEvaluation: OutcomeEvaluation[];
  blindSpots: string[];
  formula: string;
  normalizationMethod: string;
  executionSeed: number;
  timestamp: number;
}

export interface OutcomeEvaluation {
  criterionId: string;
  criterionName: string;
  value: number;
  target?: number;
  unit?: string;
  direction: 'maximize' | 'minimize' | 'equalize';
  passed: boolean;
  explanation: string;
}

export interface DecisionContext {
  policy: Policy;
  scenario: Scenario;
  allInputs: InputRecord[];
}

export interface DecisionResult {
  input: InputRecord;
  trace: DecisionTrace;
}

// --- Test Framework Types ---------------------------------------------------

export type TestCategory =
  | 'boundary'
  | 'missing_data'
  | 'conflicting_rules'
  | 'constraint_conflict'
  | 'extreme_value'
  | 'objective_conflict'
  | 'distributional'
  | 'determinism';

export interface TestCase {
  id: string;
  name: string;
  category: TestCategory;
  input: InputRecord;
  assertionType: string;
  assertionParams: Record<string, number | string | boolean>;
  expected: boolean;
}

export interface TestResult {
  testCaseId: string;
  testCaseName: string;
  category: TestCategory;
  passed: boolean;
  actualValue: boolean | number | string;
  expectedValue: boolean | number | string;
  explanation: string;
  trace: DecisionTrace;
}

export interface TestSuiteResult {
  results: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalRun: number;
  timestamp: number;
}

// --- Experiment Journal Types -----------------------------------------------

export interface JournalEntry {
  id: string;
  title: string;
  researchQuestion: string;
  hypothesis: string;
  scenarioId: string;
  policyId: string;
  policyName: string;
  testDatasetLabel: string;
  constraints: string;
  results: string;
  observations: string;
  limitations: string;
  conclusion: string;
  nextSteps: string;
  createdAt: number;
  updatedAt: number;
}

// --- Storage Types ----------------------------------------------------------

export interface StoredPolicy extends Policy {}

export interface StoredScenario {
  id: string;
  name: string;
  description: string;
  inputSchema: FieldSchema[];
  candidateActions: CandidateAction[];
  defaultRules: Rule[];
  defaultObjectives: ObjectiveComponent[];
  defaultConstraints: Constraint[];
  evaluationCriteria: EvaluationCriterion[];
  testInputs: InputRecord[];
  groupField?: string;
  groupLabels?: Record<string, string>;
  defaultWeights: Record<string, number>;
  custom: boolean;
  createdAt: number;
}

export interface AppPreferences {
  tutorialCompleted: boolean;
  theme: 'light';
  lastScenarioId: string | null;
  lastPolicyId: string | null;
}
