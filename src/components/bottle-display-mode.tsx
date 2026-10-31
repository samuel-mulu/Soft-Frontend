'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type BottleDisplayMode = 'each' | 'dozenEach';

const STORAGE_KEY = 'fs_bottle_display_mode';

const BottleDisplayContext = createContext<{
  mode: BottleDisplayMode;
  setMode: (m: BottleDisplayMode) => void;
}>({ mode: 'each', setMode: () => {} });

export function BottleDisplayProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<BottleDisplayMode>('each');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as BottleDisplayMode | null;
      if (saved === 'each' || saved === 'dozenEach') setModeState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback((m: BottleDisplayMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <BottleDisplayContext.Provider value={{ mode, setMode }}>
      {children}
    </BottleDisplayContext.Provider>
  );
}

export function useBottleDisplayMode() {
  return useContext(BottleDisplayContext);
}

export function BottleDisplayToggle({ compact }: { compact?: boolean }) {
  const { mode, setMode } = useBottleDisplayMode();
  return (
    <div
      className={`inline-flex rounded-lg border border-[#dfe7df] bg-[#f4f8f5] p-0.5 ${compact ? 'text-[11px]' : 'text-xs'}`}
      role="group"
      aria-label="Bottle balance display"
    >
      <button
        type="button"
        className={`px-2.5 py-1 rounded-md font-bold transition-colors ${mode === 'each' ? 'bg-white text-[#177554] shadow-sm' : 'text-[#68776e]'}`}
        onClick={() => setMode('each')}
      >
        Each
      </button>
      <button
        type="button"
        className={`px-2.5 py-1 rounded-md font-bold transition-colors ${mode === 'dozenEach' ? 'bg-white text-[#177554] shadow-sm' : 'text-[#68776e]'}`}
        onClick={() => setMode('dozenEach')}
      >
        Dozen + Each
      </button>
    </div>
  );
}
