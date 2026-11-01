import type {
  Policy,
  Scenario,
  InputRecord,
  DecisionTrace,
  DecisionResult,
  DecisionContext,
  CandidateAction,
  ActionScoreBreakdown,
  RuleEvaluationResult,
  ConstraintCheckResult,
  OutcomeEvaluation,
  ValidationIssue,
  Rule,
  RuleEffect,
  ObjectiveComponent,
} from '@/types';
import {
  validateInput,
  evaluateConditionGroup,
  checkConstraint,
  isPresent,
  getNumber,
} from './conditions';

// ============================================================================
// THE DECISION ENGINE
// Every decision is produced by actual implemented rules.
// Every trace reflects real execution state.
// ============================================================================

function generateSeed(inputId: string, policyVersion: number): number {
  let hash = 0;
  const str = `${inputId}:${policyVersion}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function explainRuleEffect(effect: RuleEffect): string {
  switch (effect.kind) {
    case 'require_action':
      return `Requires action "${effect.actionId}"`;
    case 'exclude_action':
      return `Excludes action "${effect.actionId}"`;
    case 'score_adjust':
      return `Adjusts score of "${effect.actionId}" by ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    case 'set_score':
      return `Sets score of "${effect.actionId}" to ${effect.score}`;
    case 'flag':
      return `Flags: ${effect.message}`;
  }
}

// --- Normalization ----------------------------------------------------------

function normalizeValue(
  value: number,
  allValues: number[],
  direction: 'maximize' | 'minimize'
): number {
  if (allValues.length === 0) return 0;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  if (max === min) return 0.5; // all same → truly neutral
  const normalized = (value - min) / (max - min);
  return direction === 'maximize' ? normalized : 1 - normalized;
}

// --- Core Decision Function -------------------------------------------------

