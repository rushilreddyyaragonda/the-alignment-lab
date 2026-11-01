import type {
  Policy,
  Scenario,
  JournalEntry,
  AppPreferences,
  DecisionTrace,
  StoredScenario,
  TestSuiteResult,
} from '@/types';

// ============================================================================
// LOCAL STORAGE & INDEXEDDB PERSISTENCE
// ============================================================================

const PREFIX = 'alignment_lab_';
const IDB_NAME = 'alignment_lab_db';
const IDB_VERSION = 1;
const TRACE_STORE = 'decision_traces';

// --- Simple localStorage helpers --------------------------------------------

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Storage write failed:', e);
    return false;
  }
}

function lsRemove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

// --- Policies ---------------------------------------------------------------

export function savePolicy(policy: Policy): boolean {
  const policies = lsGet<Policy[]>('policies', []);
  const existingIdx = policies.findIndex((p) => p.id === policy.id);
  if (existingIdx >= 0) {
    policies[existingIdx] = policy;
  } else {
    policies.push(policy);
  }
  return lsSet('policies', policies);
}

export function loadPolicies(): Policy[] {
  return lsGet<Policy[]>('policies', []);
}

export function loadPoliciesForScenario(scenarioId: string): Policy[] {
  return loadPolicies().filter((p) => p.scenarioId === scenarioId);
}

export function deletePolicy(policyId: string): void {
  const policies = lsGet<Policy[]>('policies', []);
  lsSet('policies', policies.filter((p) => p.id !== policyId));
}

