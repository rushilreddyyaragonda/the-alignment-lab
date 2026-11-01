import { useState } from 'react';
import { useLab } from '@/context/LabContext';
import { scenarios } from '@/scenarios';
import { runBatch } from '@/engine/decisionEngine';
import {
  Play,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import type { ViewId } from '@/components/Sidebar';
import type { Rule, Constraint, ObjectiveComponent } from '@/types';

export function Tutorial({ onNavigate }: { onNavigate: (id: ViewId) => void }) {
  const { setTutorialCompleted, preferences } = useLab();
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<import('@/types').DecisionResult[] | null>(null);
  const [constraintAdded, setConstraintAdded] = useState(false);

  const scenario = scenarios[3]; // Public Resource Allocator

  // Two policies: original (efficiency-only) and modified (with min coverage constraint)
  const originalPolicy = {
    id: 'tutorial_original',
    name: 'Efficiency-Only Policy',
    scenarioId: scenario.id,
    rules: scenario.defaultRules.map((r) => ({ ...r })),
    objectives: scenario.defaultObjectives.map((o) => ({ ...o })),
    constraints: scenario.defaultConstraints.map((c) => ({ ...c })),
    weights: { ...scenario.defaultWeights },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };

  const modifiedPolicy = constraintAdded
    ? {
        ...originalPolicy,
        id: 'tutorial_modified',
        name: 'Efficiency + Min Coverage Policy',
        constraints: [
          ...originalPolicy.constraints,
          {
            id: 'tutorial_min_coverage',
            name: 'Minimum Coverage Guarantee',
            description: 'Every district must receive at least medium allocation',
            actionField: 'coverage',
            operator: 'gte' as const,
            value: 0.4,
          },
        ],
        weights: { service_output: 0.8, coverage: 0.2 },
      }
    : originalPolicy;

  const steps = [
    { title: 'Welcome to The Alignment Lab', desc: 'This tutorial shows how a system can follow its rules and still make the wrong decision.' },
    { title: 'Inspect the Objective', desc: 'The policy maximizes total service output. This means it favors giving large allocations to high-capacity districts.' },
    { title: 'Run the Original Policy', desc: 'See how the efficiency-focused policy distributes resources across 6 districts.' },
    { title: 'Review the Results', desc: 'Notice that some districts receive no allocation at all, even though they have high need.' },
    { title: 'Add a Minimum Coverage Constraint', desc: 'Add a hard constraint requiring every district to receive at least a low allocation.' },
    { title: 'Rerun and Compare', desc: 'The modified policy reduces total output slightly but ensures no district is left with zero coverage.' },
  ];

  const handleRun = () => {
    const batchResults = runBatch(scenario.testInputs, modifiedPolicy, scenario);
    setResults(batchResults);
  };

  const handleAddConstraint = () => {
    setConstraintAdded(true);
    setResults(null);
  };

  const handleReset = () => {
    setStep(0);
    setResults(null);
    setConstraintAdded(false);
  };

  const handleFinish = () => {
    setTutorialCompleted(true);
    onNavigate('lab');
  };

  const districts = scenario.testInputs;
  const getDecision = (inputId: string) =>
    results?.find((r) => r.input.id === inputId);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">TUTORIAL</div>
        <h1 className="text-2xl font-bold tracking-tight">Interactive Tutorial</h1>
        <p className="text-gray-600 mt-1 text-sm">
          A guided walkthrough using the Public Resource Allocator scenario.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? 'w-8 bg-[var(--color-cobalt)]' : i < step ? 'w-4 bg-[var(--color-cobalt)]/40' : 'w-4 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Current step */}
      <div className="lab-card p-6 mb-4">
        <h2 className="text-lg font-bold mb-2">
          Step {step + 1}: {steps[step].title}
        </h2>
        <p className="text-sm text-gray-600 mb-4">{steps[step].desc}</p>

        {/* Step content */}
        {step === 0 && (
          <div className="p-4 rounded-md bg-[var(--color-paper-warm)] text-sm">
            <p className="mb-2">
              <strong>Can a machine follow its rules and still make the wrong decision?</strong>
            </p>
            <p className="text-gray-600">
              This tutorial demonstrates how a policy that satisfies its formal objective — maximizing total output —
              can produce outcomes that leave some groups with insufficient coverage. You'll then add a constraint
              and see how the results change.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-[var(--color-cobalt-pale)]/40">
              <div className="lab-section-title mb-1">Objective Weights</div>
              {scenario.defaultObjectives.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm py-1">
                  <span>{o.name}</span>
                  <span className="font-mono-lab text-xs">
                    {scenario.defaultWeights[o.metricKey]?.toFixed(2)} ({o.direction})
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              The policy heavily weights total service output. This means it will prefer high allocations
              for districts where resources produce the most output — potentially leaving low-capacity districts with nothing.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Click "Run" below to execute the decision system against all 6 districts.
              {!constraintAdded && ' The current policy has no minimum coverage guarantee.'}
            </p>
            <button onClick={handleRun} className="lab-btn-primary">
              <Play className="w-4 h-4" /> Run Decision System
            </button>
          </div>
        )}

        {step === 3 && results && (
          <div className="space-y-2">
            {districts.map((d) => {
              const r = getDecision(d.id);
              const action = r?.trace.selectedActionName ?? 'INFEASIBLE';
              const coverage = r?.trace.scoreBreakdowns.find((s) => s.actionId === r.trace.selectedActionId)?.metricValues.coverage;
              const noAllocation = action?.includes('No Allocation');
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 p-3 rounded-md ${
                    noAllocation ? 'bg-[var(--color-red-pale)]/40' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-xs font-mono-lab flex-1">{d.data.districtId}</span>
                  <span className="text-xs text-gray-500">Need: {d.data.needLevel}</span>
                  <span className="text-xs text-gray-500">Cap: {d.data.capacity}</span>
                  <span className="text-sm font-semibold flex-1 text-right">{action}</span>
                  {noAllocation && (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-amber)]" />
                  )}
                </div>
              );
            })}
            <div className="p-3 rounded-md bg-[var(--color-amber-pale)]/40 mt-3">
              <p className="text-xs text-[var(--color-ink-soft)]">
                <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] inline mr-1" />
                Notice: some districts received no allocation, even though they had high need.
                The policy followed its rules (maximize output) but produced an undesirable distribution.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Add a hard constraint requiring every district to receive at least a low allocation
              (coverage ≥ 0.40). This prevents the system from giving zero resources to any district.
            </p>
            <div className={`p-3 rounded-md border ${constraintAdded ? 'border-[var(--color-green)]/30 bg-[var(--color-green-pale)]/30' : 'border-[var(--color-grid)]'}`}>
              <div className="flex items-center gap-2">
                {constraintAdded ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-300" />
                )}
                <span className="text-sm font-medium">
                  Minimum Coverage Guarantee: coverage ≥ 0.40
                </span>
              </div>
            </div>
            {!constraintAdded ? (
              <button onClick={handleAddConstraint} className="lab-btn-primary">
                Add Minimum Coverage Constraint
              </button>
            ) : (
              <p className="text-xs text-[var(--color-green)]">Constraint added! Now rerun the policy to see the difference.</p>
            )}
          </div>
        )}

        {step === 5 && results && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-2">
              {constraintAdded
                ? 'With the minimum coverage constraint, every district now receives at least a low allocation.'
                : 'Run the modified policy to see the difference.'}
            </p>
            {districts.map((d) => {
              const r = getDecision(d.id);
              const action = r?.trace.selectedActionName ?? 'INFEASIBLE';
              const noAllocation = action?.includes('No Allocation');
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 p-3 rounded-md ${
                    noAllocation ? 'bg-[var(--color-red-pale)]/40' : 'bg-[var(--color-green-pale)]/30'
                  }`}
                >
                  <span className="text-xs font-mono-lab flex-1">{d.data.districtId}</span>
                  <span className="text-sm font-semibold flex-1 text-right">{action}</span>
                  {noAllocation ? (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-amber)]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-green)]" />
                  )}
                </div>
              );
            })}
            <div className="p-3 rounded-md bg-[var(--color-green-pale)]/30 mt-3">
              <p className="text-xs text-[var(--color-ink-soft)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-green)] inline mr-1" />
                The constraint slightly reduces total output, but no district is left with zero coverage.
                This is the central lesson: a system can optimize its objective while producing undesirable
                outcomes — and a well-designed constraint can fix it.
              </p>
            </div>
          </div>
        )}

        {(step === 3 || step === 5) && !results && (
          <button onClick={handleRun} className="lab-btn-primary">
            <Play className="w-4 h-4" /> Run Decision System
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="lab-btn-secondary text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Restart Tutorial
        </button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="lab-btn-secondary text-xs"
            >
              Previous
            </button>
          )}
          {step < steps.length - 1 && (
            <button
              onClick={() => setStep(step + 1)}
              className="lab-btn-primary text-xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {step === steps.length - 1 && (
            <button onClick={handleFinish} className="lab-btn-primary text-xs">
              Enter Laboratory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {preferences.tutorialCompleted && (
        <p className="text-xs text-gray-400 mt-4 text-center">You've already completed the tutorial.</p>
      )}
    </div>
  );
}
