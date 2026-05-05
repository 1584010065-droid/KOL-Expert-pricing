import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FieldMapping, PricingTaskRecord, RawDataset } from "../types";
import { guessFieldMapping } from "../lib/fields";

interface AppState {
  dataset: RawDataset | null;
  mapping: FieldMapping;
  tasks: PricingTaskRecord[];
  setDataset: (dataset: RawDataset | null) => void;
  setMapping: (mapping: FieldMapping) => void;
  saveTask: (task: PricingTaskRecord) => void;
  reset: () => void;
}

const STORAGE_KEY = "kol-pricing-mvp-state";
const AppStateContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDatasetState] = useState<RawDataset | null>(null);
  const [mapping, setMappingState] = useState<FieldMapping>({});
  const [tasks, setTasks] = useState<PricingTaskRecord[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Pick<AppState, "dataset" | "mapping" | "tasks">;
      setDatasetState(parsed.dataset ?? null);
      setMappingState(parsed.mapping ?? {});
      setTasks(parsed.tasks ?? []);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dataset, mapping, tasks }));
  }, [dataset, mapping, tasks]);

  const value = useMemo<AppState>(() => ({
    dataset,
    mapping,
    tasks,
    setDataset: (nextDataset) => {
      setDatasetState(nextDataset);
      setMappingState(nextDataset ? guessFieldMapping(nextDataset.headers) : {});
      setTasks([]);
    },
    setMapping: setMappingState,
    saveTask: (task) => {
      setTasks((current) => [task, ...current.filter((item) => item.taskId !== task.taskId)]);
    },
    reset: () => {
      setDatasetState(null);
      setMappingState({});
      setTasks([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  }), [dataset, mapping, tasks]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const state = useContext(AppStateContext);
  if (!state) throw new Error("useAppState must be used within AppProvider");
  return state;
}
