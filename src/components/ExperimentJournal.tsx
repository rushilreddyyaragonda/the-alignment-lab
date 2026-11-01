import { useState, useMemo } from 'react';
import { useLab } from '@/context/LabContext';
import { loadJournalEntries, saveJournalEntry, deleteJournalEntry } from '@/engine/storage';
import { NotebookPen, Plus, Trash2, Download, Search } from 'lucide-react';
import type { JournalEntry } from '@/types';

const TEMPLATE: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
  title: 'New Experiment',
  researchQuestion: 'Can a policy satisfy all formal constraints while systematically producing an undesirable distribution of outcomes?',
  hypothesis: 'A policy optimized for aggregate performance may produce different group-level outcomes from a policy with explicit distributional constraints.',
  scenarioId: '',
  policyId: '',
  policyName: '',
  testDatasetLabel: '',
  constraints: '',
  results: '',
  observations: '',
  limitations: '',
  conclusion: '',
  nextSteps: '',
};

export function ExperimentJournal() {
  const { currentScenario, currentPolicy } = useLab();
  const [entries, setEntries] = useState<JournalEntry[]>(loadJournalEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.researchQuestion.toLowerCase().includes(q) ||
        e.hypothesis.toLowerCase().includes(q) ||
        e.conclusion.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const createEntry = () => {
    const entry: JournalEntry = {
      ...TEMPLATE,
      id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      scenarioId: currentScenario?.id ?? '',
      policyId: currentPolicy?.id ?? '',
      policyName: currentPolicy?.name ?? '',
      testDatasetLabel: currentScenario ? `${currentScenario.testInputs.length} inputs` : '',
      constraints: currentPolicy?.constraints.map((c) => c.name).join(', ') ?? '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveJournalEntry(entry);
    setEntries([entry, ...entries]);
    setEditingId(entry.id);
  };

  const updateEntry = (id: string, updates: Partial<JournalEntry>) => {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    setEntries(updated);
    const entry = updated.find((e) => e.id === id);
    if (entry) saveJournalEntry(entry);
  };

  const removeEntry = (id: string) => {
    if (!confirm('Delete this journal entry?')) return;
    deleteJournalEntry(id);
    setEntries(entries.filter((e) => e.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const exportEntry = (entry: JournalEntry, format: 'markdown' | 'json') => {
    let content: string;
    let mime: string;
    if (format === 'markdown') {
      content = `# ${entry.title}\n\n**Research Question:** ${entry.researchQuestion}\n\n**Hypothesis:** ${entry.hypothesis}\n\n**Scenario:** ${entry.scenarioId}\n\n**Policy:** ${entry.policyName}\n\n**Test Dataset:** ${entry.testDatasetLabel}\n\n**Constraints:** ${entry.constraints}\n\n## Results\n${entry.results}\n\n## Observations\n${entry.observations}\n\n## Limitations\n${entry.limitations}\n\n## Conclusion\n${entry.conclusion}\n\n## Next Steps\n${entry.nextSteps}\n`;
      mime = 'text/markdown';
    } else {
      content = JSON.stringify(entry, null, 2);
      mime = 'application/json';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.title.replace(/\s+/g, '_')}.${format === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const editing = entries.find((e) => e.id === editingId);

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2 font-mono-lab">EXPERIMENT JOURNAL</div>
        <h1 className="text-2xl font-bold tracking-tight">Experiment Journal</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Document hypotheses, experiments, observations, and conclusions. Distinguish computed results from interpretation.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={createEntry} className="lab-btn-primary">
          <Plus className="w-4 h-4" /> New Entry
        </button>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="lab-input pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Entry list */}
        <div className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e.id}
              onClick={() => setEditingId(e.id)}
              className={`lab-card p-3 cursor-pointer ${editingId === e.id ? 'lab-card-active' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold truncate flex-1">{e.title}</span>
                <button
                  onClick={(ev) => { ev.stopPropagation(); removeEntry(e.id); }}
                  className="p-1 rounded hover:bg-[var(--color-red-pale)]"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-[var(--color-red)]" />
                </button>
              </div>
              <p className="text-xs text-gray-500 truncate">{e.researchQuestion}</p>
              <div className="text-[10px] font-mono-lab text-gray-400 mt-1">
                {new Date(e.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="lab-card p-6 text-center text-gray-400">
              <NotebookPen className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No entries yet.</p>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {editing ? (
            <div className="lab-card p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <span className="lab-section-title">Editing Entry</span>
                <div className="flex gap-1">
                  <button onClick={() => exportEntry(editing, 'markdown')} className="lab-btn-secondary text-xs px-2 py-1">
                    <Download className="w-3 h-3" /> MD
                  </button>
                  <button onClick={() => exportEntry(editing, 'json')} className="lab-btn-secondary text-xs px-2 py-1">
                    <Download className="w-3 h-3" /> JSON
                  </button>
                </div>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto lab-scrollbar pr-2">
                <Field label="Experiment Title">
                  <input type="text" value={editing.title} onChange={(e) => updateEntry(editing.id, { title: e.target.value })} className="lab-input" />
                </Field>
                <Field label="Research Question">
                  <textarea value={editing.researchQuestion} onChange={(e) => updateEntry(editing.id, { researchQuestion: e.target.value })} className="lab-input resize-none" rows={2} />
                </Field>
                <Field label="Hypothesis">
                  <textarea value={editing.hypothesis} onChange={(e) => updateEntry(editing.id, { hypothesis: e.target.value })} className="lab-input resize-none" rows={2} />
                </Field>
                <Field label="Scenario">
                  <input type="text" value={editing.scenarioId} onChange={(e) => updateEntry(editing.id, { scenarioId: e.target.value })} className="lab-input" />
                </Field>
                <Field label="Policy">
                  <input type="text" value={editing.policyName} onChange={(e) => updateEntry(editing.id, { policyName: e.target.value })} className="lab-input" />
                </Field>
                <Field label="Test Dataset">
                  <input type="text" value={editing.testDatasetLabel} onChange={(e) => updateEntry(editing.id, { testDatasetLabel: e.target.value })} className="lab-input" />
                </Field>
                <Field label="Constraints">
                  <input type="text" value={editing.constraints} onChange={(e) => updateEntry(editing.id, { constraints: e.target.value })} className="lab-input" />
                </Field>
                <Field label="Results (computed)">
                  <textarea value={editing.results} onChange={(e) => updateEntry(editing.id, { results: e.target.value })} className="lab-input resize-none" rows={3} />
                </Field>
                <Field label="Observations (interpretation)">
                  <textarea value={editing.observations} onChange={(e) => updateEntry(editing.id, { observations: e.target.value })} className="lab-input resize-none" rows={3} />
                </Field>
                <Field label="Limitations">
                  <textarea value={editing.limitations} onChange={(e) => updateEntry(editing.id, { limitations: e.target.value })} className="lab-input resize-none" rows={2} />
                </Field>
                <Field label="Conclusion">
                  <textarea value={editing.conclusion} onChange={(e) => updateEntry(editing.id, { conclusion: e.target.value })} className="lab-input resize-none" rows={2} />
                </Field>
                <Field label="Next Steps">
                  <textarea value={editing.nextSteps} onChange={(e) => updateEntry(editing.id, { nextSteps: e.target.value })} className="lab-input resize-none" rows={2} />
                </Field>
              </div>
            </div>
          ) : (
            <div className="lab-card p-8 text-center text-gray-400 sticky top-6">
              <NotebookPen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select an entry to edit, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}
