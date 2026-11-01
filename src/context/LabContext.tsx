import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Policy, Scenario, DecisionResult, AppPreferences } from '@/types';
import { scenarios as builtinScenarios, getScenarioById } from '@/scenarios';
import {
  loadPolicies,
  savePolicy,
  deletePolicy as deletePolicyFromStorage,
  loadPreferences,
  savePreferences,
  loadCustomScenarios,
} from '@/engine/storage';
import { decide, runBatch } from '@/engine/decisionEngine';

interface LabContextValue {
  scenarios: Scenario[];
  currentScenario: Scenario | null;
  setCurrentScenarioId: (id: string) => void;
  currentPolicy: Policy | null;
  policies: Policy[];
  setCurrentPolicyId: (id: string) => void;
  saveCurrentPolicy: () => boolean;
  createNewPolicy: (name: string) => void;
  duplicatePolicy: (id: string, newName: string) => void;
  deletePolicy: (id: string) => void;
  updatePolicy: (updater: (p: Policy) => Policy) => void;
  results: DecisionResult[];
  runSimulation: () => void;
  runSingleDecision: (inputId: string) => DecisionResult | null;
  selectedResult: DecisionResult | null;
  setSelectedResult: (r: DecisionResult | null) => void;
  preferences: AppPreferences;
  setTutorialCompleted: (done: boolean) => void;
}

const LabContext = createContext<LabContextValue | null>(null);

export function useLab() {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error('useLab must be used within LabProvider');
  return ctx;
}

