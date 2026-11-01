import type {
  Scenario,
  InputRecord,
  TestCase,
  TestCategory,
  Policy,
  DecisionTrace,
  TestResult,
  TestSuiteResult,
} from '@/types';
import { decide } from './decisionEngine';

// ============================================================================
// EDGE-CASE GENERATOR
// Reproducible, seeded generation of meaningful test inputs.
// ============================================================================

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateId(prefix: string, i: number): string {
  return `${prefix}_${i.toString().padStart(3, '0')}`;
}

export function generateEdgeCases(
  scenario: Scenario,
  seed: number = 42
): InputRecord[] {
  const rng = mulberry32(seed);
  const cases: InputRecord[] = [];
  let idx = 0;

  const baseInput = scenario.testInputs[0];
  if (!baseInput) return cases;

  // Helper to clone base input
  const clone = (): InputRecord => ({
    id: generateId('edge', idx++),
    data: { ...baseInput.data },
    group: baseInput.group,
  });

  // 1. Boundary cases — values at min/max/thresholds of numeric fields
  for (const field of scenario.inputSchema) {
    if (field.type !== 'number') continue;
    const min = field.min ?? 0;
    const max = field.max ?? 100;

    // Exactly at min
    const atMin = clone();
    atMin.data[field.name] = min;
    cases.push(atMin);

    // Exactly at max
    const atMax = clone();
    atMax.data[field.name] = max;
    cases.push(atMax);

    // Just below min (if min defined)
    if (field.min !== undefined) {
      const belowMin = clone();
      belowMin.data[field.name] = min - 1;
      cases.push(belowMin);
    }

    // Just above max (if max defined)
    if (field.max !== undefined) {
      const aboveMax = clone();
      aboveMax.data[field.name] = max + 1;
      cases.push(aboveMax);
    }

    // Midpoint
    const mid = clone();
    mid.data[field.name] = (min + max) / 2;
    cases.push(mid);
  }

  // 2. Missing-data cases
  const missingAll = clone();
  for (const field of scenario.inputSchema) {
    if (field.required) {
      missingAll.data[field.name] = null;
    }
  }
  cases.push(missingAll);

  // Missing one required field at a time
  for (const field of scenario.inputSchema) {
    if (!field.required) continue;
    const missOne = clone();
    missOne.data[field.name] = null;
    cases.push(missOne);
  }

  // 3. Extreme-value cases
  for (const field of scenario.inputSchema) {
    if (field.type !== 'number') continue;
    const extreme = clone();
    extreme.data[field.name] = 999999;
    cases.push(extreme);

    const extremeNeg = clone();
    extremeNeg.data[field.name] = -999999;
    cases.push(extremeNeg);
  }

  // 4. Enum boundary — test each enum value
  for (const field of scenario.inputSchema) {
    if (field.type !== 'enum' || !field.enumValues) continue;
    for (const val of field.enumValues) {
      const enumCase = clone();
      enumCase.data[field.name] = val;
      cases.push(enumCase);
    }
  }

  // 5. Constraint conflict — set values that make all actions infeasible
  // (scenario-specific: set numeric fields to extreme values)
  const conflict = clone();
  for (const field of scenario.inputSchema) {
    if (field.type === 'number' && field.max !== undefined) {
      conflict.data[field.name] = field.max;
    }
  }
  cases.push(conflict);

  // 6. Determinism cases — identical inputs
  const det1 = clone();
  det1.id = generateId('det_a', idx++);
  cases.push(det1);
  const det2 = clone();
  det2.id = generateId('det_b', idx++);
  det2.data = { ...det1.data };
  cases.push(det2);

  // 7. Random distributional variants (seeded)
  for (let i = 0; i < 5; i++) {
    const variant = clone();
    for (const field of scenario.inputSchema) {
      if (field.type === 'number') {
        const min = field.min ?? 0;
        const max = field.max ?? 100;
        variant.data[field.name] = Math.round(min + rng() * (max - min));
      }
    }
    cases.push(variant);
  }

  return cases;
}

// ============================================================================
// TEST ASSERTION FRAMEWORK
// ============================================================================

