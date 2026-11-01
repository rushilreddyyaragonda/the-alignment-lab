import { useState, useMemo } from 'react';
import { useLab } from '@/context/LabContext';
import { decide } from '@/engine/decisionEngine';
import { Play, ChevronRight, Save, Plus, Copy, Trash2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { Policy, Rule, ObjectiveComponent, Constraint } from '@/types';

export function Laboratory() {
  const {
    scenarios,
    currentScenario,
    setCurrentScenarioId,
    currentPolicy,
    policies,
    setCurrentPolicyId,
    saveCurrentPolicy,
    createNewPolicy,
    duplicatePolicy,
    deletePolicy,
    updatePolicy,
    results,
    runSimulation,
    selectedResult,
    setSelectedResult,
  } = useLab();

  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [showPolicyMenu, setShowPolicyMenu] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  if (!currentScenario || !currentPolicy) return null;

  const handleSave = () => {
    const ok = saveCurrentPolicy();
    setSaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleNewPolicy = () => {
    if (newPolicyName.trim()) {
      createNewPolicy(newPolicyName);
      setNewPolicyName('');
      setShowPolicyMenu(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span className="font-mono-lab">LABORATORY</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-mono-lab">{currentScenario.name}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{currentScenario.name}</h1>
        <p className="text-gray-600 mt-1 text-sm">{currentScenario.tagline}</p>
      </div>

      {/* Scenario + Policy bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Scenario selector */}
        <div className="lab-card p-4">
          <div className="lab-section-title mb-2">Active Scenario</div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{currentScenario.name}</span>
            <button
              onClick={() => setShowScenarioPicker(!showScenarioPicker)}
              className="lab-btn-secondary text-xs px-3 py-1"
            >
              Change
            </button>
          </div>
          {showScenarioPicker && (
            <div className="mt-3 space-y-1.5 animate-slide-up">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentScenarioId(s.id);
                    setShowScenarioPicker(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-md border text-sm transition-all ${
                    s.id === currentScenario.id
                      ? 'border-[var(--color-cobalt)] bg-[var(--color-cobalt-pale)]'
                      : 'border-[var(--color-grid)] hover:border-[var(--color-grid-dark)]'
                  }`}
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.tagline}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Policy selector */}
        <div className="lab-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="lab-section-title">Active Policy</span>
            {saveStatus === 'saved' && (
              <span className="text-xs text-[var(--color-green)] flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-[var(--color-red)] flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Save failed
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <select
              value={currentPolicy.id}
              onChange={(e) => setCurrentPolicyId(e.target.value)}
              className="lab-input flex-1 text-sm"
            >
              <option value={currentPolicy.id}>{currentPolicy.name} (current)</option>
              {policies
                .filter((p) => p.id !== currentPolicy.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button onClick={handleSave} className="lab-btn-secondary text-xs px-2 py-1.5" title="Save policy">
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setShowPolicyMenu(!showPolicyMenu)}
              className="lab-btn-secondary text-xs px-2 py-1"
            >
              <Plus className="w-3 h-3" /> New
            </button>
            <button
              onClick={() => duplicatePolicy(currentPolicy.id, `${currentPolicy.name} (copy)`)}
              className="lab-btn-secondary text-xs px-2 py-1"
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            {policies.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Delete policy "${currentPolicy.name}"?`)) {
                    deletePolicy(currentPolicy.id);
                  }
                }}
                className="lab-btn-danger text-xs px-2 py-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          {showPolicyMenu && (
            <div className="mt-2 flex gap-2 animate-slide-up">
              <input
                type="text"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                placeholder="Policy name..."
                className="lab-input text-sm flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleNewPolicy()}
              />
              <button onClick={handleNewPolicy} className="lab-btn-primary text-xs px-3 py-1">
                Create
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Briefing */}
      <div className="lab-card p-5 mb-6 bg-[var(--color-paper-warm)]">
        <div className="lab-section-title mb-2">Scenario Briefing</div>
        <p className="text-sm text-[var(--color-ink-soft)] whitespace-pre-line leading-relaxed">{currentScenario.briefing}</p>
        <p className="text-xs text-gray-500 mt-3 italic">{currentScenario.disclaimer}</p>
      </div>

      {/* Configuration panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ObjectivesPanel
          objectives={currentPolicy.objectives}
          weights={currentPolicy.weights}
          onChange={(objs, weights) =>
            updatePolicy((p) => ({ ...p, objectives: objs, weights }))
          }
        />
        <ConstraintsPanel
          constraints={currentPolicy.constraints}
          onChange={(constraints) => updatePolicy((p) => ({ ...p, constraints }))}
        />
      </div>

      {/* Rules summary */}
      <RulesSummaryPanel rules={currentPolicy.rules} />

      {/* Run button */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={runSimulation} className="lab-btn-primary px-6 py-2.5 text-base">
          <Play className="w-4 h-4" /> Run Decision System
        </button>
        <span className="text-xs text-gray-500">
          {currentScenario.testInputs.length} test inputs will be processed
        </span>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ResultsTable
          results={results}
          selectedResult={selectedResult}
          onSelect={setSelectedResult}
          scenario={currentScenario}
        />
      )}
    </div>
  );
}

// --- Objectives Panel -------------------------------------------------------

function ObjectivesPanel({
  objectives,
  weights,
  onChange,
}: {
  objectives: ObjectiveComponent[];
  weights: Record<string, number>;
  onChange: (objs: ObjectiveComponent[], weights: Record<string, number>) => void;
}) {
  const totalWeight = objectives.reduce((sum, o) => sum + (weights[o.metricKey] ?? 0), 0);

  return (
    <div className="lab-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="lab-section-title">Objective Weights</span>
        <span className={`text-xs font-mono-lab ${Math.abs(totalWeight - 1) < 0.001 ? 'text-[var(--color-green)]' : 'text-[var(--color-amber)]'}`}>
          Σ = {totalWeight.toFixed(2)}
        </span>
      </div>
      <div className="space-y-3">
        {objectives.map((obj) => (
          <div key={obj.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{obj.name}</span>
              <span className="text-xs font-mono-lab text-gray-500">
                {weights[obj.metricKey]?.toFixed(2) ?? '0.00'}
                <span className="ml-1 text-gray-400">({obj.direction})</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights[obj.metricKey] ?? 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange(objectives, { ...weights, [obj.metricKey]: val });
              }}
              className="w-full accent-[var(--color-cobalt)]"
            />
            <p className="text-[11px] text-gray-500 mt-0.5">{obj.description}</p>
          </div>
        ))}
      </div>
      {Math.abs(totalWeight - 1) > 0.001 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-amber)]">
          <AlertTriangle className="w-3.5 h-3.5" />
          Weights do not sum to 1.0 — relative proportions still apply.
        </div>
      )}
    </div>
  );
}