function createDefaultPolicy(scenario: Scenario): Policy {
  const id = `policy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: 'Default Policy',
    scenarioId: scenario.id,
    rules: scenario.defaultRules.map((r) => ({ ...r })),
    objectives: scenario.defaultObjectives.map((o) => ({ ...o })),
    constraints: scenario.defaultConstraints.map((c) => ({ ...c })),
    weights: { ...scenario.defaultWeights },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

export function LabProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(loadPreferences);
  const [customScenarios] = useState(loadCustomScenarios());

  const allScenarios = [...builtinScenarios, ...customScenarios.map((s) => s as unknown as Scenario)];

  const [currentScenarioId, setCurrentScenarioIdState] = useState<string>(
    preferences.lastScenarioId || builtinScenarios[0].id
  );

  const currentScenario =
    getScenarioById(currentScenarioId) ??
    (customScenarios.find((s) => s.id === currentScenarioId) as unknown as Scenario) ??
    builtinScenarios[0];

  const [policies, setPolicies] = useState<Policy[]>(() =>
    loadPolicies().filter((p) => p.scenarioId === currentScenarioId)
  );

  const scenarioPolicies = policies.filter((p) => p.scenarioId === currentScenarioId);

  const [currentPolicyId, setCurrentPolicyIdState] = useState<string | null>(
    preferences.lastPolicyId &&
      scenarioPolicies.some((p) => p.id === preferences.lastPolicyId)
      ? preferences.lastPolicyId
      : scenarioPolicies[0]?.id ?? null
  );

  const [currentPolicy, setCurrentPolicyState] = useState<Policy | null>(() => {
    if (currentPolicyId && scenarioPolicies.some((p) => p.id === currentPolicyId)) {
      return scenarioPolicies.find((p) => p.id === currentPolicyId)!;
    }
    const def = createDefaultPolicy(currentScenario);
    return def;
  });
  // Ensure currentPolicyId is set for the default policy
  if (!currentPolicyId && currentPolicy) {
    setCurrentPolicyIdState(currentPolicy.id);
  }

  const [results, setResults] = useState<DecisionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DecisionResult | null>(null);

  const setCurrentScenarioId = useCallback((id: string) => {
    setCurrentScenarioIdState(id);
    const newPolicies = loadPolicies().filter((p) => p.scenarioId === id);
    setPolicies(newPolicies);
    const scenario = getScenarioById(id) ??
      (customScenarios.find((s) => s.id === id) as unknown as Scenario) ??
      builtinScenarios[0];
    if (newPolicies.length > 0) {
      setCurrentPolicyState(newPolicies[0]);
      setCurrentPolicyIdState(newPolicies[0].id);
    } else {
      const def = createDefaultPolicy(scenario);
      setCurrentPolicyState(def);
      setCurrentPolicyIdState(def.id);
    }
    setResults([]);
    setSelectedResult(null);
    setPreferences((prev) => {
      const updated = { ...prev, lastScenarioId: id };
      savePreferences(updated);
      return updated;
    });
  }, [customScenarios]);

  const setCurrentPolicyId = useCallback((id: string) => {
    const policy = policies.find((p) => p.id === id);
    if (policy) {
      setCurrentPolicyState(policy);
      setCurrentPolicyIdState(id);
      setResults([]);
      setSelectedResult(null);
      setPreferences((prev) => {
        const updated = { ...prev, lastPolicyId: id };
        savePreferences(updated);
        return updated;
      });
    }
  }, [policies]);

  const updatePolicy = useCallback((updater: (p: Policy) => Policy) => {
    setCurrentPolicyState((prev) => {
      if (!prev) return prev;
      const updated = { ...updater(prev), updatedAt: Date.now(), version: prev.version + 1 };
      return updated;
    });
  }, []);

  const saveCurrentPolicy = useCallback(() => {
    if (!currentPolicy) return false;
    const updated = { ...currentPolicy, updatedAt: Date.now() };
    const ok = savePolicy(updated);
    setPolicies((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
    return ok;
  }, [currentPolicy]);

  const createNewPolicy = useCallback((name: string) => {
    if (!currentScenario) return;
    const newPolicy = createDefaultPolicy(currentScenario);
    newPolicy.name = name;
    savePolicy(newPolicy);
    setPolicies((prev) => [...prev, newPolicy]);
    setCurrentPolicyState(newPolicy);
    setCurrentPolicyIdState(newPolicy.id);
    setResults([]);
    setSelectedResult(null);
  }, [currentScenario]);

  const duplicatePolicyById = useCallback((id: string, newName: string) => {
    const all = loadPolicies();
    const original = all.find((p) => p.id === id);
    if (!original) return;
    const copy: Policy = {
      ...original,
      id: `policy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: newName,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    savePolicy(copy);
    setPolicies((prev) => [...prev, copy]);
    setCurrentPolicyState(copy);
    setCurrentPolicyIdState(copy.id);
    setResults([]);
    setSelectedResult(null);
  }, []);

  const deletePolicyById = useCallback((id: string) => {
    deletePolicyFromStorage(id);
    const all = loadPolicies();
    setPolicies(all.filter((p) => p.scenarioId === currentScenarioId));
    if (currentPolicyId === id || currentPolicy?.id === id) {
      const remaining = all.filter((p) => p.scenarioId === currentScenarioId);
      if (remaining.length > 0) {
        setCurrentPolicyState(remaining[0]);
        setCurrentPolicyIdState(remaining[0].id);
      } else if (currentScenario) {
        const def = createDefaultPolicy(currentScenario);
        setCurrentPolicyState(def);
        setCurrentPolicyIdState(def.id);
      }
    }
  }, [currentPolicyId, currentPolicy, currentScenarioId, currentScenario]);

  const runSimulation = useCallback(() => {
    if (!currentPolicy || !currentScenario) return;
    const batchResults = runBatch(currentScenario.testInputs, currentPolicy, currentScenario);
    setResults(batchResults);
    if (batchResults.length > 0) {
      setSelectedResult(batchResults[0]);
    }
  }, [currentPolicy, currentScenario]);

  const runSingleDecision = useCallback((inputId: string) => {
    if (!currentPolicy || !currentScenario) return null;
    const input = currentScenario.testInputs.find((i) => i.id === inputId);
    if (!input) return null;
    const result = decide(input, currentPolicy, currentScenario, currentScenario.testInputs);
    return result;
  }, [currentPolicy, currentScenario]);

  const setTutorialCompleted = useCallback((done: boolean) => {
    setPreferences((prev) => {
      const updated = { ...prev, tutorialCompleted: done };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const value: LabContextValue = {
    scenarios: allScenarios,
    currentScenario,
    setCurrentScenarioId,
    currentPolicy,
    policies: scenarioPolicies,
    setCurrentPolicyId,
    saveCurrentPolicy,
    createNewPolicy,
    duplicatePolicy: duplicatePolicyById,
    deletePolicy: deletePolicyById,
    updatePolicy,
    results,
    runSimulation,
    runSingleDecision,
    selectedResult,
    setSelectedResult,
    preferences,
    setTutorialCompleted,
  };

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}