export function assertHardConstraintNotViolated(
  trace: DecisionTrace
): { passed: boolean; explanation: string } {
  if (trace.infeasible) {
    return {
      passed: true, // infeasible is not a violation — it's explicit handling
      explanation: 'No action selected (infeasible) — no constraint violation possible',
    };
  }
  const selectedId = trace.selectedActionId;
  if (!selectedId) {
    return { passed: true, explanation: 'No action selected' };
  }
  const violations = trace.constraintChecks.filter(
    (c) => c.actionId === selectedId && !c.satisfied
  );
  return {
    passed: violations.length === 0,
    explanation:
      violations.length === 0
        ? 'Selected action satisfies all hard constraints'
        : `Selected action violates: ${violations.map((v) => v.constraintName).join(', ')}`,
  };
}

export function assertInvalidInputRejected(
  trace: DecisionTrace
): { passed: boolean; explanation: string } {
  return {
    passed: !trace.inputValid,
    explanation: trace.inputValid
      ? 'Input was valid (assertion expected rejection)'
      : 'Invalid input correctly rejected',
  };
}

export function assertDeterminism(
  trace1: DecisionTrace,
  trace2: DecisionTrace
): { passed: boolean; explanation: string } {
  const same =
    trace1.selectedActionId === trace2.selectedActionId &&
    trace1.selectedActionName === trace2.selectedActionName;
  return {
    passed: same,
    explanation: same
      ? 'Identical inputs produced identical decisions'
      : `Same input produced different decisions: ${trace1.selectedActionId} vs ${trace2.selectedActionId}`,
  };
}

export function assertDisabledRuleNoEffect(
  trace: DecisionTrace,
  disabledRuleIds: string[]
): { passed: boolean; explanation: string } {
  const influenced = trace.ruleEvaluations.filter(
    (r) => disabledRuleIds.includes(r.ruleId) && r.matched
  );
  return {
    passed: influenced.length === 0,
    explanation:
      influenced.length === 0
        ? 'Disabled rules did not influence the decision'
        : `Disabled rules incorrectly matched: ${influenced.map((r) => r.ruleName).join(', ')}`,
  };
}

export function assertConstraintViolatorNotSelected(
  trace: DecisionTrace
): { passed: boolean; explanation: string } {
  if (trace.infeasible || !trace.selectedActionId) {
    return { passed: true, explanation: 'No action selected' };
  }
  const selectedId = trace.selectedActionId;
  const violations = trace.constraintChecks.filter(
    (c) => c.actionId === selectedId && !c.satisfied
  );
  return {
    passed: violations.length === 0,
    explanation:
      violations.length === 0
        ? 'Selected action passes all constraints'
        : 'A constraint-violating action was selected',
  };
}

export function assertBudgetRespected(
  trace: DecisionTrace,
  budgetField: string,
  budgetLimit: number
): { passed: boolean; explanation: string } {
  if (trace.infeasible || !trace.selectedActionId) {
    return { passed: true, explanation: 'No action selected' };
  }
  const breakdown = trace.scoreBreakdowns.find(
    (s) => s.actionId === trace.selectedActionId
  );
  if (!breakdown) return { passed: false, explanation: 'No breakdown found — cannot verify budget' };
  const cost = breakdown.metricValues[budgetField];
  if (cost === undefined) return { passed: false, explanation: `Budget field "${budgetField}" not found — cannot verify` };
  return {
    passed: cost <= budgetLimit,
    explanation: `Cost ${cost} ${cost <= budgetLimit ? '<=' : '>'} budget ${budgetLimit}`,
  };
}

// --- Test Suite Runner ------------------------------------------------------

