import type {
  Condition,
  ConditionGroup,
  InputRecord,
  FieldSchema,
  CandidateAction,
  ComparisonOperator,
} from '@/types';

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

export function getFieldRaw(
  input: InputRecord,
  field: string
): number | string | boolean | null | undefined {
  return input.data[field];
}

export function getNumber(
  input: InputRecord,
  field: string
): number | null {
  const v = input.data[field];
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function getString(
  input: InputRecord,
  field: string
): string | null {
  const v = input.data[field];
  if (v === null || v === undefined) return null;
  return String(v);
}

export function getBoolean(
  input: InputRecord,
  field: string
): boolean | null {
  const v = input.data[field];
  if (v === null || v === undefined) return null;
  return Boolean(v);
}

export function isPresent(
  input: InputRecord,
  field: string
): boolean {
  const v = input.data[field];
  return v !== null && v !== undefined && v !== '';
}

export function evaluateCondition(
  cond: Condition,
  input: InputRecord
): boolean {
  const present = isPresent(input, cond.field);
  switch (cond.operator) {
    case 'present':
      return present;
    case 'missing':
      return !present;
    case 'eq':
      if (!present) return false;
      return input.data[cond.field] === cond.value;
    case 'neq':
      if (!present) return false;
      return input.data[cond.field] !== cond.value;
    case 'gt': {
      const n = getNumber(input, cond.field);
      if (n === null) return false;
      return n > (cond.value as number);
    }
    case 'gte': {
      const n = getNumber(input, cond.field);
      if (n === null) return false;
      return n >= (cond.value as number);
    }
    case 'lt': {
      const n = getNumber(input, cond.field);
      if (n === null) return false;
      return n < (cond.value as number);
    }
    case 'lte': {
      const n = getNumber(input, cond.field);
      if (n === null) return false;
      return n <= (cond.value as number);
    }
    case 'in_range': {
      const n = getNumber(input, cond.field);
      if (n === null) return false;
      return n >= (cond.rangeMin as number) && n <= (cond.rangeMax as number);
    }
    case 'not_in_range': {
      const n = getNumber(input, cond.field);
      if (n === null) return false;
      return n < (cond.rangeMin as number) || n > (cond.rangeMax as number);
    }
    default:
      return false;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup,
  input: InputRecord
): { matched: boolean; conditionResults: { condition: Condition; matched: boolean }[] } {
  const conditionResults = group.conditions.map((c) => ({
    condition: c,
    matched: evaluateCondition(c, input),
  }));
  if (group.gate === 'AND') {
    return { matched: conditionResults.every((r) => r.matched), conditionResults };
  } else {
    return { matched: conditionResults.some((r) => r.matched), conditionResults };
  }
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export function validateInput(
  input: InputRecord,
  schema: FieldSchema[]
): { valid: boolean; issues: { field: string; issue: string; severity: 'error' | 'warning' }[] } {
  const issues: { field: string; issue: string; severity: 'error' | 'warning' }[] = [];

  for (const field of schema) {
    const present = isPresent(input, field.name);
    if (field.required && !present) {
      issues.push({
        field: field.name,
        issue: `Required field "${field.label}" is missing`,
        severity: 'error',
      });
      continue;
    }
    if (!present) continue;

    if (field.type === 'number') {
      const n = getNumber(input, field.name);
      if (n === null) {
        issues.push({
          field: field.name,
          issue: `Field "${field.label}" must be a number`,
          severity: 'error',
        });
        continue;
      }
      if (field.min !== undefined && n < field.min) {
        issues.push({
          field: field.name,
          issue: `Field "${field.label}" (${n}) is below minimum ${field.min}`,
          severity: 'error',
        });
      }
      if (field.max !== undefined && n > field.max) {
        issues.push({
          field: field.name,
          issue: `Field "${field.label}" (${n}) exceeds maximum ${field.max}`,
          severity: 'error',
        });
      }
    }

    if (field.type === 'enum' && field.enumValues) {
      const s = getString(input, field.name);
      if (s !== null && !field.enumValues.includes(s)) {
        issues.push({
          field: field.name,
          issue: `Field "${field.label}" value "${s}" is not in allowed values: ${field.enumValues.join(', ')}`,
          severity: 'error',
        });
      }
    }
  }

  return { valid: issues.filter((i) => i.severity === 'error').length === 0, issues };
}

// ============================================================================
// CONSTRAINT CHECKING
// ============================================================================

function isPresentAttr(val: unknown): boolean {
  return val !== undefined && val !== null;
}

export function checkConstraint(
  action: CandidateAction,
  constraintActionField: string,
  operator: ComparisonOperator,
  value: number | string | boolean | undefined,
  rangeMin: number | undefined,
  rangeMax: number | undefined
): { satisfied: boolean; explanation: string } {
  const attrVal = action.attributes[constraintActionField];

  switch (operator) {
    case 'eq':
      return {
        satisfied: attrVal === value,
        explanation: `${attrVal} ${attrVal === value ? '==' : '!='} ${value}`,
      };
    case 'neq':
      return {
        satisfied: attrVal !== value,
        explanation: `${attrVal} ${attrVal !== value ? '!=' : '=='} ${value}`,
      };
    case 'gt': {
      const ok = typeof attrVal === 'number' && typeof value === 'number' && attrVal > value;
      return { satisfied: ok, explanation: `${attrVal} ${ok ? '>' : '<='} ${value}` };
    }
    case 'gte': {
      const ok = typeof attrVal === 'number' && typeof value === 'number' && attrVal >= value;
      return { satisfied: ok, explanation: `${attrVal} ${ok ? '>=' : '<'} ${value}` };
    }
    case 'lt': {
      const ok = typeof attrVal === 'number' && typeof value === 'number' && attrVal < value;
      return { satisfied: ok, explanation: `${attrVal} ${ok ? '<' : '>='} ${value}` };
    }
    case 'lte': {
      const ok = typeof attrVal === 'number' && typeof value === 'number' && attrVal <= value;
      return { satisfied: ok, explanation: `${attrVal} ${ok ? '<=' : '>'} ${value}` };
    }
    case 'in_range': {
      const ok = typeof attrVal === 'number' && typeof rangeMin === 'number' && typeof rangeMax === 'number' && attrVal >= rangeMin && attrVal <= rangeMax;
      return { satisfied: ok, explanation: `${attrVal} ${ok ? 'in' : 'outside'} [${rangeMin}, ${rangeMax}]` };
    }
    case 'not_in_range': {
      const inRange = typeof attrVal === 'number' && typeof rangeMin === 'number' && typeof rangeMax === 'number' && attrVal >= rangeMin && attrVal <= rangeMax;
      return { satisfied: !inRange, explanation: `${attrVal} ${!inRange ? 'outside' : 'in'} [${rangeMin}, ${rangeMax}]` };
    }
    case 'present':
      return {
        satisfied: isPresentAttr(attrVal),
        explanation: isPresentAttr(attrVal) ? 'present' : 'missing',
      };
    case 'missing':
      return {
        satisfied: !isPresentAttr(attrVal),
        explanation: isPresentAttr(attrVal) ? 'present' : 'missing',
      };
    default:
      return { satisfied: false, explanation: `Unknown operator: ${operator}` };
  }
}
