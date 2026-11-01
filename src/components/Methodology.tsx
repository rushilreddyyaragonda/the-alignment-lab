import { BookOpen } from 'lucide-react';

export function Methodology() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">METHODOLOGY</div>
        <h1 className="text-2xl font-bold tracking-tight">Methodology & Limitations</h1>
        <p className="text-gray-600 mt-1 text-sm">
          How the decision engine works, how tests are constructed, and what the results can and cannot tell you.
        </p>
      </div>

      <div className="space-y-4">
        <Section title="Input Validation">
          <p>Each input record is validated against the scenario's input schema before processing. Required fields must be present, numeric fields must be valid numbers within defined ranges, and enum fields must contain allowed values. Invalid inputs are reported explicitly with field-level error messages — the engine never silently converts missing or invalid values into arbitrary defaults.</p>
        </Section>

        <Section title="Candidate Generation">
          <p>The engine collects all candidate actions defined by the scenario that are marked as eligible. Each action has defined attributes (cost, coverage, risk level, etc.) that are used in subsequent scoring and constraint checks.</p>
        </Section>

        <Section title="Rule Evaluation">
          <p>Rules are evaluated in priority order (highest first). Each rule contains a condition group with a logical gate (AND or OR) and one or more conditions. Conditions compare input fields against specified values using operators (equals, greater than, in range, is present, etc.). Only enabled rules are evaluated. Rule effects can exclude actions, require actions, adjust scores, set scores, or flag inputs. No user-supplied code is ever evaluated — the system uses structured condition matching exclusively.</p>
        </Section>

        <Section title="Hard Constraint Enforcement">
          <p>Hard constraints are checked against each candidate action's attributes. Actions that violate any hard constraint are removed from the feasible set. If no action satisfies all constraints, the engine reports an explicit infeasible result with the reasons — it never silently relaxes a constraint to produce an answer.</p>
        </Section>

        <Section title="Objective Score Calculation">
          <p>For each feasible action, the engine calculates raw metric values using scenario-specific metric calculators. These values are then normalized using min-max normalization across the set of feasible actions. For maximize objectives: norm(x) = (x - min) / (max - min). For minimize objectives: norm(x) = 1 - (x - min) / (max - min). When all values are equal, normalization returns 1. The final score is the weighted sum of normalized values plus any rule-based score adjustments.</p>
        </Section>

        <Section title="Tie-Breaking">
          <p>When two or more feasible actions have identical final scores, the engine selects the action with the alphabetically smallest action ID. This ensures deterministic, reproducible decisions — the same input and policy will always produce the same output.</p>
        </Section>

        <Section title="Decision Trace Generation">
          <p>Every decision produces a structured trace containing: the input data, validation issues, candidate actions, rule evaluation results (with per-condition match status), constraint check results, score breakdowns (raw metrics, normalized values, weighted contributions, adjustments, final score), the selected action, rejected alternatives with reasons, outcome evaluation against scenario criteria, and identified blind spots. The trace is generated from actual execution state, not constructed after the fact.</p>
        </Section>

        <Section title="Adversarial Test Construction">
          <p>The edge-case generator produces inputs using a seeded random generator (mulberry32) for reproducibility. It generates boundary cases (at min/max thresholds), missing-data cases (null values for required fields), extreme-value cases, enum-exhaustion cases, constraint-conflict cases, and determinism cases (identical inputs). Test assertions check hard constraint compliance, input rejection, decision determinism, and budget compliance.</p>
        </Section>

        <Section title="Evaluation Metrics">
          <p>Evaluation criteria are scenario-specific. Each criterion references a metric calculator and has a direction (maximize, minimize, or equalize) and optional target value. Metrics are calculated from the actual selected action's attributes and input data — not from hardcoded or estimated values. Group-level metrics compare outcomes across defined groups (e.g., districts, demographic tracks) using the scenario's group field.</p>
        </Section>

        <div className="lab-card p-5 border-[var(--color-amber)]/30 bg-[var(--color-amber-pale)]/20">
          <h3 className="font-bold text-sm mb-3 text-[var(--color-amber)]">Limitations</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>The application uses transparent, predefined decision rules and synthetic scenarios. Its conclusions are limited by the objectives, constraints, data, and metrics chosen by the user.</li>
            <li>A policy that passes all programmed tests is not necessarily safe, fair, or appropriate for real-world deployment.</li>
            <li>A fairness metric cannot capture every ethical consideration.</li>
            <li>The application does not establish a universal moral standard and must not be presented as a production decision-making system for hiring, healthcare, emergency response, finance, or other high-stakes applications.</li>
            <li>Its purpose is to support learning, experimentation, and critical examination of algorithmic behavior.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lab-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-[var(--color-cobalt)]" />
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}
