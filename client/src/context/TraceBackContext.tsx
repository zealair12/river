import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_ENTRIES = 'traceback-entries-v1';
const STORAGE_NOTES = 'traceback-notes-v1';

export interface TraceEntry {
  id: string;
  parentId: string | null;
  path: string;
  label: string;
  ts: number;
}

function loadEntries(): TraceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_ENTRIES);
    if (!raw) return [];
    const p = JSON.parse(raw) as TraceEntry[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: TraceEntry[]) {
  try {
    localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(entries.slice(-120)));
  } catch {
    /* ignore */
  }
}

type TraceBackValue = {
  panelOpen: boolean;
  setPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  entries: TraceEntry[];
  clearEntries: () => void;
  notes: string;
  setNotes: (s: string) => void;
  registerPageContext: (ctx: Record<string, unknown> | null) => void;
  getAssistantContext: () => Record<string, unknown>;
};

const TraceBackContext = createContext<TraceBackValue | null>(null);

export function TraceBackProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [entries, setEntries] = useState<TraceEntry[]>(() => loadEntries());
  const [notes, setNotesState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_NOTES) ?? '';
    } catch {
      return '';
    }
  });

  const pageCtxRef = useRef<Record<string, unknown>>({});
  const lastPathRef = useRef<string | null>(null);

  const registerPageContext = useCallback((ctx: Record<string, unknown> | null) => {
    pageCtxRef.current = ctx ?? {};
  }, []);

  const getAssistantContext = useCallback((): Record<string, unknown> => {
    const tail = entries.slice(-25);
    return {
      pathname: location.pathname,
      notesUser: notes.slice(0, 8000),
      navigationTrail: tail.map((e) => ({ label: e.label, path: e.path, ts: e.ts })),
      page: pageCtxRef.current
    };
  }, [entries, location.pathname, notes]);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTES, notes);
    } catch {
      /* ignore */
    }
  }, [notes]);

  useEffect(() => {
    const path = location.pathname;
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;

    const label =
      path === '/'
        ? 'Home'
        : path.startsWith('/stock/')
          ? `Stock ${(path.split('/')[2] ?? '').toUpperCase()}`
          : path.startsWith('/entity/')
            ? `Entity ${decodeURIComponent(path.split('/')[2] ?? '').slice(0, 48)}`
            : path;

    setEntries((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].path === path) return prev;
      const id = crypto.randomUUID();
      const parentId = prev.length > 0 ? prev[prev.length - 1].id : null;
      return [...prev, { id, parentId, path, label, ts: Date.now() }];
    });
  }, [location.pathname]);

  const clearEntries = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(STORAGE_ENTRIES);
    } catch {
      /* ignore */
    }
  }, []);

  const setNotes = useCallback((s: string) => {
    setNotesState(s);
  }, []);

  const value = useMemo(
    () => ({
      panelOpen,
      setPanelOpen,
      entries,
      clearEntries,
      notes,
      setNotes,
      registerPageContext,
      getAssistantContext
    }),
    [panelOpen, entries, clearEntries, notes, setNotes, registerPageContext, getAssistantContext]
  );

  return <TraceBackContext.Provider value={value}>{children}</TraceBackContext.Provider>;
}

export function useTraceBack() {
  const v = useContext(TraceBackContext);
  if (!v) throw new Error('useTraceBack outside TraceBackProvider');
  return v;
}
