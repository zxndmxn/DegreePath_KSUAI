import { useMemo, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import type { PlanEdits } from '../core/types.ts';
import { prereqText } from '../core/catalog.ts';
import { compareTerms, nextTerm } from '../core/terms.ts';
import { Credits, FlyArrow, Icon } from './bits.tsx';

type Choice = { kind: 'drop' } | { kind: 'defer'; term: string } | { kind: 'restore' } | { kind: 'remove' };

export function CourseSheet({ s, code, onClose }: { s: DegreePathState; code: string; onClose: () => void }) {
  const p = s.pathway!;
  const info = s.catalog[code];
  const inProgress = p.inProgress.some(c => c.code === code);
  const planned = s.plan?.terms.flatMap(t => t.courses.map(c => ({ ...c, term: t.label }))).find(c => c.code === code);
  const title = planned?.title ?? info?.title ?? code;
  const edited = s.edits.drop.includes(code) || code in s.edits.defer || s.edits.add.includes(code);
  const [choice, setChoice] = useState<Choice | null>(null);

  const laterTerms = useMemo(() => {
    const out: string[] = [];
    let t = planned?.term ?? p.activeTerm;
    for (let i = 0; i < 6; i++) { t = nextTerm(t, s.settings.summer); out.push(t); }
    return out;
  }, [planned?.term, p.activeTerm, s.settings.summer]);

  const nextEdits = useMemo((): PlanEdits | null => {
    if (!choice) return null;
    const e: PlanEdits = { drop: s.edits.drop.filter(c => c !== code), defer: { ...s.edits.defer }, add: s.edits.add.filter(c => c !== code), choose: s.edits.choose };
    delete e.defer[code];
    if (choice.kind === 'drop') e.drop.push(code);
    if (choice.kind === 'defer') { e.defer[code] = choice.term; if (inProgress) e.drop.push(code); }
    return e;
  }, [choice, code, inProgress, s.edits]);

  const result = nextEdits ? s.preview(nextEdits) : null;
  const now = s.plan?.finish ?? null;
  const later = result ? result.finish : null;
  const newTerm = result?.terms.find(t => t.courses.some(c => c.code === code))?.label;
  const delta = result && now && later ? Math.sign(compareTerms(later, now)) : null;

  return (
    <aside className="course-panel" aria-label={`${code} details`}>
      <div className="panel-top">
        <div><span className="eyebrow">Course</span><h2>{title}</h2></div>
        <button className="icon-btn big" onClick={onClose} aria-label="Close course details"><Icon name="close" size={22} /></button>
      </div>
      <div className="sheet">
        <div className="sheet-facts">
          <span className="code-chip lg">{code}</span>
          <Credits n={planned?.credits ?? info?.credits ?? 3} />
          {planned && <span className={`pill risk-${planned.risk}`}>{planned.status === 'in-progress' ? `Taking now · ${planned.term}` : planned.term}</span>}
          {planned?.ruleLabel && <span className="pill pill-soft">{planned.ruleLabel}</span>}
        </div>

        <div className="sheet-grid">
          <div className="fact"><span>Published offerings</span>
            <div className="chips">{info?.offered.length ? info.offered.map(t => <span key={t} className="chip">{t}<small>{info.seats[t]} seats</small></span>) : <span className="muted">{info ? 'Not on the published schedule yet' : 'Looking up…'}</span>}</div>
          </div>
          <div className="fact"><span>Prerequisites</span><p>{info ? prereqText(info.prereq) || 'None listed' : '…'}</p></div>
        </div>
        {planned?.notes.length ? <ul className="note-list">{planned.notes.map(n => <li key={n}><Icon name="info" size={15} />{n}</li>)}</ul> : null}

        <h3 className="sheet-h">Try a change</h3>
        <div className="choice-row">
          {inProgress && <button className={`choice ${choice?.kind === 'drop' ? 'on' : ''}`} onClick={() => setChoice({ kind: 'drop' })}>Drop it this term</button>}
          {laterTerms.map(t => (
            <button key={t} className={`choice ${choice?.kind === 'defer' && choice.term === t ? 'on' : ''}`} onClick={() => setChoice({ kind: 'defer', term: t })}>
              {t}{info && !info.offered.includes(t) && info.offered.length > 0 && compareTerms(t, [...info.offered].sort(compareTerms).at(-1)!) <= 0 ? <small>not offered</small> : null}
            </button>
          ))}
          {edited && <button className={`choice restore ${choice?.kind === 'restore' ? 'on' : ''}`} onClick={() => setChoice({ kind: 'restore' })}><Icon name="undo" size={14} /> Undo my change</button>}
        </div>

        {result && (
          <div className={`impact ${delta === 1 ? 'worse' : delta === -1 ? 'better' : result.finish ? 'same' : 'worse'}`}>
            <div className="impact-finish">
              <div><span>Finish now</span><strong>{now ?? 'Not reachable'}</strong></div>
              <FlyArrow size={30} playKey={`${choice?.kind}-${later}`} />
              <div><span>After this change</span><strong>{later ?? 'Not reachable'}</strong></div>
            </div>
            <p>
              {choice?.kind === 'restore' ? 'Back to your original placement.'
                : newTerm ? `${code} lands in ${newTerm}.` : `${code} can't be placed: ${result.blocked.find(b => b.code === code)?.reason ?? 'no matching offering'}.`}
              {delta === 1 && ' This delays graduation.'}{delta === 0 && ' Graduation stays the same.'}
            </p>
          </div>
        )}

        <div className="sheet-actions">
          <button className="btn btn-ghost" onClick={() => setChoice(null)} disabled={!choice}>Clear</button>
          <button className="btn btn-gold" disabled={!nextEdits} onClick={() => { if (nextEdits) s.setEdits(nextEdits); setChoice(null); }}>
            <Icon name="check" /> Apply to my plan
          </button>
        </div>
      </div>
    </aside>
  );
}
