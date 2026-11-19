import { useMemo, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import type { PlanEdits } from '../core/types.ts';
import { prereqText } from '../core/catalog.ts';
import { compareTerms, nextTerm } from '../core/terms.ts';
import { FlyArrow, Icon, riskLabel } from './bits.tsx';

type Choice = { kind: 'drop' } | { kind: 'defer'; term: string } | { kind: 'restore' };

export function CourseSheet({ s, code, onClose }: { s: DegreePathState; code: string; onClose: () => void }) {
  const p = s.pathway!;
  const info = s.catalog[code];
  const inProgress = p.inProgress.some(c => c.code === code);
  const planned = s.plan?.terms.flatMap(t => t.courses.map(c => ({ ...c, term: t.label }))).find(c => c.code === code);
  const blocked = s.plan?.blocked.find(b => b.code === code);
  const title = planned?.title ?? blocked?.title ?? info?.title ?? code;
  const credits = planned?.credits ?? info?.credits ?? 3;
  const edited = s.edits.drop.includes(code) || code in s.edits.defer || s.edits.add.includes(code);
  const [choice, setChoice] = useState<Choice | null>(null);

  const laterTerms = useMemo(() => {
    const out: string[] = [];
    let t = planned?.term ?? p.activeTerm;
    for (let i = 0; i < 6; i++) { t = nextTerm(t, s.settings.summer); out.push(t); }
    return out;
  }, [planned?.term, p.activeTerm, s.settings.summer]);
  const lastPublished = info?.offered.length ? [...info.offered].sort(compareTerms).at(-1)! : null;
  const offeredFlag = (t: string) => !info || !info.offered.length ? 'unknown'
    : info.offered.includes(t) ? 'yes' : compareTerms(t, lastPublished!) <= 0 ? 'no' : 'assumed';

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
  const after = result ? result.finish : null;
  const lands = result?.terms.find(t => t.courses.some(c => c.code === code))?.label;
  const delta = result && now && after ? Math.sign(compareTerms(after, now)) : null;
  const tone = !result ? '' : !after ? 'bad' : delta === 1 ? 'worse' : 'ok';
  const status = planned ? (planned.status === 'in-progress' ? 'Taking now' : riskLabel[planned.risk]) : blocked ? 'Blocked' : 'Not planned';

  return (
    <aside className="cp" aria-label={`${code} details`}>
      <header className="cp-head">
        <div className="cp-id">
          <span className="code-chip">{code}</span>
          <span className="cp-hrs"><b>{credits}</b> credit hrs</span>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close course details"><Icon name="close" size={20} /></button>
        <h2>{title}</h2>
        <div className="cp-tags">
          <span className={`cp-status risk-${planned?.status === 'in-progress' ? 'now' : planned?.risk ?? 'blocked'}`}><i />{status}{planned ? ` · ${planned.term}` : ''}</span>
          {planned?.ruleLabel && <span className="cp-rule">{planned.ruleLabel}</span>}
        </div>
      </header>

      <div className="cp-body">
        <section className="cp-sec">
          <h3>Offered</h3>
          <div className="cp-offers">
            {info?.offered.length ? info.offered.map(t => <span key={t}>{t}<small>{info.seats[t]} seats</small></span>)
              : <em>{info ? 'Not on the published KSU schedule yet' : 'Checking the KSU schedule…'}</em>}
          </div>
        </section>
        <section className="cp-sec">
          <h3>Prerequisites</h3>
          <p>{info ? prereqText(info.prereq) || 'None listed' : '…'}</p>
        </section>
        {(planned?.notes.length || blocked) ? (
          <section className="cp-sec">
            <h3>Heads up</h3>
            <ul className="cp-notes">{[...(planned?.notes ?? []), ...(blocked ? [blocked.reason] : [])].map(n => <li key={n}>{n}</li>)}</ul>
          </section>
        ) : null}

        <section className="cp-sec">
          <h3>Try a change</h3>
          <div className="cp-actions">
            {inProgress && (
              <button className={`cp-opt wide ${choice?.kind === 'drop' ? 'on' : ''}`} onClick={() => setChoice({ kind: 'drop' })}>
                Drop it this term
              </button>
            )}
            {edited && (
              <button className={`cp-opt wide ${choice?.kind === 'restore' ? 'on' : ''}`} onClick={() => setChoice({ kind: 'restore' })}>
                <Icon name="undo" size={14} /> Undo my change
              </button>
            )}
          </div>
          <span className="cp-label">{inProgress ? 'Or retake it in' : 'Take it in'}</span>
          <div className="cp-terms">
            {laterTerms.map(t => {
              const f = offeredFlag(t);
              return (
                <button key={t} className={`cp-term ${choice?.kind === 'defer' && choice.term === t ? 'on' : ''} off-${f}`} onClick={() => setChoice({ kind: 'defer', term: t })}>
                  <span>{t}</span>
                  <small>{f === 'yes' ? 'Offered' : f === 'no' ? 'Not offered' : f === 'assumed' ? 'Likely' : 'Unknown'}</small>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className={`cp-foot ${tone}`}>
        {result ? (
          <>
            <div className="cp-impact">
              <div><span>Now</span><strong>{now ?? 'Not reachable'}</strong></div>
              <FlyArrow size={22} playKey={`${choice?.kind}-${after}`} />
              <div><span>After</span><strong>{after ?? 'Not reachable'}</strong></div>
            </div>
            <p>{choice?.kind === 'restore' ? 'Back to your original plan.'
              : lands ? `${code} moves to ${lands}.${delta === 1 ? ' Graduation slips.' : delta === 0 ? ' Graduation stays put.' : ''}`
              : `${code} can't be placed: ${result.blocked.find(b => b.code === code)?.reason ?? 'no matching offering'}.`}</p>
          </>
        ) : <p className="cp-hint">Pick a change to preview your new graduation date.</p>}
        <div className="cp-buttons">
          <button className="btn btn-ghost" onClick={() => setChoice(null)} disabled={!choice}>Clear</button>
          <button className="btn btn-gold" disabled={!nextEdits} onClick={() => { if (nextEdits) s.setEdits(nextEdits); setChoice(null); }}>
            <Icon name="check" /> Apply
          </button>
        </div>
      </footer>
    </aside>
  );
}
