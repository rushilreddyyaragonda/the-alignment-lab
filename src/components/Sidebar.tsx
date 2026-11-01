import { useState } from 'react';
import { FlaskConical, BookOpen, Wrench, GitBranch, Scale, NotebookPen, Info, HelpCircle, Menu, X } from 'lucide-react';

export type ViewId =
  | 'lab'
  | 'scenarios'
  | 'ruleArchitect'
  | 'decisionTrace'
  | 'adversarial'
  | 'fairness'
  | 'journal'
  | 'developer'
  | 'methodology'
  | 'tutorial';

interface NavItem {
  id: ViewId;
  label: string;
  icon: typeof FlaskConical;
  group: 'core' | 'tools' | 'research' | 'info';
}

const navItems: NavItem[] = [
  { id: 'lab', label: 'Laboratory', icon: FlaskConical, group: 'core' },
  { id: 'scenarios', label: 'Scenarios', icon: BookOpen, group: 'core' },
  { id: 'ruleArchitect', label: 'Rule Architect', icon: Wrench, group: 'core' },
  { id: 'decisionTrace', label: 'Decision Trace', icon: GitBranch, group: 'core' },
  { id: 'adversarial', label: 'Adversarial Testing', icon: Scale, group: 'tools' },
  { id: 'fairness', label: 'Fairness Observatory', icon: Scale, group: 'tools' },
  { id: 'journal', label: 'Experiment Journal', icon: NotebookPen, group: 'research' },
  { id: 'tutorial', label: 'Tutorial', icon: HelpCircle, group: 'info' },
  { id: 'methodology', label: 'Methodology', icon: BookOpen, group: 'info' },
  { id: 'developer', label: 'Behind The Lab', icon: Info, group: 'info' },
];

const groupLabels: Record<string, string> = {
  core: 'Core Laboratory',
  tools: 'Testing & Analysis',
  research: 'Research',
  info: 'Information',
};

interface SidebarProps {
  current: ViewId;
  onNavigate: (id: ViewId) => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups = ['core', 'tools', 'research', 'info'] as const;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--color-grid)]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-md bg-[var(--color-cobalt)] flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-[var(--color-ink)]">The Alignment Lab</div>
            <div className="text-[10px] text-gray-500 font-mono-lab tracking-wide">v1.0 · decision systems</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto lab-scrollbar px-3 py-4">
        {groups.map((group) => (
          <div key={group} className="mb-5">
            <div className="lab-section-title px-2 mb-2">{groupLabels[group]}</div>
            <div className="space-y-0.5">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const active = current === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-all ${
                        active
                          ? 'bg-[var(--color-cobalt-pale)] text-[var(--color-cobalt)] font-semibold'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-[var(--color-ink)]'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--color-grid)] text-[10px] text-gray-400">
        <p className="font-mono-lab">Can a machine follow its rules</p>
        <p className="font-mono-lab">and still make the wrong decision?</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white border-r border-[var(--color-grid)] h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-[var(--color-grid)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[var(--color-cobalt)] flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold">The Alignment Lab</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md hover:bg-gray-100"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-white border-r border-[var(--color-grid)] h-full animate-slide-up">
            {sidebarContent}
          </div>
          <div className="flex-1 bg-black/20" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