export function decide(
  input: InputRecord,
  policy: Policy,
  scenario: Scenario,
  allInputs: InputRecord[] = []
): DecisionResult {
  const context: DecisionContext = { policy, scenario, allInputs };
  const seed = generateSeed(input.id, policy.version);

  // Stage 1: Input validation
  const validation = validateInput(input, scenario.inputSchema);
  const validationIssues: ValidationIssue[] = validation.issues;

  if (!validation.valid) {
    return {
      input,
      trace: {
        inputId: input.id,
        inputData: input.data,
        validationIssues,
        inputValid: false,
        candidateActions: [],
        ruleEvaluations: [],
        constraintChecks: [],
        scoreBreakdowns: [],
        selectedActionId: null,
        selectedActionName: null,
        infeasible: true,
        infeasibilityReasons: ['Input validation failed — decision engine cannot proceed'],
        outcomeEvaluation: [],
        blindSpots: [],
        formula: '',
        normalizationMethod: '',
        executionSeed: seed,
        timestamp: Date.now(),
      },
    };
  }

  // Stage 2: Candidate generation
  const candidates = scenario.candidateActions.filter((a) => a.eligible);

  // Stage 3: Rule evaluation
  // Sort all rules by priority (enabled first, then by priority within)
  const sortedRules = [...policy.rules].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return b.priority - a.priority;
  });

  const ruleEvaluations: RuleEvaluationResult[] = sortedRules.map((rule) => {
    if (!rule.enabled) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        classification: rule.classification,
        matched: false,
        enabled: false,
        conditionResults: [],
        effect: rule.effect,
        explanation: 'DISABLED — rule not evaluated',
      };
    }
    const { matched, conditionResults } = evaluateConditionGroup(rule.condition, input);
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      classification: rule.classification,
      matched,
      enabled: rule.enabled,
      conditionResults,
      effect: rule.effect,
      explanation: matched
        ? `MATCHED → ${explainRuleEffect(rule.effect)}`
        : `Not matched (gate: ${rule.condition.gate})`,
    };
  });

  // Apply rule effects: build per-action adjustments and hard exclusions
  const ruleAdjustments: Record<string, Record<string, number>> = {};
  const setScoreEffects: Record<string, Record<string, number>> = {};
  const hardExcludedActions: Set<string> = new Set();
  const hardRequiredActions: Set<string> = new Set();
  const flags: string[] = [];

  for (const re of ruleEvaluations) {
    if (!re.matched) continue;
    const effect = re.effect;
    if (effect.kind === 'exclude_action') {
      hardExcludedActions.add(effect.actionId);
    } else if (effect.kind === 'require_action') {
      hardRequiredActions.add(effect.actionId);
    } else if (effect.kind === 'score_adjust') {
      if (!ruleAdjustments[effect.actionId]) ruleAdjustments[effect.actionId] = {};
      ruleAdjustments[effect.actionId][re.ruleId] = effect.delta;
    } else if (effect.kind === 'set_score') {
      if (!setScoreEffects[effect.actionId]) setScoreEffects[effect.actionId] = {};
      setScoreEffects[effect.actionId][re.ruleId] = effect.score;
    } else if (effect.kind === 'flag') {
      flags.push(re.ruleName + ': ' + effect.message);
    }
  }

  // Stage 4: Constraint checking
  const constraintChecks: ConstraintCheckResult[] = [];
  for (const action of candidates) {
    for (const constraint of policy.constraints) {
      const result = checkConstraint(
        action,
        constraint.actionField,
        constraint.operator,
        constraint.value,
        constraint.rangeMin,
        constraint.rangeMax
      );
      constraintChecks.push({
        constraintId: constraint.id,
        constraintName: constraint.name,
        actionId: action.id,
        satisfied: result.satisfied,
        explanation: `${action.name}: ${constraint.name} → ${result.explanation} → ${result.satisfied ? 'SATISFIED' : 'VIOLATED'}`,
      });
    }
  }

  // Determine feasibility: actions that pass all constraints and aren't hard-excluded
  const feasibleActions = candidates.filter((action) => {
    if (hardExcludedActions.has(action.id)) return false;
    const actionConstraintChecks = constraintChecks.filter(
      (c) => c.actionId === action.id
    );
    return actionConstraintChecks.every((c) => c.satisfied);
  });

  // If hard-required actions exist, only those are feasible (if they also pass constraints)
  let effectiveFeasible = feasibleActions;
  if (hardRequiredActions.size > 0) {
    effectiveFeasible = feasibleActions.filter((a) => hardRequiredActions.has(a.id));
    if (effectiveFeasible.length === 0 && feasibleActions.length > 0) {
      // Required action(s) were infeasible — report specifically
      // Will be caught below as infeasible with reasons
    }
  }

  // Stage 5: Objective calculation
  const objectives = policy.objectives;
  const weights = policy.weights;

  // Calculate raw metric values for each feasible action
  const rawMetrics: Record<string, Record<string, number>> = {};
  for (const action of effectiveFeasible) {
    rawMetrics[action.id] = {};
    for (const obj of objectives) {
      const calculator = scenario.metricCalculators[obj.metricKey];
      if (calculator) {
        rawMetrics[action.id][obj.metricKey] = calculator(action, input, context);
      }
    }
  }

  // Normalize metrics across actions
  const normalizedMetrics: Record<string, Record<string, number>> = {};
  for (const action of effectiveFeasible) {
    normalizedMetrics[action.id] = {};
  }
  for (const obj of objectives) {
    const allValues = effectiveFeasible.map(
      (a) => rawMetrics[a.id][obj.metricKey] ?? 0
    );
    for (const action of effectiveFeasible) {
      normalizedMetrics[action.id][obj.metricKey] = normalizeValue(
        rawMetrics[action.id][obj.metricKey] ?? 0,
        allValues,
        obj.direction
      );
    }
  }

  // Stage 6: Score calculation and selection
  const scoreBreakdowns: ActionScoreBreakdown[] = [];

  for (const action of candidates) {
    const isFeasible = effectiveFeasible.some((a) => a.id === action.id);
    const constraintViolations = constraintChecks
      .filter((c) => c.actionId === action.id && !c.satisfied)
      .map((c) => c.constraintName);
    const wasHardExcluded = hardExcludedActions.has(action.id);

    let rejected = !isFeasible;
    let rejectionReason: string | undefined;
    if (wasHardExcluded) {
      rejected = true;
      rejectionReason = 'Excluded by hard rule';
    } else if (constraintViolations.length > 0) {
      rejected = true;
      rejectionReason = `Constraint violated: ${constraintViolations.join(', ')}`;
    }

    const metricValues = rawMetrics[action.id] ?? {};
    const normMetrics = normalizedMetrics[action.id] ?? {};
    const weightedContributions: Record<string, number> = {};
    const adjustments = ruleAdjustments[action.id] ?? {};

    let finalScore = 0;
    if (isFeasible) {
      for (const obj of objectives) {
        const w = weights[obj.metricKey] ?? 0;
        const contribution = (normMetrics[obj.metricKey] ?? 0) * w;
        weightedContributions[obj.metricKey] = contribution;
        finalScore += contribution;
      }
      // Apply rule score adjustments (additive)
      for (const [, adj] of Object.entries(adjustments)) {
        finalScore += adj;
      }
      // Apply set_score effects (override, last-wins by evaluation order = priority order)
      const setScores = setScoreEffects[action.id];
      if (setScores) {
        const setValues = Object.values(setScores);
        if (setValues.length > 0) {
          finalScore = setValues[setValues.length - 1];
        }
      }
    }

    scoreBreakdowns.push({
      actionId: action.id,
      actionName: action.name,
      eligible: isFeasible,
      constraintViolations,
      metricValues,
      normalizedMetrics: normMetrics,
      weightedContributions,
      ruleAdjustments: adjustments,
      finalScore: isFeasible ? finalScore : -Infinity,
      rejected,
      rejectionReason,
    });
  }

  // Select highest-scoring feasible action (deterministic tie-break: alphabetical by actionId)
  const feasibleScores = scoreBreakdowns.filter((s) => !s.rejected);
  let selectedActionId: string | null = null;
  let selectedActionName: string | null = null;
  let infeasible = false;
  const infeasibilityReasons: string[] = [];

  if (feasibleScores.length === 0) {
    infeasible = true;
    infeasibilityReasons.push('No candidate action satisfies all hard constraints');
    if (hardExcludedActions.size > 0) {
      infeasibilityReasons.push(
        `Actions excluded by hard rules: ${[...hardExcludedActions].join(', ')}`
      );
    }
    if (hardRequiredActions.size > 0) {
      infeasibilityReasons.push(
        `Required actions were infeasible: ${[...hardRequiredActions].join(', ')}`
      );
    }
  } else {
    const sorted = [...feasibleScores].sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return a.actionId.localeCompare(b.actionId); // stable tie-break
    });
    selectedActionId = sorted[0].actionId;
    selectedActionName = sorted[0].actionName;
  }

  // Build formula string
  const formulaParts = objectives.map((obj) => {
    const w = weights[obj.metricKey] ?? 0;
    return `${w.toFixed(2)} × norm(${obj.metricKey})`;
  });
  const formula = `Score = ${formulaParts.join(' + ')}`;

  const normalizationMethod =
    'Min-max normalization across feasible candidates. ' +
    'For maximize: norm(x) = (x − min) / (max − min). ' +
    'For minimize: norm(x) = 1 − (x − min) / (max − min). ' +
    'When all values are equal, norm = 0.5 (neutral).';

  // Stage 7: Outcome evaluation
  const outcomeEvaluation: OutcomeEvaluation[] = [];
  if (selectedActionId) {
    const selectedAction = scenario.candidateActions.find(
      (a) => a.id === selectedActionId
    );
    if (selectedAction) {
      for (const criterion of scenario.evaluationCriteria) {
        const calculator = scenario.metricCalculators[criterion.metricKey];
        if (calculator) {
          const value = calculator(selectedAction, input, context);
          let passed = false;
          if (criterion.direction === 'maximize') {
            passed = criterion.target !== undefined ? value >= criterion.target : true;
          } else if (criterion.direction === 'minimize') {
            passed = criterion.target !== undefined ? value <= criterion.target : true;
          } else {
            passed = criterion.target !== undefined ? Math.abs(value - criterion.target) < 0.001 : true;
          }
          outcomeEvaluation.push({
            criterionId: criterion.id,
            criterionName: criterion.name,
            value,
            target: criterion.target,
            unit: criterion.unit,
            direction: criterion.direction,
            passed,
            explanation: `${criterion.name}: ${value}${criterion.unit ?? ''} ${passed ? 'meets' : 'does not meet'} criterion`,
          });
        }
      }
    }
  }

  // Stage 8: Blind spots
  const blindSpots: string[] = [];
  // Identify input fields not referenced by any rule or objective
  const referencedFields = new Set<string>();
  for (const rule of policy.rules) {
    if (!rule.enabled) continue;
    for (const cond of rule.condition.conditions) {
      referencedFields.add(cond.field);
    }
  }
  for (const field of scenario.inputSchema) {
    if (!referencedFields.has(field.name)) {
      blindSpots.push(
        `Input field "${field.label}" is not referenced by any rule — it has no influence on decisions`
      );
    }
  }
  // Check if any evaluation criterion failed
  const failedCriteria = outcomeEvaluation.filter((e) => !e.passed);
  if (failedCriteria.length > 0) {
    blindSpots.push(
      `The selected action fails ${failedCriteria.length} evaluation criteria: ${failedCriteria.map((f) => f.criterionName).join(', ')}`
    );
  }
  // Check if only one feasible action
  if (effectiveFeasible.length === 1) {
    blindSpots.push(
      `Only one candidate action was feasible — the system had no real choice`
    );
  }

  const trace: DecisionTrace = {
    inputId: input.id,
    inputData: input.data,
    validationIssues,
    inputValid: true,
    candidateActions: candidates.map((a) => ({
      actionId: a.id,
      actionName: a.name,
      eligible: a.eligible,
    })),
    ruleEvaluations: ruleEvaluations,
    constraintChecks,
    scoreBreakdowns,
    selectedActionId,
    selectedActionName,
    infeasible,
    infeasibilityReasons,
    outcomeEvaluation,
    blindSpots,
    formula,
    normalizationMethod,
    executionSeed: seed,
    timestamp: Date.now(),
  };

  return { input, trace };
}

// --- Batch Run --------------------------------------------------------------

export function runBatch(
  inputs: InputRecord[],
  policy: Policy,
  scenario: Scenario
): DecisionResult[] {
  return inputs.map((input) => decide(input, policy, scenario, inputs));
}
