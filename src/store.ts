import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Pathway, PlanEdits, PlanSettings } from './core/types.ts';
import { buildPlan, codesToLookUp, defaultSettings, diffPlans, emptyEdits, type Catalog } from './core/plan.ts';
import { api } from './api.ts';

const KEYS = { pathway: 'degreepath.pathway.v2', draft: 'degreepath.draft.v2', plans: 'degreepath.plans.v2', catalog: 'degreepath.catalog.v2' };

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { value === undefined ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage off */ }
}

export interface SavedPlan { id: string; name: string; savedAt: string; edits: PlanEdits; settings: PlanSettings; finish: string | null }

export function useDegreePath() {
  const [pathway, setPathwayState] = useState<Pathway | null>(() => load(KEYS.pathway, null));
  const [catalog, setCatalog] = useState<Catalog>(() => load(KEYS.catalog, {}));
  const [draft, setDraft] = useState<{ edits: PlanEdits; settings: PlanSettings }>(() =>
    load(KEYS.draft, { edits: emptyEdits(), settings: defaultSettings() }));
  const [plans, setPlans] = useState<SavedPlan[]>(() => load(KEYS.plans, []));
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  useEffect(() => save(KEYS.draft, draft), [draft]);
  useEffect(() => save(KEYS.plans, plans), [plans]);
  useEffect(() => save(KEYS.catalog, catalog), [catalog]);

  const setPathway = useCallback((p: Pathway | null) => {
    setPathwayState(p);
    save(KEYS.pathway, p ?? undefined);
    if (!p) { setDraft({ edits: emptyEdits(), settings: defaultSettings() }); }
  }, []);

  const ensureCourses = useCallback(async (codes: string[]) => {
    const missing = codes.filter(c => !(c in catalog));
    if (!missing.length) return;
    setLoadingCourses(true);
    setCourseError(null);
    try {
      const found = await api.courses(missing);
      setCatalog(prev => {
        const next = { ...prev };
        for (const [code, info] of Object.entries(found)) next[code] = info ?? undefined;
        return next;
      });
    } catch (e) {
      setCourseError(e instanceof Error ? e.message : 'Course lookup failed.');
    } finally { setLoadingCourses(false); }
  }, [catalog]);

  useEffect(() => {
    if (pathway) void ensureCourses(codesToLookUp(pathway, draft.edits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathway, draft.edits.add.join(), Object.values(draft.edits.choose).flat().join()]);

  const baseline = useMemo(() => pathway ? buildPlan(pathway, catalog, emptyEdits(), draft.settings) : null, [pathway, catalog, draft.settings]);
  const plan = useMemo(() => pathway ? buildPlan(pathway, catalog, draft.edits, draft.settings) : null, [pathway, catalog, draft]);
  const moves = useMemo(() => baseline && plan ? diffPlans(baseline, plan) : [], [baseline, plan]);
  const editCount = draft.edits.drop.length + Object.keys(draft.edits.defer).length + draft.edits.add.length + Object.keys(draft.edits.choose).length;

  const preview = useCallback((edits: PlanEdits, settings: PlanSettings = draft.settings) =>
    pathway ? buildPlan(pathway, catalog, edits, settings) : null, [pathway, catalog, draft.settings]);

  return {
    pathway, setPathway, catalog, ensureCourses, loadingCourses, courseError,
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
