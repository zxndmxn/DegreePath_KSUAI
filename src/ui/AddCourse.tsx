import { useEffect, useMemo, useRef, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import { Icon } from './bits.tsx';

const normalize = (v: string) => v.trim().toUpperCase().replace(/^([A-Z]{2,5})\s*(\d{4}[A-Z]?)$/, '$1 $2');
const CODE = /^[A-Z]{2,5} \d{4}[A-Z]?$/;
type State = 'add' | 'plan' | 'done' | 'lookup' | 'unverified';

// Type a code or a name; matching courses appear right away with their titles and status.
export function AddCourse({ s }: { s: DegreePathState }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const p = s.pathway!;
  const inPlan = useMemo(() => new Set([
    ...(s.plan?.terms.flatMap(t => t.courses.map(c => c.code)) ?? []),
    ...(s.plan?.blocked.map(c => c.code) ?? []),
  ]), [s.plan]);
  const known = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of [...p.completed, ...p.inProgress]) m.set(c.code, c.title);
    for (const [code, info] of Object.entries(s.catalog)) if (info) m.set(code, info.title);
    return m;
  }, [p.completed, p.inProgress, s.catalog]);
  const done = useMemo(() => new Set(p.completed.map(c => c.code)), [p.completed]);
  const code = normalize(q);
  const status = (c: string): State => {
    if (done.has(c)) return 'done';
    if (inPlan.has(c) || s.edits.add.includes(c)) return 'plan';
    if (known.has(c)) return 'add';
    return c in s.catalog || s.courseError ? 'unverified' : 'lookup';
  };

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const pool = new Set([...p.open.flatMap(r => r.options), ...known.keys()]);
    if (CODE.test(code)) pool.add(code);
    const rank: Record<State, number> = { add: 0, lookup: 1, plan: 2, done: 3, unverified: 4 };
    return [...pool]
      .filter(c => c.toLowerCase().replace(' ', '').includes(needle.replace(/\s+/g, '')) || (known.get(c) ?? '').toLowerCase().includes(needle))
      .sort((a, b) => Number(b === code) - Number(a === code) || rank[status(a)] - rank[status(b)] || a.localeCompare(b))
      .slice(0, 8);
  }, [q, p.open, known, code, inPlan, s.edits.add, s.catalog, s.courseError]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch titles for visible matches we have never seen.
  useEffect(() => {
    const missing = matches.filter(c => !known.has(c) && !(c in s.catalog));
    if (!missing.length) return;
    const t = setTimeout(() => { void s.ensureCourses(missing); }, 300);
    return () => clearTimeout(t);
  }, [matches.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const add = (c: string) => {
    if (status(c) !== 'add') return;
    s.setEdits({ ...s.edits, add: [...s.edits.add, c] });
    setQ('');
    setOpen(false);
  };

  const label: Record<State, string> = { add: 'Add', plan: 'In your plan', done: 'Completed', lookup: 'Checking', unverified: 'Unavailable' };

  return (
    <div className="add-course" ref={box}>
      <div className="add-field" onBlur={e => { if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
        <Icon name="plus" size={18} />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Add a course by code or name" aria-label="Add a course" role="combobox" aria-autocomplete="list"
          aria-expanded={open && q.trim().length >= 2} aria-controls="add-course-options"
          aria-activedescendant={open && matches[active] ? `add-option-${active}` : undefined}
          autoComplete="off"
          onKeyDown={e => {
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && matches.length) {
              e.preventDefault();
              if (!open) { setOpen(true); setActive(0); return; }
              setActive(a => Math.max(0, Math.min(a + (e.key === 'ArrowDown' ? 1 : -1), matches.length - 1)));
            }
            if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); add(matches[active]); }
            if (e.key === 'Escape') setOpen(false);
          }} />
        {s.loadingCourses && <span className="spinner" />}
      </div>

      {open && q.trim().length >= 2 && (
        <ul className="add-menu" id="add-course-options" role="listbox" aria-label="Matching courses">
          {matches.map((c, i) => {
            const st = status(c);
            const title = known.get(c) ?? (st === 'unverified' ? 'Could not verify this course' : 'Looking up course details…');
            return (
              <li key={c} id={`add-option-${i}`} role="option" aria-selected={i === active} aria-disabled={st !== 'add'}
                className={`add-row ${i === active ? 'active' : ''} st-${st}`} onMouseEnter={() => setActive(i)}
                onMouseDown={e => e.preventDefault()} onClick={() => add(c)}>
                <span className="add-code">{c}</span>
                <span className={`add-title ${known.has(c) ? '' : 'pending'}`}>{title}</span>
                <span className={`add-state st-${st}`}>{st === 'add' && <Icon name="plus" size={13} />}{st === 'done' && <Icon name="check" size={13} />}{label[st]}</span>
              </li>
            );
          })}
          {!matches.length && <li className="add-empty" role="option" aria-disabled="true">No match yet. Try a full code like IT 4833.</li>}
        </ul>
      )}

      {s.edits.add.length > 0 && (
        <div className="added">
          <span className="added-label">Added by you</span>
          {s.edits.add.map(c => (
            <span key={c} className="added-chip">
              <b>{c}</b><span>{known.get(c) ?? c}</span>
              <button aria-label={`Remove ${c}`} onClick={() => s.setEdits({ ...s.edits, add: s.edits.add.filter(x => x !== c) })}><Icon name="close" size={13} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
