import { useState } from 'react';
import { useLab } from '@/context/LabContext';
import {
  ChevronRight,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { DecisionTrace } from '@/types';

export function DecisionTraceView() {
  const { currentScenario, currentPolicy, results, selectedResult, setSelectedResult, runSimulation } = useLab();

  if (!currentScenario || !currentPolicy) return null;

  if (results.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">DECISION TRACE</div>
        <h1 className="text-2xl font-bold tracking-tight">Decision Trace Inspector</h1>
        <div className="lab-card p-12 text-center mt-6">
          <Eye className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">No decisions have been run yet.</p>
          <button onClick={runSimulation} className="lab-btn-primary">
            Run Decision System
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">DECISION TRACE</div>
        <h1 className="text-2xl font-bold tracking-tight">Decision Trace Inspector</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Select a decision to inspect the full execution path: input → rules → constraints → score → decision → outcome.
        </p>
      </div>

      {/* Input selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {results.map((r) => {
          const active = selectedResult?.input.id === r.input.id;
          return (
            <button
              key={r.input.id}
              onClick={() => setSelectedResult(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-lab transition-all ${
                active
                  ? 'bg-[var(--color-cobalt)] text-white'
                  : 'bg-white border border-[var(--color-grid)] hover:border-[var(--color-cobalt)] text-gray-600'
              }`}
            >
              {r.input.id}
              {r.trace.infeasible && ' ⚠'}
            </button>
          );
        })}
      </div>

      {selectedResult && <TraceDiagram trace={selectedResult.trace} />}
    </div>
  );
}

// --- Trace Diagram ----------------------------------------------------------

function TraceDiagram({ trace }: { trace: DecisionTrace }) {
  const [activeStage, setActiveStage] = useState<string | null>('input');

  const stages = [
    { id: 'input', label: 'Input', icon: '▸', status: trace.inputValid ? 'valid' : 'invalid' },
    { id: 'candidates', label: 'Candidates', icon: '◇', status: trace.candidateActions.length > 0 ? 'valid' : 'warning' },
    { id: 'rules', label: 'Rules', icon: '⚙', status: trace.ruleEvaluations.some((r) => r.matched) ? 'active' : 'neutral' },
    { id: 'constraints', label: 'Constraints', icon: '⎯', status: trace.constraintChecks.every((c) => c.satisfied) ? 'valid' : 'violated' },
    { id: 'score', label: 'Scoring', icon: '∑', status: 'neutral' },
    { id: 'decision', label: 'Decision', icon: '◆', status: trace.infeasible ? 'violated' : 'valid' },
    { id: 'outcome', label: 'Outcome', icon: '◎', status: trace.outcomeEvaluation.every((e) => e.passed) ? 'valid' : 'warning' },
    { id: 'blindspots', label: 'Blind Spots', icon: '!', status: trace.blindSpots.length > 0 ? 'warning' : 'valid' },
  ];

  return (
    <div>
      {/* Pipeline diagram */}
      <div className="lab-card p-4 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {stages.map((stage, idx) => {
            const isActive = activeStage === stage.id;
            const color =
              stage.status === 'valid' ? 'var(--color-green)' :
              stage.status === 'violated' || stage.status === 'invalid' ? 'var(--color-red)' :
              stage.status === 'warning' ? 'var(--color-amber)' :
              stage.status === 'active' ? 'var(--color-cobalt)' : 'var(--color-grid-dark)';
            return (
              <div key={stage.id} className="flex items-center">
                <button
                  onClick={() => setActiveStage(stage.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-all ${
                    isActive ? 'bg-[var(--color-cobalt-pale)]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-mono-lab"
                    style={{ borderColor: color, color }}
                  >
                    {stage.icon}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color }}>
                    {stage.label}
                  </span>
                </button>
                {idx < stages.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage detail */}
      <div className="lab-card p-5 animate-fade-in">
        {activeStage === 'input' && <InputStage trace={trace} />}
        {activeStage === 'candidates' && <CandidatesStage trace={trace} />}
        {activeStage === 'rules' && <RulesStage trace={trace} />}
        {activeStage === 'constraints' && <ConstraintsStage trace={trace} />}
        {activeStage === 'score' && <ScoreStage trace={trace} />}
        {activeStage === 'decision' && <DecisionStage trace={trace} />}
        {activeStage === 'outcome' && <OutcomeStage trace={trace} />}
        {activeStage === 'blindspots' && <BlindSpotsStage trace={trace} />}
      </div>
    </div>
  );
}

// --- Stage Components -------------------------------------------------------

function StageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function InputStage({ trace }: { trace: DecisionTrace }) {
  return (
    <div>
      <StageHeader title="Input Received" subtitle="Actual values supplied to the decision engine" />
      {trace.validationIssues.length > 0 && (
        <div className="mb-3 p-3 rounded-md bg-[var(--color-red-pale)] border border-[var(--color-red)]/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[var(--color-red)]" />
            <span className="text-sm font-semibold text-[var(--color-red)]">Validation Issues</span>
          </div>
          {trace.validationIssues.map((issue, i) => (
            <div key={i} className="text-xs text-[var(--color-red)] mt-0.5">
              {issue.severity === 'error' ? 'ERROR' : 'WARNING'}: {issue.issue}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.entries(trace.inputData).map(([key, value]) => (
          <div key={key} className="p-2.5 rounded-md bg-gray-50 border border-[var(--color-grid)]">
            <div className="text-[10px] font-mono-lab text-gray-400 uppercase">{key}</div>
            <div className="text-sm font-mono-lab mt-0.5">
              {value === null || value === undefined ? (
                <span className="text-[var(--color-red)] italic">null (missing)</span>
              ) : (
                String(value)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidatesStage({ trace }: { trace: DecisionTrace }) {
  return (
    <div>
      <StageHeader title="Candidate Actions" subtitle="All actions considered by the decision engine" />
      <div className="space-y-2">
        {trace.candidateActions.map((a) => (
          <div key={a.actionId} className="flex items-center gap-3 p-2.5 rounded-md bg-gray-50">
            <div className={`w-2 h-2 rounded-full ${a.eligible ? 'bg-[var(--color-green)]' : 'bg-gray-300'}`} />
            <span className="text-sm font-mono-lab flex-1">{a.actionId}</span>
            <span className="text-sm">{a.actionName}</span>
            <span className={`text-xs ${a.eligible ? 'text-[var(--color-green)]' : 'text-gray-400'}`}>
              {a.eligible ? 'eligible' : 'ineligible'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesStage({ trace }: { trace: DecisionTrace }) {
  return (
    <div>
      <StageHeader title="Rules Evaluated" subtitle="Each rule, its condition, priority, and whether it matched" />
      <div className="space-y-2">
        {trace.ruleEvaluations.map((re) => (
          <div
            key={re.ruleId}
            className={`p-3 rounded-md border ${
              re.matched
                ? 'border-[var(--color-cobalt)]/30 bg-[var(--color-cobalt-pale)]/30'
                : 'border-[var(--color-grid)] bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`lab-tag ${re.classification === 'hard' ? 'lab-tag-hard' : 'lab-tag-soft'}`}>
                {re.classification}
              </span>
              <span className="text-sm font-semibold">{re.ruleName}</span>
              <span className="text-[10px] font-mono-lab text-gray-400">P{re.priority}</span>
              <div className="flex-1" />
              {re.matched ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--color-cobalt)]" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-300" />
              )}
            </div>
            <div className="text-xs text-gray-600 ml-1">{re.explanation}</div>
            {re.matched && (
              <div className="mt-1.5 ml-1 text-[11px] font-mono-lab text-[var(--color-cobalt)]">
                {re.conditionResults.length} condition(s) · gate: {re.conditionResults.length > 0 ? 'see below' : 'N/A'}
              </div>
            )}
            <div className="mt-1 space-y-0.5">
              {re.conditionResults.map((cr, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono-lab ml-1">
                  <span className={cr.matched ? 'text-[var(--color-green)]' : 'text-gray-400'}>
                    {cr.matched ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-500">
                    {cr.condition.field} {cr.condition.operator}{' '}
                    {cr.condition.value !== undefined
                      ? String(cr.condition.value)
                      : cr.condition.rangeMin !== undefined
                      ? `[${cr.condition.rangeMin}, ${cr.condition.rangeMax}]`
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {trace.ruleEvaluations.length === 0 && (
          <p className="text-sm text-gray-400 italic">No rules were evaluated.</p>
        )}
      </div>
    </div>
  );
}

function ConstraintsStage({ trace }: { trace: DecisionTrace }) {
  const violated = trace.constraintChecks.filter((c) => !c.satisfied);
  const satisfied = trace.constraintChecks.filter((c) => c.satisfied);

  return (
    <div>
      <StageHeader title="Constraints Checked" subtitle="Hard constraints verified against each candidate action" />
      {violated.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-[var(--color-red)]" />
            <span className="text-sm font-semibold text-[var(--color-red)]">Violated ({violated.length})</span>
          </div>
          <div className="space-y-1">
            {violated.map((c, i) => (
              <div key={i} className="p-2 rounded-md bg-[var(--color-red-pale)] text-xs">
                <span className="font-mono-lab">{c.actionId}</span>: {c.explanation}
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
          <span className="text-sm font-semibold text-[var(--color-green)]">Satisfied ({satisfied.length})</span>
        </div>
        <div className="space-y-1">
          {satisfied.map((c, i) => (
            <div key={i} className="p-2 rounded-md bg-[var(--color-green-pale)]/40 text-xs text-gray-600">
              <span className="font-mono-lab">{c.actionId}</span>: {c.explanation}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreStage({ trace }: { trace: DecisionTrace }) {
  return (
    <div>
      <StageHeader title="Intermediate Calculations" subtitle="Normalized values, weighted contributions, and final scores" />
      <div className="mb-3 p-3 rounded-md bg-[var(--color-paper-warm)] text-xs">
        <div className="font-mono-lab font-semibold mb-1">Formula</div>
        <div className="font-mono-lab text-[var(--color-cobalt)]">{trace.formula}</div>
        <div className="mt-2 text-gray-600 text-[11px]">{trace.normalizationMethod}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-grid)]">
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Action</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-600">Raw Metrics</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-600">Normalized</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-600">Weighted</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-600">Adjustments</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-600">Final Score</th>
            </tr>
          </thead>
          <tbody>
            {trace.scoreBreakdowns.map((s) => (
              <tr
                key={s.actionId}
                className={`border-b border-[var(--color-grid)] ${
                  s.actionId === trace.selectedActionId ? 'bg-[var(--color-cobalt-pale)]' : s.rejected ? 'opacity-40' : ''
                }`}
              >
                <td className="py-2 px-2">
                  <div className="font-mono-lab text-[11px]">{s.actionId}</div>
                  {s.rejected && <div className="text-[10px] text-[var(--color-red)]">{s.rejectionReason}</div>}
                </td>
                <td className="py-2 px-2 text-right font-mono-lab text-[11px]">
                  {Object.entries(s.metricValues).map(([k, v]) => (
                    <div key={k}>{k}: {v.toFixed(2)}</div>
                  ))}
                </td>
                <td className="py-2 px-2 text-right font-mono-lab text-[11px]">
                  {Object.entries(s.normalizedMetrics).map(([k, v]) => (
                    <div key={k}>{v.toFixed(3)}</div>
                  ))}
                </td>
                <td className="py-2 px-2 text-right font-mono-lab text-[11px]">
                  {Object.entries(s.weightedContributions).map(([k, v]) => (
                    <div key={k}>{v.toFixed(3)}</div>
                  ))}
                </td>
                <td className="py-2 px-2 text-right font-mono-lab text-[11px]">
                  {Object.entries(s.ruleAdjustments).map(([k, v]) => (
                    <div key={k} className={v >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}>
                      {v >= 0 ? '+' : ''}{v.toFixed(2)}
                    </div>
                  ))}
                </td>
                <td className="py-2 px-2 text-right font-mono-lab font-bold text-sm">
                  {s.rejected ? '—' : s.finalScore.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DecisionStage({ trace }: { trace: DecisionTrace }) {
  if (trace.infeasible) {
    return (
      <div>
        <StageHeader title="Decision: Infeasible" subtitle="No action could satisfy all hard constraints" />
        <div className="p-4 rounded-md bg-[var(--color-red-pale)] border border-[var(--color-red)]/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-[var(--color-red)]" />
            <span className="font-semibold text-[var(--color-red)]">No feasible action exists</span>
          </div>
          <ul className="text-sm text-[var(--color-red)] space-y-1">
            {trace.infeasibilityReasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const selected = trace.scoreBreakdowns.find((s) => s.actionId === trace.selectedActionId);
  const rejected = trace.scoreBreakdowns.filter((s) => s.rejected);

  return (
    <div>
      <StageHeader title="Selected Action" subtitle="Why this action was chosen over alternatives" />
      <div className="p-4 rounded-md bg-[var(--color-cobalt-pale)] border border-[var(--color-cobalt)]/20 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-[var(--color-cobalt)]" />
          <span className="text-lg font-bold">{trace.selectedActionName}</span>
        </div>
        <div className="text-sm text-gray-600">
          Final score: <span className="font-mono-lab font-bold">{selected?.finalScore.toFixed(3)}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Selected as the highest-scoring feasible action. Ties broken by alphabetical action ID (deterministic).
        </div>
      </div>

      {rejected.length > 0 && (
        <div>
          <div className="lab-section-title mb-2">Rejected Alternatives</div>
          <div className="space-y-1.5">
            {rejected.map((s) => (
              <div key={s.actionId} className="flex items-center gap-2 p-2 rounded-md bg-gray-50 text-xs">
                <XCircle className="w-3.5 h-3.5 text-gray-300" />
                <span className="font-mono-lab">{s.actionId}</span>
                <span className="text-gray-500">{s.actionName}</span>
                <span className="text-[var(--color-red)] ml-auto">{s.rejectionReason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OutcomeStage({ trace }: { trace: DecisionTrace }) {
  return (
    <div>
      <StageHeader title="Outcome Evaluation" subtitle="How the selected action measures against the scenario's criteria" />
      <div className="space-y-2">
        {trace.outcomeEvaluation.map((e) => (
          <div
            key={e.criterionId}
            className={`p-3 rounded-md border ${
              e.passed
                ? 'border-[var(--color-green)]/20 bg-[var(--color-green-pale)]/30'
                : 'border-[var(--color-amber)]/30 bg-[var(--color-amber-pale)]/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {e.passed ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[var(--color-amber)]" />
              )}
              <span className="text-sm font-semibold">{e.criterionName}</span>
              <div className="flex-1" />
              <span className="font-mono-lab text-sm">
                {e.value.toFixed(2)}{e.unit ?? ''}
                {e.target !== undefined && (
                  <span className="text-gray-400 ml-1">/ {e.target}{e.unit ?? ''}</span>
                )}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">{e.explanation}</div>
          </div>
        ))}
        {trace.outcomeEvaluation.length === 0 && (
          <p className="text-sm text-gray-400 italic">No evaluation criteria defined.</p>
        )}
      </div>
    </div>
  );
}

function BlindSpotsStage({ trace }: { trace: DecisionTrace }) {
  return (
    <div>
      <StageHeader title="Potential Blind Spots" subtitle="Factors not represented in the model or criteria that failed" />
      <div className="space-y-2">
        {trace.blindSpots.map((bs, i) => (
          <div key={i} className="flex items-start gap-2 p-3 rounded-md bg-[var(--color-amber-pale)]/40 border border-[var(--color-amber)]/20">
            <Info className="w-4 h-4 text-[var(--color-amber)] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[var(--color-ink-soft)]">{bs}</span>
          </div>
        ))}
        {trace.blindSpots.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--color-green-pale)]/30">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
            <span className="text-sm text-[var(--color-green)]">No blind spots detected in this decision.</span>
          </div>
        )}
      </div>
    </div>
  );
}
