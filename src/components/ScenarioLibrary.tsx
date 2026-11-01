import { useLab } from '@/context/LabContext';
import { scenarios } from '@/scenarios';
import { ChevronRight, Beaker, ArrowRight } from 'lucide-react';
import type { ViewId } from '@/components/Sidebar';

export function ScenarioLibrary({ onNavigate }: { onNavigate: (id: ViewId) => void }) {
  const { setCurrentScenarioId } = useLab();

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">SCENARIO LIBRARY</div>
        <h1 className="text-2xl font-bold tracking-tight">Scenario Library</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Six fictional scenarios, each with its own objectives, constraints, and evaluation criteria.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((s, idx) => (
          <div key={s.id} className="lab-card p-5 flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-[var(--color-cobalt-pale)] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--color-cobalt)] font-mono-lab">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">{s.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{s.tagline}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-3 flex-1">{s.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="lab-tag lab-tag-hard">{s.defaultConstraints.length} constraints</span>
              <span className="lab-tag lab-tag-soft">{s.defaultRules.length} rules</span>
              <span className="lab-tag" style={{ background: 'var(--color-cobalt-pale)', color: 'var(--color-cobalt)' }}>
                {s.candidateActions.length} actions
              </span>
              <span className="lab-tag" style={{ background: 'var(--color-green-pale)', color: 'var(--color-green)' }}>
                {s.testInputs.length} test inputs
              </span>
            </div>
            <p className="text-[10px] text-gray-400 italic mb-3">{s.disclaimer}</p>
            <button
              onClick={() => {
                setCurrentScenarioId(s.id);
                onNavigate('lab');
              }}
              className="lab-btn-primary text-xs justify-center"
            >
              Open in Laboratory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