// --- Constraints Panel ------------------------------------------------------

function ConstraintsPanel({
  constraints,
  onChange,
}: {
  constraints: Constraint[];
  onChange: (c: Constraint[]) => void;
}) {
  return (
    <div className="lab-card p-4">
      <div className="lab-section-title mb-3">Hard Constraints</div>
      <div className="space-y-2">
        {constraints.map((c) => (
          <div key={c.id} className="flex items-start gap-2 p-2 rounded-md bg-[var(--color-red-pale)]/40">
            <div className="w-1 h-full rounded-full bg-[var(--color-red)] flex-shrink-0 self-stretch" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-gray-600">{c.description}</div>
              <div className="text-[11px] font-mono-lab text-gray-500 mt-1">
                {c.actionField} {c.operator} {c.value ?? `[${c.rangeMin}, ${c.rangeMax}]`}
              </div>
            </div>
          </div>
        ))}
        {constraints.length === 0 && (
          <p className="text-xs text-gray-400 italic">No hard constraints defined.</p>
        )}
      </div>
    </div>
  );
}

// --- Rules Summary ----------------------------------------------------------

function RulesSummaryPanel({ rules }: { rules: Rule[] }) {
  const enabled = rules.filter((r) => r.enabled);
  const hardRules = enabled.filter((r) => r.classification === 'hard');
  const softRules = enabled.filter((r) => r.classification === 'soft');

  return (
    <div className="lab-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="lab-section-title">Active Rules ({enabled.length})</span>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="lab-tag-hard">HARD</span>
            {hardRules.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="lab-tag-soft">SOFT</span>
            {softRules.length}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {enabled
          .sort((a, b) => b.priority - a.priority)
          .map((rule) => (
            <div key={rule.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
              <span className={`lab-tag ${rule.classification === 'hard' ? 'lab-tag-hard' : 'lab-tag-soft'}`}>
                {rule.classification}
              </span>
              <span className="text-sm font-medium flex-1">{rule.name}</span>
              <span className="text-xs font-mono-lab text-gray-400">P{rule.priority}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// --- Results Table ----------------------------------------------------------

function ResultsTable({
  results,
  selectedResult,
  onSelect,
  scenario,
}: {
  results: import('@/types').DecisionResult[];
  selectedResult: import('@/types').DecisionResult | null;
  onSelect: (r: import('@/types').DecisionResult) => void;
  scenario: import('@/types').Scenario;
}) {
  const infeasibleCount = results.filter((r) => r.trace.infeasible).length;
  const validResults = results.filter((r) => !r.trace.infeasible);

  return (
    <div className="lab-card p-0 overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--color-grid)] flex items-center justify-between">
        <div>
          <span className="lab-section-title">Decision Results</span>
          <span className="ml-3 text-xs text-gray-500">
            {results.length} total · {validResults.length} decided · {infeasibleCount} infeasible
          </span>
        </div>
      </div>
      <div className="overflow-x-auto lab-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-paper-warm)] border-b border-[var(--color-grid)]">
              <th className="text-left px-4 py-2 font-semibold text-xs text-gray-600">Input ID</th>
              {scenario.inputSchema.slice(0, 4).map((f) => (
                <th key={f.name} className="text-left px-3 py-2 font-semibold text-xs text-gray-600">
                  {f.label}
                </th>
              ))}
              <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600">Decision</th>
              <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600">Score</th>
              <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isSelected = selectedResult?.input.id === r.input.id;
              return (
                <tr
                  key={r.input.id}
                  onClick={() => onSelect(r)}
                  className={`cursor-pointer border-b border-[var(--color-grid)] transition-colors ${
                    isSelected ? 'bg-[var(--color-cobalt-pale)]' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono-lab text-xs">{r.input.id}</td>
                  {scenario.inputSchema.slice(0, 4).map((f) => {
                    const val = r.input.data[f.name];
                    return (
                      <td key={f.name} className="px-3 py-2.5 text-xs">
                        {val === null || val === undefined ? (
                          <span className="text-gray-300 italic">—</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5">
                    {r.trace.infeasible ? (
                      <span className="text-[var(--color-red)] text-xs font-medium">INFEASIBLE</span>
                    ) : (
                      <span className="text-xs font-semibold">{r.trace.selectedActionName}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono-lab text-xs">
                    {r.trace.infeasible
                      ? '—'
                      : r.trace.scoreBreakdowns
                          .find((s) => s.actionId === r.trace.selectedActionId)
                          ?.finalScore.toFixed(3) ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.trace.infeasible ? (
                      <XCircle className="w-4 h-4 text-[var(--color-red)]" />
                    ) : r.trace.outcomeEvaluation.some((e) => !e.passed) ? (
                      <AlertTriangle className="w-4 h-4 text-[var(--color-amber)]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 border-t border-[var(--color-grid)] text-xs text-gray-500">
        Click any row to inspect the full Decision Trace.
      </div>
    </div>
  );
}
