import { useState, useMemo } from 'react';
import { useLab } from '@/context/LabContext';
import { runBatch } from '@/engine/decisionEngine';
import { loadPolicies } from '@/engine/storage';
import { Scale, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Policy, DecisionResult } from '@/types';

export function FairnessObservatory() {
  const { currentScenario, currentPolicy, policies } = useLab();
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>(currentPolicy ? [currentPolicy.id] : []);
  const [results, setResults] = useState<Record<string, DecisionResult[]>>({});

  const allPolicies = useMemo(() => {
    const saved = loadPolicies().filter((p) => p.scenarioId === currentScenario?.id);
    const combined = [...policies];
    for (const s of saved) {
      if (!combined.some((p) => p.id === s.id)) combined.push(s);
    }
    if (currentPolicy && !combined.some((p) => p.id === currentPolicy.id)) {
      combined.push(currentPolicy);
    }
    return combined;
  }, [policies, currentScenario, currentPolicy]);

  if (!currentScenario || !currentPolicy) return null;

  const togglePolicy = (id: string) => {
    setSelectedPolicyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const runComparison = () => {
    const newResults: Record<string, DecisionResult[]> = {};
    for (const id of selectedPolicyIds) {
      const policy = allPolicies.find((p) => p.id === id);
      if (policy) {
        newResults[id] = runBatch(currentScenario.testInputs, policy, currentScenario);
      }
    }
    setResults(newResults);
  };

  const groupField = currentScenario.groupField;

  // Calculate group-level metrics
  const calculateGroupMetrics = (batchResults: DecisionResult[]) => {
    if (!groupField) return null;
    const groups: Record<string, DecisionResult[]> = {};
    for (const r of batchResults) {
      const g = (r.input.data[groupField] as string) ?? 'unknown';
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    }
    const metrics: Record<string, { count: number; feasible: number; avgScore: number; decisions: Record<string, number> }> = {};
    for (const [g, rs] of Object.entries(groups)) {
      const feasible = rs.filter((r) => !r.trace.infeasible);
      const scores = feasible.map((r) =>
        r.trace.scoreBreakdowns.find((s) => s.actionId === r.trace.selectedActionId)?.finalScore ?? 0
      );
      const decisions: Record<string, number> = {};
      for (const r of feasible) {
        const action = r.trace.selectedActionName ?? 'infeasible';
        decisions[action] = (decisions[action] ?? 0) + 1;
      }
      metrics[g] = {
        count: rs.length,
        feasible: feasible.length,
        avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        decisions,
      };
    }
    return metrics;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">FAIRNESS OBSERVATORY</div>
        <h1 className="text-2xl font-bold tracking-tight">Fairness & Trade-off Observatory</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Compare multiple policies on the same scenario. Examine how changing weights affects outcomes across groups.
        </p>
      </div>

      {/* Policy selection */}
      <div className="lab-card p-4 mb-4">
        <div className="lab-section-title mb-2">Select Policies to Compare</div>
        <div className="space-y-1.5">
          {allPolicies.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedPolicyIds.includes(p.id)}
                onChange={() => togglePolicy(p.id)}
                className="accent-[var(--color-cobalt)]"
              />
              <span className="text-sm">{p.name}</span>
              <span className="text-[10px] font-mono-lab text-gray-400 ml-auto">
                {p.rules.length} rules · v{p.version}
              </span>
            </label>
          ))}
        </div>
        <button
          onClick={runComparison}
          disabled={selectedPolicyIds.length === 0}
          className="lab-btn-primary mt-3"
        >
          <TrendingUp className="w-4 h-4" /> Run Comparison
        </button>
      </div>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Comparison table */}
          <div className="lab-card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-grid)]">
              <span className="lab-section-title">Policy Comparison</span>
            </div>
            <div className="overflow-x-auto lab-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-paper-warm)] border-b border-[var(--color-grid)]">
                    <th className="text-left px-4 py-2 font-semibold text-xs text-gray-600">Metric</th>
                    {selectedPolicyIds.map((id) => {
                      const p = allPolicies.find((pp) => pp.id === id);
                      return (
                        <th key={id} className="text-left px-4 py-2 font-semibold text-xs text-gray-600">
                          {p?.name ?? id}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--color-grid)]">
                    <td className="px-4 py-2.5 text-xs font-medium">Total Decisions</td>
                    {selectedPolicyIds.map((id) => (
                      <td key={id} className="px-4 py-2.5 font-mono-lab text-xs">
                        {results[id]?.length ?? 0}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--color-grid)]">
                    <td className="px-4 py-2.5 text-xs font-medium">Infeasible Count</td>
                    {selectedPolicyIds.map((id) => (
                      <td key={id} className="px-4 py-2.5 font-mono-lab text-xs">
                        {results[id]?.filter((r) => r.trace.infeasible).length ?? 0}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--color-grid)]">
                    <td className="px-4 py-2.5 text-xs font-medium">Avg Score</td>
                    {selectedPolicyIds.map((id) => {
                      const rs = results[id] ?? [];
                      const scores = rs.filter((r) => !r.trace.infeasible).map((r) =>
                        r.trace.scoreBreakdowns.find((s) => s.actionId === r.trace.selectedActionId)?.finalScore ?? 0
                      );
                      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                      return <td key={id} className="px-4 py-2.5 font-mono-lab text-xs">{avg.toFixed(3)}</td>;
                    })}
                  </tr>
                  <tr className="border-b border-[var(--color-grid)]">
                    <td className="px-4 py-2.5 text-xs font-medium">Outcome Criteria Passed</td>
                    {selectedPolicyIds.map((id) => {
                      const rs = results[id] ?? [];
                      const passed = rs.reduce((sum, r) => sum + r.trace.outcomeEvaluation.filter((e) => e.passed).length, 0);
                      const total = rs.reduce((sum, r) => sum + r.trace.outcomeEvaluation.length, 0);
                      return <td key={id} className="px-4 py-2.5 font-mono-lab text-xs">{passed}/{total}</td>;
                    })}
                  </tr>
                  <tr className="border-b border-[var(--color-grid)]">
                    <td className="px-4 py-2.5 text-xs font-medium">Blind Spots Detected</td>
                    {selectedPolicyIds.map((id) => (
                      <td key={id} className="px-4 py-2.5 font-mono-lab text-xs">
                        {results[id]?.reduce((s, r) => s + r.trace.blindSpots.length, 0) ?? 0}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Group breakdown */}
          {groupField && (
            <div className="lab-card p-4">
              <div className="lab-section-title mb-3">Group-Level Outcomes</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-grid)]">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Group</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Policy</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Count</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Feasible</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Avg Score</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Decisions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPolicyIds.map((id) => {
                      const p = allPolicies.find((pp) => pp.id === id);
                      const metrics = calculateGroupMetrics(results[id] ?? []);
                      if (!metrics) return null;
                      return Object.entries(metrics).map(([g, m]) => (
                        <tr key={`${id}-${g}`} className="border-b border-[var(--color-grid)]">
                          <td className="px-3 py-2 font-medium">
                            {currentScenario.groupLabels?.[g] ?? g}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{p?.name}</td>
                          <td className="px-3 py-2 text-right font-mono-lab">{m.count}</td>
                          <td className="px-3 py-2 text-right font-mono-lab">{m.feasible}</td>
                          <td className="px-3 py-2 text-right font-mono-lab">{m.avgScore.toFixed(3)}</td>
                          <td className="px-3 py-2 text-[10px] font-mono-lab">
                            {Object.entries(m.decisions).map(([a, c]) => (
                              <span key={a} className="mr-2">{a}: {c}</span>
                            ))}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trade-off visualization */}
          <TradeOffViz
            policies={allPolicies.filter((p) => selectedPolicyIds.includes(p.id))}
            results={results}
            scenario={currentScenario}
          />
        </div>
      )}

      {Object.keys(results).length === 0 && (
        <div className="lab-card p-12 text-center">
          <Scale className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Select policies above and click "Run Comparison" to analyze outcomes.</p>
        </div>
      )}

      <div className="mt-4 p-3 rounded-md bg-[var(--color-amber-pale)]/40 border border-[var(--color-amber)]/20 text-xs text-[var(--color-ink-soft)]">
        <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] inline mr-1" />
        These metrics do not establish a universal standard of fairness. A policy performing well on selected
        metrics may still produce undesirable outcomes on dimensions not measured here.
      </div>
    </div>
  );
}

function TradeOffViz({
  policies,
  results,
  scenario,
}: {
  policies: Policy[];
  results: Record<string, DecisionResult[]>;
  scenario: import('@/types').Scenario;
}) {
  if (policies.length < 2) return null;

  // For each policy, compute two metrics: avg outcome score and group disparity
  const data = policies.map((p) => {
    const rs = results[p.id] ?? [];
    const feasible = rs.filter((r) => !r.trace.infeasible);
    const avgScore = feasible.length > 0
      ? feasible.reduce((s, r) => s + (r.trace.scoreBreakdowns.find((sb) => sb.actionId === r.trace.selectedActionId)?.finalScore ?? 0), 0) / feasible.length
      : 0;
    const passedCriteria = rs.reduce((s, r) => s + r.trace.outcomeEvaluation.filter((e) => e.passed).length, 0);
    return { name: p.name, avgScore, passedCriteria, total: rs.length };
  });

  const maxScore = Math.max(...data.map((d) => d.avgScore), 0.001);
  const maxPassed = Math.max(...data.map((d) => d.passedCriteria), 1);

  return (
    <div className="lab-card p-4">
      <div className="lab-section-title mb-3">Trade-off Comparison</div>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">{d.name}</span>
              <span className="text-[10px] font-mono-lab text-gray-500">
                score: {d.avgScore.toFixed(3)} · criteria passed: {d.passedCriteria}
              </span>
            </div>
            <div className="flex gap-1">
              <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                <div
                  className="h-full bg-[var(--color-cobalt)] transition-all"
                  style={{ width: `${(d.avgScore / maxScore) * 100}%` }}
                />
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                <div
                  className="h-full bg-[var(--color-green)] transition-all"
                  style={{ width: `${(d.passedCriteria / maxPassed) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--color-cobalt)]" /> Avg Score
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--color-green)]" /> Criteria Passed
        </span>
      </div>
    </div>
  );
}