export function duplicatePolicy(policyId: string, newName: string): Policy | null {
  const policies = lsGet<Policy[]>('policies', []);
  const original = policies.find((p) => p.id === policyId);
  if (!original) return null;
  const copy: Policy = {
    ...original,
    id: `policy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: newName,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  savePolicy(copy);
  return copy;
}

// --- Custom Scenarios -------------------------------------------------------

export function saveCustomScenario(scenario: StoredScenario): boolean {
  const scenarios = lsGet<StoredScenario[]>('custom_scenarios', []);
  const idx = scenarios.findIndex((s) => s.id === scenario.id);
  if (idx >= 0) scenarios[idx] = scenario;
  else scenarios.push(scenario);
  return lsSet('custom_scenarios', scenarios);
}

export function loadCustomScenarios(): StoredScenario[] {
  return lsGet<StoredScenario[]>('custom_scenarios', []);
}

export function deleteCustomScenario(id: string): void {
  const scenarios = lsGet<StoredScenario[]>('custom_scenarios', []);
  lsSet('custom_scenarios', scenarios.filter((s) => s.id !== id));
}

// --- Journal Entries --------------------------------------------------------

export function saveJournalEntry(entry: JournalEntry): boolean {
  const entries = lsGet<JournalEntry[]>('journal', []);
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  return lsSet('journal', entries);
}

export function loadJournalEntries(): JournalEntry[] {
  return lsGet<JournalEntry[]>('journal', []);
}

export function deleteJournalEntry(id: string): void {
  const entries = lsGet<JournalEntry[]>('journal', []);
  lsSet('journal', entries.filter((e) => e.id !== id));
}

// --- Preferences ------------------------------------------------------------

const DEFAULT_PREFS: AppPreferences = {
  tutorialCompleted: false,
  theme: 'light',
  lastScenarioId: null,
  lastPolicyId: null,
};

export function loadPreferences(): AppPreferences {
  return lsGet('preferences', DEFAULT_PREFS);
}

export function savePreferences(prefs: AppPreferences): void {
  lsSet('preferences', prefs);
}

// --- Test Suite Results -----------------------------------------------------

export function saveTestResults(result: TestSuiteResult): boolean {
  return lsSet(`test_results_${Date.now()}`, result);
}

// --- IndexedDB for Decision Traces -----------------------------------------

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TRACE_STORE)) {
        db.createObjectStore(TRACE_STORE, { keyPath: 'traceKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function saveTrace(
  scenarioId: string,
  policyId: string,
  trace: DecisionTrace
): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(TRACE_STORE, 'readwrite');
    const store = tx.objectStore(TRACE_STORE);
    store.put({
      ...trace,
      traceKey: `${scenarioId}:${policyId}:${trace.inputId}`,
      scenarioId,
      policyId,
    });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      resolve();
    };
  });
}

export async function loadTraces(
  scenarioId?: string,
  policyId?: string
): Promise<(DecisionTrace & { scenarioId: string; policyId: string })[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(TRACE_STORE, 'readonly');
    const store = tx.objectStore(TRACE_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      let results = req.result as (DecisionTrace & {
        scenarioId: string;
        policyId: string;
      })[];
      if (scenarioId) results = results.filter((r) => r.scenarioId === scenarioId);
      if (policyId) results = results.filter((r) => r.policyId === policyId);
      resolve(results);
    };
    req.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}

export async function clearTraces(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(TRACE_STORE, 'readwrite');
    tx.objectStore(TRACE_STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      resolve();
    };
  });
}

// --- Export / Import --------------------------------------------------------

export function exportAllData(): string {
  const data = {
    policies: loadPolicies(),
    customScenarios: loadCustomScenarios(),
    journal: loadJournalEntries(),
    preferences: loadPreferences(),
    exportedAt: new Date().toISOString(),
    version: 1,
  };
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): { success: boolean; error?: string; policiesImported?: number; journalImported?: number } {
  try {
    const data = JSON.parse(json);
    let policiesCount = 0;
    let journalCount = 0;
    if (data.policies && Array.isArray(data.policies)) {
      const existing = loadPolicies();
      for (const p of data.policies) {
        if (p && typeof p.id === 'string' && typeof p.name === 'string' &&
            typeof p.scenarioId === 'string' && Array.isArray(p.rules) &&
            Array.isArray(p.objectives) && Array.isArray(p.constraints) &&
            typeof p.weights === 'object') {
          const idx = existing.findIndex((e) => e.id === p.id);
          if (idx >= 0) existing[idx] = p;
          else existing.push(p);
          policiesCount++;
        }
      }
      lsSet('policies', existing);
    }
    if (data.journal && Array.isArray(data.journal)) {
      const existing = loadJournalEntries();
      for (const e of data.journal) {
        if (e && typeof e.id === 'string' && typeof e.title === 'string') {
          const idx = existing.findIndex((x) => x.id === e.id);
          if (idx >= 0) existing[idx] = e;
          else existing.push(e);
          journalCount++;
        }
      }
      lsSet('journal', existing);
    }
    if (data.customScenarios && Array.isArray(data.customScenarios)) {
      const existing = loadCustomScenarios();
      for (const s of data.customScenarios) {
        if (s && typeof s.id === 'string' && typeof s.name === 'string' &&
            Array.isArray(s.inputSchema)) {
          const idx = existing.findIndex((x) => x.id === s.id);
          if (idx >= 0) existing[idx] = s;
          else existing.push(s);
        }
      }
      lsSet('custom_scenarios', existing);
    }
    if (data.preferences && typeof data.preferences === 'object') {
      const prefs = data.preferences;
      if (typeof prefs.tutorialCompleted === 'boolean' ||
          typeof prefs.lastScenarioId === 'string' ||
          typeof prefs.lastPolicyId === 'string') {
        savePreferences({ ...loadPreferences(), ...prefs });
      }
    }
    return {
      success: true,
      policiesImported: policiesCount,
      journalImported: journalCount,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// --- Storage Quota Check ----------------------------------------------------

export async function getStorageInfo(): Promise<{ used: number; quota: number | null }> {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      const val = localStorage.getItem(key) ?? '';
      used += val.length + key.length;
    }
  }
  let quota: number | null = null;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      quota = est.quota ?? null;
    } catch {
      quota = null;
    }
  }
  return { used, quota };
}