export function runTestSuite(
  testCases: TestCase[],
  policy: Policy,
  scenario: Scenario
): TestSuiteResult {
  const results: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const tc of testCases) {
    const { trace } = decide(tc.input, policy, scenario);
    let passed = false;
    let actualValue: boolean | number | string = '';
    let explanation = '';

    switch (tc.assertionType) {
      case 'hard_constraint_not_violated': {
        const r = assertHardConstraintNotViolated(trace);
        passed = r.passed;
        explanation = r.explanation;
        actualValue = r.passed;
        break;
      }
      case 'invalid_input_rejected': {
        const r = assertInvalidInputRejected(trace);
        passed = r.passed;
        explanation = r.explanation;
        actualValue = r.passed;
        break;
      }
      case 'determinism': {
        // Run same input twice
        const { trace: trace2 } = decide(tc.input, policy, scenario);
        const r = assertDeterminism(trace, trace2);
        passed = r.passed;
        explanation = r.explanation;
        actualValue = r.passed;
        break;
      }
      case 'constraint_violator_not_selected': {
        const r = assertConstraintViolatorNotSelected(trace);
        passed = r.passed;
        explanation = r.explanation;
        actualValue = r.passed;
        break;
      }
      case 'budget_respected': {
        const r = assertBudgetRespected(
          trace,
          tc.assertionParams.budgetField as string,
          tc.assertionParams.budgetLimit as number
        );
        passed = r.passed;
        explanation = r.explanation;
        actualValue = r.passed;
        break;
      }
      case 'disabled_rule_no_effect': {
        const disabledIds = (tc.assertionParams.ruleIds as string || '')
          .split(',')
          .filter(Boolean);
        const r = assertDisabledRuleNoEffect(trace, disabledIds);
        passed = r.passed;
        explanation = r.explanation;
        actualValue = r.passed;
        break;
      }
      default:
        passed = false;
        explanation = `Unknown assertion type: ${tc.assertionType}`;
    }

    if (passed) totalPassed++;
    else totalFailed++;

    results.push({
      testCaseId: tc.id,
      testCaseName: tc.name,
      category: tc.category,
      passed,
      actualValue,
      expectedValue: tc.expected,
      explanation,
      trace,
    });
  }

  return {
    results,
    totalPassed,
    totalFailed,
    totalRun: results.length,
    timestamp: Date.now(),
  };
}

// --- Default Test Case Generator --------------------------------------------

export function generateTestCases(
  scenario: Scenario,
  seed: number = 42
): TestCase[] {
  const edgeInputs = generateEdgeCases(scenario, seed);
  const testCases: TestCase[] = [];

  // Categorize edge inputs into test cases
  edgeInputs.forEach((input, i) => {
    let category: TestCategory = 'boundary';
    let assertionType = 'hard_constraint_not_violated';
    let name = `Edge case ${i + 1}`;

    // Classify by input characteristics
    const hasNull = Object.values(input.data).some((v) => v === null);
    const hasExtreme = Object.values(input.data).some(
      (v) => typeof v === 'number' && (v > 10000 || v < -10000)
    );

    if (hasNull) {
      category = 'missing_data';
      assertionType = 'invalid_input_rejected';
      name = `Missing data case ${i + 1}`;
    } else if (hasExtreme) {
      category = 'extreme_value';
      assertionType = 'hard_constraint_not_violated';
      name = `Extreme value case ${i + 1}`;
    } else if (input.id.startsWith('det_')) {
      category = 'determinism';
      assertionType = 'determinism';
      name = `Determinism case ${i + 1}`;
    } else {
      category = 'boundary';
      assertionType = 'hard_constraint_not_violated';
      name = `Boundary case ${i + 1}`;
    }

    testCases.push({
      id: `tc_${i}`,
      name,
      category,
      input,
      assertionType,
      assertionParams: {},
      expected: true,
    });
  });

  // Add constraint conflict test
  const conflictInput = edgeInputs.find((e) => {
    const numericVals = Object.values(e.data).filter(
      (v): v is number => typeof v === 'number'
    );
    return numericVals.length > 0 && numericVals.every((v) => v >= 90);
  });
  if (conflictInput) {
    testCases.push({
      id: 'tc_conflict',
      name: 'Constraint conflict — all actions may be infeasible',
      category: 'constraint_conflict',
      input: conflictInput,
      assertionType: 'hard_constraint_not_violated',
      assertionParams: {},
      expected: true,
    });
  }

  return testCases;
}
