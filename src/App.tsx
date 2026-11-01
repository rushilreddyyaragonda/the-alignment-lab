import { useState } from 'react';
import { LabProvider } from '@/context/LabContext';
import { Sidebar, type ViewId } from '@/components/Sidebar';
import { Laboratory } from '@/components/Laboratory';
import { ScenarioLibrary } from '@/components/ScenarioLibrary';
import { RuleArchitect } from '@/components/RuleArchitect';
import { DecisionTraceView } from '@/components/DecisionTraceView';
import { AdversarialTesting } from '@/components/AdversarialTesting';
import { FairnessObservatory } from '@/components/FairnessObservatory';
import { ExperimentJournal } from '@/components/ExperimentJournal';
import { Tutorial } from '@/components/Tutorial';
import { DeveloperSection } from '@/components/DeveloperSection';
import { Methodology } from '@/components/Methodology';

function App() {
  const [view, setView] = useState<ViewId>('lab');

  const renderView = () => {
    switch (view) {
      case 'lab':
        return <Laboratory />;
      case 'scenarios':
        return <ScenarioLibrary onNavigate={setView} />;
      case 'ruleArchitect':
        return <RuleArchitect />;
      case 'decisionTrace':
        return <DecisionTraceView />;
      case 'adversarial':
        return <AdversarialTesting />;
      case 'fairness':
        return <FairnessObservatory />;
      case 'journal':
        return <ExperimentJournal />;
      case 'tutorial':
        return <Tutorial onNavigate={setView} />;
      case 'developer':
        return <DeveloperSection />;
      case 'methodology':
        return <Methodology />;
      default:
        return <Laboratory />;
    }
  };

  return (
    <LabProvider>
      <div className="flex min-h-screen bg-[var(--color-paper)]">
        <Sidebar current={view} onNavigate={setView} />
        <main className="flex-1 min-w-0 lab-grid-bg">
          {renderView()}
        </main>
      </div>
    </LabProvider>
  );
}

export default App;
