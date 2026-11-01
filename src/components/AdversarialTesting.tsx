import { useState, useMemo } from 'react';
import { useLab } from '@/context/LabContext';
import { generateEdgeCases, generateTestCases, runTestSuite } from '@/engine/testFramework';
import { Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import type { TestSuiteResult, TestResult, TestCategory } from '@/types';

const CATEGORY_LABELS: Record<TestCategory, string> = {
  boundary: 'Boundary',
  missing_data: 'Missing Data',
  conflicting_rules: 'Conflicting Rules',
  constraint_conflict: 'Constraint Conflict',
  extreme_value: 'Extreme Value',
  objective_conflict: 'Objective Conflict',
  distributional: 'Distributional',
  determinism: 'Determinism',
};

const CATEGORY_COLORS: Record<TestCategory, string> = {
  boundary: 'var(--color-cobalt)',
  missing_data: 'var(--color-amber)',
  conflicting_rules: 'var(--color-red)',
  constraint_conflict: 'var(--color-red)',
  extreme_value: 'var(--color-amber)',
  objective_conflict: 'var(--color-cobalt)',
  distributional: 'var(--color-green)',
  determinism: 'var(--color-cobalt)',
};

export function AdversarialTesting() {
  const { currentScenario, currentPolicy } = useLab();
  const [suiteResult, setSuiteResult] = useState<TestSuiteResult | null>(null);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState(42);

  const testCases = useMemo(
    () => (currentScenario ? generateTestCases(currentScenario, seed) : []),
    [currentScenario, seed]
  );

  const edgeCases = useMemo(
    () => (currentScenario ? generateEdgeCases(currentScenario, seed) : []),
    [currentScenario, seed]
  );

  if (!currentScenario || !currentPolicy) return null;

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      const result = runTestSuite(testCases, currentPolicy, currentScenario);
      setSuiteResult(result);
      setRunning(false);
    }, 100);
  };

  const handleExport = () => {
    if (!suiteResult) return;
    const blob = new Blob([JSON.stringify(suiteResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryCounts = testCases.reduce(
    (acc, tc) => {
      acc[tc.category] = (acc[tc.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">ADVERSARIAL TESTING</div>
        <h1 className="text-2xl font-bold tracking-tight">Adversarial Testing Lab</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Challenge the configured policy with edge cases, boundary values, missing data, and constraint conflicts.
        </p>
      </div>

      {/* Controls */}
      <div className="lab-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Generator Seed:</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              className="lab-input w-20 text-sm"
            />
          </div>
          <button onClick={handleRun} disabled={running} className="lab-btn-primary">
            <Play className="w-4 h-4" /> {running ? 'Running...' : 'Run Test Suite'}
          </button>
          <span className="text-xs text-gray-500">{testCases.length} test cases generated</span>
          {suiteResult && (
            <button onClick={handleExport} className="lab-btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> Export Results
            </button>
          )}
        </div>

        {/* Category distribution */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span
              key={cat}
              className="lab-tag"
              style={{
                background: `${CATEGORY_COLORS[cat as TestCategory]}15`,
                color: CATEGORY_COLORS[cat as TestCategory],
              }}
            >
              {CATEGORY_LABELS[cat as TestCategory]}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Results summary */}
      {suiteResult && (
        <div className="grid grid-cols-3 gap-3 mb-4 animate-fade-in">
          <div className="lab-card p-4 text-center">
            <div className="text-3xl font-bold text-[var(--color-green)]">{suiteResult.totalPassed}</div>
            <div className="text-xs text-gray-500 mt-1">Passed</div>
          </div>
          <div className="lab-card p-4 text-center">
            <div className="text-3xl font-bold text-[var(--color-red)]">{suiteResult.totalFailed}</div>
            <div className="text-xs text-gray-500 mt-1">Failed</div>
          </div>
          <div className="lab-card p-4 text-center">
            <div className="text-3xl font-bold text-[var(--color-cobalt)]">{suiteResult.totalRun}</div>
            <div className="text-xs text-gray-500 mt-1">Total Run</div>
          </div>
        </div>
      )}

      {/* Results table */}
      {suiteResult && (
        <div className="lab-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-grid)]">
            <span className="lab-section-title">Test Results</span>
          </div>
          <div className="overflow-x-auto lab-scrollbar max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-paper-warm)]">
                <tr className="border-b border-[var(--color-grid)]">
                  <th className="text-left px-4 py-2 font-semibold text-xs text-gray-600">Status</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600">Test Case</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600">Category</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600">Assertion</th>
                  <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {suiteResult.results.map((r) => (
                  <tr
                    key={r.testCaseId}
                    onClick={() => setSelectedResult(r)}
                    className={`cursor-pointer border-b border-[var(--color-grid)] transition-colors ${
                      selectedResult?.testCaseId === r.testCaseId ? 'bg-[var(--color-cobalt-pale)]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      {r.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[var(--color-red)]" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium">{r.testCaseName}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="lab-tag"
                        style={{
                          background: `${CATEGORY_COLORS[r.category]}15`,
                          color: CATEGORY_COLORS[r.category],
                        }}
                      >
                        {CATEGORY_LABELS[r.category]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono-lab text-gray-500">{r.explanation.slice(0, 50)}...</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{r.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failed test detail */}
      {selectedResult && (
        <div className="lab-card p-4 mt-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="lab-section-title">Test Detail: {selectedResult.testCaseName}</span>
            <button onClick={() => setSelectedResult(null)} className="text-xs text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>
          <div className={`p-3 rounded-md mb-3 ${selectedResult.passed ? 'bg-[var(--color-green-pale)]' : 'bg-[var(--color-red-pale)]'}`}>
            <div className="flex items-center gap-2">
              {selectedResult.passed ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
              ) : (
                <XCircle className="w-4 h-4 text-[var(--color-red)]" />
              )}
              <span className="text-sm font-semibold">
                {selectedResult.passed ? 'PASSED' : 'FAILED'} — {selectedResult.explanation}
              </span>
            </div>
          </div>
          <div className="text-xs">
            <div className="font-semibold text-gray-600 mb-1">Input data:</div>
            <pre className="font-mono-lab text-[11px] bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(selectedResult.trace.inputData, null, 2)}
            </pre>
          </div>
          <div className="text-xs mt-2">
            <div className="font-semibold text-gray-600 mb-1">Decision: {selectedResult.trace.selectedActionName ?? 'INFEASIBLE'}</div>
          </div>
        </div>
      )}

      {/* Edge case browser */}
      <div className="mt-6">
        <div className="lab-section-title mb-2">Generated Edge Cases ({edgeCases.length})</div>
        <div className="lab-card p-0 overflow-hidden">
          <div className="overflow-x-auto lab-scrollbar max-h-[300px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--color-paper-warm)]">
                <tr className="border-b border-[var(--color-grid)]">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">ID</th>
                  {currentScenario.inputSchema.slice(0, 5).map((f) => (
                    <th key={f.name} className="text-left px-3 py-2 font-semibold text-gray-600">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {edgeCases.map((ec) => (
                  <tr key={ec.id} className="border-b border-[var(--color-grid)] hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono-lab text-[10px]">{ec.id}</td>
                    {currentScenario.inputSchema.slice(0, 5).map((f) => {
                      const val = ec.data[f.name];
                      return (
                        <td key={f.name} className="px-3 py-1.5 font-mono-lab">
                          {val === null || val === undefined ? (
                            <span className="text-[var(--color-red)] italic">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-md bg-[var(--color-amber-pale)]/40 border border-[var(--color-amber)]/20 text-xs text-[var(--color-ink-soft)]">
        <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] inline mr-1" />
        A policy can pass every programmed assertion while still having poorly designed objectives or incomplete coverage.
        Passing tests does not prove a system is universally fair or safe.
      </div>
    </div>
  );
}
