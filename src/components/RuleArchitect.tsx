import { useState } from 'react';
import { useLab } from '@/context/LabContext';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  FlaskRound,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import type { Rule, Condition, ComparisonOperator, LogicGate, RuleEffect, RuleClassification, ConditionGroup } from '@/types';
import { evaluateConditionGroup, isPresent } from '@/engine/conditions';
import { decide } from '@/engine/decisionEngine';

const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Does not equal' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'present', label: 'Is present' },
  { value: 'missing', label: 'Is missing' },
  { value: 'in_range', label: 'Is within range' },
  { value: 'not_in_range', label: 'Is not within range' },
];

export function RuleArchitect() {
  const { currentScenario, currentPolicy, updatePolicy } = useLab();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [previewInput, setPreviewInput] = useState<Record<string, number | string | boolean | null>>({});
  const [showPreview, setShowPreview] = useState(false);

  if (!currentScenario || !currentPolicy) return null;

  const sortedRules = [...currentPolicy.rules].sort((a, b) => b.priority - a.priority);

  const addRule = () => {
    const newRule: Rule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'New Rule',
      description: 'Describe this rule...',
      priority: 50,
      condition: { gate: 'AND', conditions: [{ field: currentScenario.inputSchema[0]?.name ?? '', operator: 'gt', value: 0 }] },
      effect: { kind: 'score_adjust', actionId: currentScenario.candidateActions[0]?.id ?? '', delta: 0.1 },
      classification: 'soft',
      enabled: true,
    };
    updatePolicy((p) => ({ ...p, rules: [...p.rules, newRule] }));
    setEditingRule(newRule);
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    updatePolicy((p) => ({
      ...p,
      rules: p.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
    if (editingRule?.id === id) {
      setEditingRule({ ...editingRule, ...updates });
    }
  };

  const deleteRule = (id: string) => {
    updatePolicy((p) => ({ ...p, rules: p.rules.filter((r) => r.id !== id) }));
    if (editingRule?.id === id) setEditingRule(null);
  };

  const duplicateRule = (rule: Rule) => {
    const copy: Rule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${rule.name} (copy)`,
    };
    updatePolicy((p) => ({ ...p, rules: [...p.rules, copy] }));
  };

  const toggleRule = (id: string, enabled: boolean) => {
    updateRule(id, { enabled });
  };

  const moveRule = (id: string, direction: 'up' | 'down') => {
    updatePolicy((p) => {
      const rules = [...p.rules].sort((a, b) => b.priority - a.priority);
      const idx = rules.findIndex((r) => r.id === id);
      if (idx < 0) return p;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= rules.length) return p;
      const currentPriority = rules[idx].priority;
      const swapPriority = rules[swapIdx].priority;
      return {
        ...p,
        rules: p.rules.map((r) => {
          if (r.id === id) return { ...r, priority: swapPriority };
          if (r.id === rules[swapIdx].id) return { ...r, priority: currentPriority };
          return r;
        }),
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">RULE ARCHITECT</div>
        <h1 className="text-2xl font-bold tracking-tight">Visual Policy Editor</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Create, edit, prioritize, and test decision rules for {currentScenario.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rules list */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="lab-section-title">Rules ({sortedRules.length})</span>
            <button onClick={addRule} className="lab-btn-primary text-xs px-3 py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </button>
          </div>

          {sortedRules.map((rule, idx) => (
            <div
              key={rule.id}
              className={`lab-card p-3 ${!rule.enabled ? 'opacity-60' : ''} ${
                editingRule?.id === rule.id ? 'lab-card-active' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button
                    onClick={() => moveRule(rule.id, 'up')}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-[var(--color-cobalt)] disabled:opacity-20"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono-lab text-gray-400 text-center">P{rule.priority}</span>
                  <button
                    onClick={() => moveRule(rule.id, 'down')}
                    disabled={idx === sortedRules.length - 1}
                    className="text-gray-400 hover:text-[var(--color-cobalt)] disabled:opacity-20"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditingRule(rule)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`lab-tag ${rule.classification === 'hard' ? 'lab-tag-hard' : 'lab-tag-soft'}`}>
                      {rule.classification}
                    </span>
                    <span className={`text-sm font-semibold ${rule.enabled ? '' : 'line-through'}`}>
                      {rule.name}
                    </span>
                    {!rule.enabled && <span className="lab-tag-disabled lab-tag">disabled</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{rule.description}</p>
                  <div className="text-[11px] font-mono-lab text-gray-400 mt-1">
                    {rule.condition.gate} · {rule.condition.conditions.length} condition(s) · effect: {rule.effect.kind}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleRule(rule.id, !rule.enabled)}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title={rule.enabled ? 'Disable' : 'Enable'}
                  >
                    {rule.enabled ? <Eye className="w-4 h-4 text-gray-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button
                    onClick={() => duplicateRule(rule)}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded hover:bg-[var(--color-red-pale)]"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-[var(--color-red)]" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {sortedRules.length === 0 && (
            <div className="lab-card p-8 text-center text-gray-400">
              <p className="text-sm">No rules defined. Click "Add Rule" to create one.</p>
            </div>
          )}
        </div>

        {/* Rule editor / preview */}
        <div className="lg:col-span-1">
          {editingRule ? (
            <RuleEditor
              rule={editingRule}
              scenario={currentScenario}
              onUpdate={(updates) => updateRule(editingRule.id, updates)}
              onClose={() => setEditingRule(null)}
              onPreview={() => {
                // initialize preview input from first test input
                if (currentScenario.testInputs[0]) {
                  setPreviewInput({ ...currentScenario.testInputs[0].data });
                }
                setShowPreview(true);
              }}
            />
          ) : (
            <div className="lab-card p-6 text-center text-gray-400 sticky top-6">
              <FlaskRound className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a rule to edit its conditions and effects.</p>
            </div>
          )}

          {showPreview && editingRule && (
            <RulePreview
              rule={editingRule}
              scenario={currentScenario}
              previewInput={previewInput}
              onInputChange={setPreviewInput}
              onClose={() => setShowPreview(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Rule Editor ------------------------------------------------------------

function RuleEditor({
  rule,
  scenario,
  onUpdate,
  onClose,
  onPreview,
}: {
  rule: Rule;
  scenario: import('@/types').Scenario;
  onUpdate: (updates: Partial<Rule>) => void;
  onClose: () => void;
  onPreview: () => void;
}) {
  const [expandedConditions, setExpandedConditions] = useState(true);

  const updateCondition = (idx: number, updates: Partial<Condition>) => {
    const conditions = [...rule.condition.conditions];
    conditions[idx] = { ...conditions[idx], ...updates };
    onUpdate({ condition: { ...rule.condition, conditions } });
  };

  const addCondition = () => {
    onUpdate({
      condition: {
        ...rule.condition,
        conditions: [...rule.condition.conditions, { field: scenario.inputSchema[0]?.name ?? '', operator: 'eq', value: '' }],
      },
    });
  };

  const removeCondition = (idx: number) => {
    onUpdate({
      condition: {
        ...rule.condition,
        conditions: rule.condition.conditions.filter((_, i) => i !== idx),
      },
    });
  };

  const updateEffect = (updates: Partial<RuleEffect>) => {
    onUpdate({ effect: { ...rule.effect, ...updates } as RuleEffect });
  };

  const needsValue = (op: ComparisonOperator) => !['present', 'missing'].includes(op);
  const needsRange = (op: ComparisonOperator) => ['in_range', 'not_in_range'].includes(op);

  return (
    <div className="lab-card p-4 sticky top-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="lab-section-title">Edit Rule</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Name & Description */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-gray-600">Name</label>
          <input
            type="text"
            value={rule.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="lab-input mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Description</label>
          <textarea
            value={rule.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="lab-input mt-1 resize-none"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Priority</label>
            <input
              type="number"
              value={rule.priority}
              onChange={(e) => onUpdate({ priority: parseInt(e.target.value) || 0 })}
              className="lab-input mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Classification</label>
            <select
              value={rule.classification}
              onChange={(e) => onUpdate({ classification: e.target.value as RuleClassification })}
              className="lab-input mt-1"
            >
              <option value="soft">Soft (preference)</option>
              <option value="hard">Hard (mandatory)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-4">
        <button
          onClick={() => setExpandedConditions(!expandedConditions)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-2"
        >
          {expandedConditions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Conditions ({rule.condition.conditions.length})
        </button>

        {expandedConditions && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">Logic:</span>
              <select
                value={rule.condition.gate}
                onChange={(e) =>
                  onUpdate({ condition: { ...rule.condition, gate: e.target.value as LogicGate } })
                }
                className="lab-input text-xs w-24 py-1"
              >
                <option value="AND">AND (all)</option>
                <option value="OR">OR (any)</option>
              </select>
            </div>

            <div className="space-y-2">
              {rule.condition.conditions.map((cond, idx) => (
                <div key={idx} className="p-2 rounded-md bg-gray-50 border border-[var(--color-grid)]">
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-[10px] font-mono-lab text-gray-400">{idx + 1}</span>
                    {rule.condition.conditions.length > 1 && (
                      <span className="text-[10px] font-mono-lab text-gray-400">
                        {rule.condition.gate}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(idx, { field: e.target.value })}
                      className="lab-input text-xs py-1"
                    >
                      {scenario.inputSchema.map((f) => (
                        <option key={f.name} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, { operator: e.target.value as ComparisonOperator })}
                      className="lab-input text-xs py-1"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>
                  {needsValue(cond.operator) && !needsRange(cond.operator) && (
                    <input
                      type="text"
                      value={String(cond.value ?? '')}
                      onChange={(e) => {
                        const field = scenario.inputSchema.find((f) => f.name === cond.field);
                        const val = field?.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                        updateCondition(idx, { value: val as number | string });
                      }}
                      placeholder="Value..."
                      className="lab-input text-xs mt-1.5 py-1"
                    />
                  )}
                  {needsRange(cond.operator) && (
                    <div className="flex gap-1.5 mt-1.5">
                      <input
                        type="number"
                        value={cond.rangeMin ?? 0}
                        onChange={(e) => updateCondition(idx, { rangeMin: parseFloat(e.target.value) })}
                        placeholder="Min"
                        className="lab-input text-xs py-1"
                      />
                      <input
                        type="number"
                        value={cond.rangeMax ?? 0}
                        onChange={(e) => updateCondition(idx, { rangeMax: parseFloat(e.target.value) })}
                        placeholder="Max"
                        className="lab-input text-xs py-1"
                      />
                    </div>
                  )}
                  {rule.condition.conditions.length > 1 && (
                    <button
                      onClick={() => removeCondition(idx)}
                      className="text-[10px] text-[var(--color-red)] mt-1 hover:underline"
                    >
                      Remove condition
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addCondition} className="text-xs text-[var(--color-cobalt)] mt-2 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add condition
            </button>
          </>
        )}
      </div>

      {/* Effect */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Effect</label>
        <select
          value={rule.effect.kind}
          onChange={(e) => {
            const kind = e.target.value as RuleEffect['kind'];
            if (kind === 'require_action' || kind === 'exclude_action') {
              updateEffect({ kind, actionId: scenario.candidateActions[0]?.id ?? '' });
            } else if (kind === 'score_adjust') {
              updateEffect({ kind, actionId: scenario.candidateActions[0]?.id ?? '', delta: 0.1 });
            } else if (kind === 'set_score') {
              updateEffect({ kind, actionId: scenario.candidateActions[0]?.id ?? '', score: 0.5 });
            } else if (kind === 'flag') {
              updateEffect({ kind, message: 'Flagged by rule' });
            }
          }}
          className="lab-input text-xs"
        >
          <option value="score_adjust">Score Adjustment</option>
          <option value="require_action">Require Action (hard)</option>
          <option value="exclude_action">Exclude Action (hard)</option>
          <option value="set_score">Set Score</option>
          <option value="flag">Flag (no score change)</option>
        </select>

        {(rule.effect.kind === 'score_adjust' ||
          rule.effect.kind === 'exclude_action' ||
          rule.effect.kind === 'require_action' ||
          rule.effect.kind === 'set_score') && (
          <select
            value={rule.effect.actionId}
            onChange={(e) => updateEffect({ actionId: e.target.value })}
            className="lab-input text-xs mt-1.5"
          >
            {scenario.candidateActions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        {rule.effect.kind === 'score_adjust' && (
          <div className="mt-1.5">
            <label className="text-[10px] text-gray-500">Delta: {rule.effect.delta.toFixed(2)}</label>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={rule.effect.delta}
              onChange={(e) => updateEffect({ delta: parseFloat(e.target.value) })}
              className="w-full accent-[var(--color-cobalt)]"
            />
          </div>
        )}
        {rule.effect.kind === 'set_score' && (
          <div className="mt-1.5">
            <label className="text-[10px] text-gray-500">Score: {rule.effect.score.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={rule.effect.score}
              onChange={(e) => updateEffect({ score: parseFloat(e.target.value) })}
              className="w-full accent-[var(--color-cobalt)]"
            />
          </div>
        )}
        {rule.effect.kind === 'flag' && (
          <input
            type="text"
            value={rule.effect.message}
            onChange={(e) => updateEffect({ message: e.target.value })}
            className="lab-input text-xs mt-1.5"
            placeholder="Flag message..."
          />
        )}
      </div>

      <button onClick={onPreview} className="lab-btn-secondary w-full justify-center text-xs py-2">
        <FlaskRound className="w-3.5 h-3.5" /> Test against sample input
      </button>
    </div>
  );
}

// --- Rule Preview -----------------------------------------------------------

function RulePreview({
  rule,
  scenario,
  previewInput,
  onInputChange,
  onClose,
}: {
  rule: Rule;
  scenario: import('@/types').Scenario;
  previewInput: Record<string, number | string | boolean | null>;
  onInputChange: (data: Record<string, number | string | boolean | null>) => void;
  onClose: () => void;
}) {
  const inputRecord = { id: 'preview', data: previewInput };
  const { matched, conditionResults } = evaluateConditionGroup(rule.condition, inputRecord);

  // Run full decision to see effect
  const result = decide(inputRecord, {
    ...rule,
    id: 'preview_policy',
    name: 'Preview',
    scenarioId: scenario.id,
    rules: [rule],
    objectives: scenario.defaultObjectives,
    constraints: scenario.defaultConstraints,
    weights: scenario.defaultWeights,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  }, scenario, [inputRecord]);

  return (
    <div className="lab-card p-4 mt-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="lab-section-title">Rule Preview</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {scenario.inputSchema.map((field) => (
          <div key={field.name}>
            <label className="text-[10px] text-gray-500">{field.label}</label>
            {field.type === 'boolean' ? (
              <select
                value={String(previewInput[field.name] ?? 'false')}
                onChange={(e) => onInputChange({ ...previewInput, [field.name]: e.target.value === 'true' })}
                className="lab-input text-xs py-0.5"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : field.type === 'enum' ? (
              <select
                value={String(previewInput[field.name] ?? '')}
                onChange={(e) => onInputChange({ ...previewInput, [field.name]: e.target.value })}
                className="lab-input text-xs py-0.5"
              >
                <option value="">—</option>
                {field.enumValues?.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={String(previewInput[field.name] ?? '')}
                onChange={(e) => {
                  const val = field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                  onInputChange({ ...previewInput, [field.name]: val });
                }}
                className="lab-input text-xs py-0.5"
              />
            )}
          </div>
        ))}
      </div>

      <div className={`p-3 rounded-md ${matched ? 'bg-[var(--color-green-pale)]' : 'bg-gray-100'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${matched ? 'bg-[var(--color-green)]' : 'bg-gray-400'}`} />
          <span className="text-sm font-semibold">
            {matched ? 'CONDITION MATCHED' : 'Condition not matched'}
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {conditionResults.map((cr, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-mono-lab">
              <span className={cr.matched ? 'text-[var(--color-green)]' : 'text-gray-400'}>
                {cr.matched ? '✓' : '✗'}
              </span>
              <span className="text-gray-600">
                {cr.condition.field} {cr.condition.operator} {String(cr.condition.value ?? `[${cr.condition.rangeMin},${cr.condition.rangeMax}]`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 p-2 rounded-md bg-[var(--color-cobalt-pale)] text-xs">
        <span className="font-semibold">Effect:</span>{' '}
        {rule.effect.kind === 'score_adjust' && `Adjust ${rule.effect.actionId} by ${rule.effect.delta}`}
        {rule.effect.kind === 'set_score' && `Set ${rule.effect.actionId} score to ${rule.effect.score}`}
        {rule.effect.kind === 'require_action' && `Require action: ${rule.effect.actionId}`}
        {rule.effect.kind === 'exclude_action' && `Exclude action: ${rule.effect.actionId}`}
        {rule.effect.kind === 'flag' && `Flag: ${rule.effect.message}`}
      </div>

      <div className="mt-2 p-2 rounded-md bg-[var(--color-paper-warm)] text-xs">
        <span className="font-semibold">Resulting decision:</span>{' '}
        {result.trace.infeasible ? 'INFEASIBLE' : result.trace.selectedActionName}
      </div>
    </div>
  );
}
