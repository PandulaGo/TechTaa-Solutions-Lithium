import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from './services/api';
import type { Environment } from './types';

interface EnvironmentContextType {
  environments: Environment[];
  activeEnvironmentId: number | null;
  activeEnvironment: Environment | null;
  setActiveEnvironmentId: (id: number | null) => void;
  reload: () => Promise<void>;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('lithium-active-env');
    return stored ? Number(stored) : null;
  });

  const reload = useCallback(async () => {
    try {
      const envs = await api.getEnvironments();
      const list = Array.isArray(envs) ? envs : [];
      setEnvironments(list);

      const stored = localStorage.getItem('lithium-active-env');
      if (stored) {
        const id = Number(stored);
        if (list.some((e: Environment) => e.id === id)) {
          setActiveEnvironmentIdState(id);
          return;
        }
      }

      const defaultEnv = list.find((e: Environment) => e.isDefault);
      if (defaultEnv) {
        setActiveEnvironmentIdState(defaultEnv.id);
        localStorage.setItem('lithium-active-env', String(defaultEnv.id));
      } else {
        setActiveEnvironmentIdState(null);
        localStorage.removeItem('lithium-active-env');
      }
    } catch (e) {
      console.error('Failed to load environments', e);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setActiveEnvironmentId = useCallback((id: number | null) => {
    setActiveEnvironmentIdState(id);
    if (id) {
      localStorage.setItem('lithium-active-env', String(id));
    } else {
      localStorage.removeItem('lithium-active-env');
    }
  }, []);

  const activeEnvironment = environments.find(e => e.id === activeEnvironmentId) || null;

  return (
    <EnvironmentContext.Provider value={{ environments, activeEnvironmentId, activeEnvironment, setActiveEnvironmentId, reload }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error('useEnvironment must be used within an EnvironmentProvider');
  return ctx;
}
