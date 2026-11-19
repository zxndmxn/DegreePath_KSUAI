import { useEffect, useMemo, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import { Icon } from './bits.tsx';

const normalize = (v: string) => v.trim().toUpperCase().replace(/^([A-Z]{2,5})\s*(\d{4}[A-Z]?)$/, '$1 $2');
const CODE = /^[A-Z]{2,5} \d{4}[A-Z]?$/;

// Type a code or a name; matching courses appear immediately as tags with their titles.
export function AddCourse({ s }: { s: DegreePathState }) {
  const [q, setQ] = useState('');
  const [looking, setLooking] = useState(false);
  const p = s.pathway!;
  const inPlan = useMemo(() => new Set(s.plan?.terms.flatMap(t => t.courses.map(c => c.code)) ?? []), [s.plan]);
  const done = useMemo(() => new Set(p.completed.map(c => c.code)), [p.completed]);
  const code = normalize(q);

  useEffect(() => {
    if (!CODE.test(code) || code in s.catalog) return;
    setLooking(true);
    const t = setTimeout(() => { void s.ensureCourses([code]).finally(() => setLooking(false)); }, 350);
    return () => { clearTimeout(t); setLooking(false); };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const pool = new Set([...p.open.flatMap(r => r.options), ...Object.keys(s.catalog)]);
    return [...pool]
      .map(c => ({ code: c, title: s.catalog[c]?.title ?? '' }))
      .filter(c => c.code.toLowerCase().replace(' ', '').includes(needle.replace(/\s+/g, '')) || c.title.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [q, p.open, s.catalog]);

  const add = (c: string) => {
    if (inPlan.has(c) || s.edits.add.includes(c)) return;
    s.setEdits({ ...s.edits, add: [...s.edits.add, c] });
    setQ('');
  };
  const status = (c: string) => done.has(c) ? 'Completed' : inPlan.has(c) || s.edits.add.includes(c) ? 'In your plan' : null;

  return (
    <div className="add-course">
      <div className="add-field">
        <Icon name="plus" size={18} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Add a course: type a code or name, e.g. IT 4833"
          aria-label="Add a course" onKeyDown={e => { if (e.key === 'Enter' && matches[0] && !status(matches[0].code)) add(matches[0].code); }} />
        {looking && <span className="spinner" />}
      </div>
      {q.trim().length >= 2 && (
        <div className="add-results">
          {matches.map(m => (
            <button key={m.code} className="course-tag as-btn" onClick={() => add(m.code)} disabled={!!status(m.code)}>
              <b>#{m.code.replace(' ', ' ')}</b><span>{m.title || 'Looking up…'}</span>
              {status(m.code) ? <em>{status(m.code)}</em> : <Icon name="plus" size={14} />}
            </button>
          ))}
          {!matches.length && !looking && <span className="muted">{CODE.test(code) && s.catalog[code] === undefined && code in s.catalog ? `${code} wasn't found on KSU's schedule.` : 'No match yet. Type a full code like IT 4833.'}</span>}
        </div>
      )}
      {s.edits.add.length > 0 && (
        <div className="add-results">
          {s.edits.add.map(c => (
            <span key={c} className="course-tag tag-hot"><b>#{c.replace(' ', ' ')}</b><span>{s.catalog[c]?.title ?? c}</span>
              <button aria-label={`Remove ${c}`} onClick={() => s.setEdits({ ...s.edits, add: s.edits.add.filter(x => x !== c) })}><Icon name="close" size={13} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
