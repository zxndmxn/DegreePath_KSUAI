import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Pathway, PlanEdits, PlanSettings } from './core/types.ts';
import { buildPlan, codesToLookUp, defaultSettings, diffPlans, emptyEdits, type Catalog } from './core/plan.ts';
import { api } from './api.ts';
import type { Workload } from './core/d2l.ts';
import demoData from './core/demo-data.json';

const KEYS = { pathway: 'degreepath.pathway.v2', draft: 'degreepath.draft.v2', plans: 'degreepath.plans.v2', catalog: 'degreepath.catalog.v2' };
const CATALOG_MAX_AGE = 12 * 60 * 60 * 1000;

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { value === undefined ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage off */ }
}

export interface SavedPlan { id: string; name: string; savedAt: string; edits: PlanEdits; settings: PlanSettings; finish: string | null }

export function useDegreePath(demo = false) {
  const [pathway, setPathwayState] = useState<Pathway | null>(() => demo ? demoData.pathway as Pathway : load(KEYS.pathway, null));
  const [catalog, setCatalog] = useState<Catalog>(() => demo ? demoData.catalog as Catalog : load(KEYS.catalog, {}));
  const [draft, setDraft] = useState<{ edits: PlanEdits; settings: PlanSettings }>(() =>
    demo ? { edits: emptyEdits(), settings: defaultSettings() } : load(KEYS.draft, { edits: emptyEdits(), settings: defaultSettings() }));
  const [plans, setPlans] = useState<SavedPlan[]>(() => demo ? [] : load(KEYS.plans, []));
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const refreshCatalog = useRef(false);
  const pendingLookups = useRef(0);
  const [workload, setWorkload] = useState<Workload | null>(null);
  const loadWorkload = useCallback((refresh = false) => api.workload(refresh).then(setWorkload).catch(() => setWorkload(null)), []);
  useEffect(() => { if (pathway && !demo) void loadWorkload(); }, [pathway?.importedAt, demo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!demo) save(KEYS.draft, draft); }, [draft, demo]);
  useEffect(() => { if (!demo) save(KEYS.plans, plans); }, [plans, demo]);
  useEffect(() => { if (!demo) save(KEYS.catalog, catalog); }, [catalog, demo]);

  const setPathway = useCallback((p: Pathway | null, refresh = false) => {
    refreshCatalog.current = refresh;
    setPathwayState(p);
    if (!demo) save(KEYS.pathway, p ?? undefined);
    if (!p) {
      setDraft({ edits: emptyEdits(), settings: defaultSettings() });
      setPlans([]);
      setWorkload(null);
    }
  }, [demo]);

  const ensureCourses = useCallback(async (codes: string[], refresh = false) => {
    if (demo) {
      const unavailable = codes.filter(code => !(code in catalog));
      if (unavailable.length) setCatalog(previous => ({ ...previous, ...Object.fromEntries(unavailable.map(code => [code, undefined])) }));
      return;
    }
    const missing = [...new Set(codes)].filter(code => {
      const info = catalog[code];
      return refresh || !info || info.stale || !(Date.now() - Date.parse(info.fetchedAt) < CATALOG_MAX_AGE);
    });
    if (!missing.length) return;
    pendingLookups.current++;
    setLoadingCourses(true);
    setCourseError(null);
    try {
      const found: Record<string, Awaited<ReturnType<typeof api.courses>>[string]> = {};
      for (let i = 0; i < missing.length; i += 60) {
        Object.assign(found, await api.courses(missing.slice(i, i + 60), refresh));
      }
      setCatalog(prev => {
        const next = { ...prev };
        for (const [code, info] of Object.entries(found)) {
          const existing = next[code];
          if (info && (!existing || Date.parse(info.fetchedAt) >= Date.parse(existing.fetchedAt))) next[code] = info;
          else if (!info) next[code] = existing ? { ...existing, stale: true } : undefined;
        }
        return next;
      });
    } catch (e) {
      setCourseError(e instanceof Error ? e.message : 'Course lookup failed.');
    } finally { if (--pendingLookups.current === 0) setLoadingCourses(false); }
  }, [catalog, demo]);

  useEffect(() => {
    if (!pathway) return;
    const refresh = refreshCatalog.current;
    refreshCatalog.current = false;
    void ensureCourses(codesToLookUp(pathway, draft.edits), refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathway, draft.edits.add.join(), Object.values(draft.edits.choose).flat().join()]);

  const baseline = useMemo(() => pathway ? buildPlan(pathway, catalog, emptyEdits(), draft.settings) : null, [pathway, catalog, draft.settings]);
  const plan = useMemo(() => pathway ? buildPlan(pathway, catalog, draft.edits, draft.settings) : null, [pathway, catalog, draft]);
  const moves = useMemo(() => baseline && plan ? diffPlans(baseline, plan) : [], [baseline, plan]);
  const editCount = draft.edits.drop.length + Object.keys(draft.edits.defer).length + draft.edits.add.length + Object.keys(draft.edits.choose).length;
  const cachedOfferings = !demo && !!pathway && codesToLookUp(pathway, draft.edits).some(code => {
    const course = catalog[code];
    return !!course && (course.stale || !(Date.now() - Date.parse(course.fetchedAt) < CATALOG_MAX_AGE));
  });

  const preview = useCallback((edits: PlanEdits, settings: PlanSettings = draft.settings) =>
    pathway ? buildPlan(pathway, catalog, edits, settings) : null, [pathway, catalog, draft.settings]);

  return {
    pathway, setPathway, catalog, workload: workload?.connected ? workload : null, loadWorkload, ensureCourses, loadingCourses, courseError, cachedOfferings,
    edits: draft.edits, settings: draft.settings,
    setEdits: (edits: PlanEdits) => setDraft(d => ({ ...d, edits })),
    setSettings: (settings: PlanSettings) => setDraft(d => ({ ...d, settings })),
    setDraft,
    reset: () => setDraft(d => ({ ...d, edits: emptyEdits() })),
    baseline, plan, moves, editCount, preview,
    plans,
    savePlan: (name: string) => setPlans(ps => [{ id: crypto.randomUUID(), name, savedAt: new Date().toISOString(),
      edits: draft.edits, settings: draft.settings, finish: plan?.finish ?? null }, ...ps].slice(0, 20)),
    openPlan: (id: string) => { const p = plans.find(x => x.id === id); if (p) setDraft({ edits: p.edits, settings: p.settings }); },
    deletePlan: (id: string) => setPlans(ps => ps.filter(p => p.id !== id)),
  };
}

export type DegreePathState = ReturnType<typeof useDegreePath>;
