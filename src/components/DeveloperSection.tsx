import { FlaskConical, Mail, GraduationCap, School, Code2, AlertTriangle, BookOpen } from 'lucide-react';

export function DeveloperSection() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">DEVELOPER</div>
        <h1 className="text-2xl font-bold tracking-tight">Behind The Alignment Lab</h1>
      </div>

      {/* Introduction */}
      <div className="lab-card p-6 mb-4 bg-[var(--color-paper-warm)]">
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed italic">
          "The Alignment Lab explores how programmed objectives, decision rules, and constraints shape
          the behavior of automated systems. Through interactive experiments and explainable decision
          traces, the project investigates how systems can follow their formal specifications while
          producing outcomes that deserve further scrutiny."
        </p>
      </div>

      {/* Developer info */}
      <div className="lab-card p-5 mb-4">
        <div className="lab-section-title mb-3">Developer</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Developer" value="Rushil Reddy Yaragonda" />
          <InfoRow icon={<School className="w-4 h-4" />} label="School" value="UIA International School of Tokyo, Tokyo" />
          <InfoRow icon={<BookOpen className="w-4 h-4" />} label="Academic Field" value="Computer Science" />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value="rushil2626reddy@gmail.com" />
        </div>
        <a
          href="mailto:rushil2626reddy@gmail.com"
          className="lab-btn-secondary text-xs mt-4 inline-flex"
        >
          <Mail className="w-3.5 h-3.5" /> Contact
        </a>
      </div>

      {/* Architecture */}
      <div className="lab-card p-5 mb-4">
        <div className="lab-section-title mb-3">Decision-Engine Architecture</div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            The decision engine processes each input through a deterministic 8-stage pipeline:
            input validation, candidate generation, rule evaluation, constraint checking,
            objective calculation, decision selection, outcome evaluation, and decision explanation.
          </p>
          <p>
            Rules are structured conditions with logical gates (AND/OR), comparison operators, and
            effects (score adjustments, action exclusions, or requirements). Hard rules can exclude
            or require specific actions, while soft rules adjust scores.
          </p>
          <p>
            Objective scores are calculated using min-max normalization across feasible candidates,
            then combined with user-configured weights. Ties are broken deterministically by
            alphabetical action ID ordering.
          </p>
        </div>
      </div>

      {/* Methodology highlights */}
      <div className="lab-card p-5 mb-4">
        <div className="lab-section-title mb-3">Methodology</div>
        <div className="space-y-2">
          <MethodRow title="Input Validation" desc="Required fields, type checking, range validation, enum membership" />
          <MethodRow title="Rule Evaluation" desc="Structured conditions with AND/OR gates, no eval() or arbitrary code execution" />
          <MethodRow title="Constraint Handling" desc="Hard constraints enforced separately from weighted preferences; infeasible results reported explicitly" />
          <MethodRow title="Objective Scoring" desc="Min-max normalization, weighted combination, documented formula per decision" />
          <MethodRow title="Adversarial Testing" desc="Seeded edge-case generation covering boundary, missing-data, extreme-value, and determinism cases" />
          <MethodRow title="Fairness Analysis" desc="Scenario-specific metrics, group-level comparison, trade-off visualization — no universal fairness formula" />
        </div>
      </div>

      {/* Limitations */}
      <div className="lab-card p-5 mb-4 border-[var(--color-amber)]/30">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[var(--color-amber)]" />
          <span className="lab-section-title">Known Limitations</span>
        </div>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="text-[var(--color-amber)]">•</span>
            The application uses transparent, predefined decision rules and synthetic scenarios. Its conclusions are limited by the objectives, constraints, data, and metrics chosen by the user.
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-amber)]">•</span>
            A policy that passes all programmed tests is not necessarily safe, fair, or appropriate for real-world deployment.
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-amber)]">•</span>
            A fairness metric cannot capture every ethical consideration.
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-amber)]">•</span>
            The application does not establish a universal moral standard and must not be presented as a production decision-making system.
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-amber)]">•</span>
            Local data is device-specific and may be lost if browser site data is cleared.
          </li>
        </ul>
      </div>

      {/* Future directions */}
      <div className="lab-card p-5 mb-4">
        <div className="lab-section-title mb-3">Future Research Directions</div>
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li>• Multi-step sequential decision processes</li>
          <li>• Probabilistic and uncertain-input handling</li>
          <li>• More sophisticated fairness metrics and Pareto frontier analysis</li>
          <li>• Scenario sharing and collaborative experiment review</li>
          <li>• Integration with external verification tools</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mt-6 mb-4">
        <p className="font-mono-lab">The Alignment Lab · v1.0</p>
        <p className="mt-1">Original student-built investigation into decision systems and responsible software engineering.</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <div>
        <div className="text-[10px] text-gray-400 uppercase font-semibold">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function MethodRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-sm font-semibold min-w-[160px]">{title}</div>
      <div className="text-xs text-gray-500 flex-1">{desc}</div>
    </div>
  );
}
