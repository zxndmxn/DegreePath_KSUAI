import type { DegreePathState } from '../store.ts';
import type { Plan } from '../core/types.ts';
import { CourseTag, FlyArrow, Icon } from './bits.tsx';

function Column({ title, plan, highlight }: { title: string; plan: Plan; highlight: Set<string> }) {
  return (
    <div className="cmp-col">
      <h3>{title}</h3>
      {plan.terms.map(t => (
        <div key={t.label} className="cmp-term">
          <span className="cmp-term-label">{t.label}<small>{t.credits} credit hrs</small></span>
          <div className="chips">
            {t.courses.map(c => <CourseTag key={c.code} code={c.code} title={c.title} tone={highlight.has(c.code) ? 'hot' : undefined} />)}
          </div>
        </div>
      ))}
      {plan.blocked.length > 0 && (
        <div className="cmp-term blocked">
          <span className="cmp-term-label">Can't schedule</span>
          <div className="chips">{plan.blocked.map(b => <span key={b.code} className="blocked-line"><CourseTag code={b.code} title={b.title} tone="bad" /><small>{b.reason}</small></span>)}</div>
        </div>
      )}
      {plan.unresolved.length > 0 && (
        <div className="cmp-term blocked">
          <span className="cmp-term-label">Needs review</span>
          <ul>{plan.unresolved.map(rule => <li key={rule.id}>{rule.label}{rule.reviewReason && `: ${rule.reviewReason}`}</li>)}</ul>
        </div>
      )}
      {!plan.terms.length && !plan.blocked.length && !plan.unresolved.length && <p className="muted">Nothing left to schedule.</p>}
    </div>
  );
}

export function Compare({ s, onRoadmap, onSave }: { s: DegreePathState; onRoadmap: () => void; onSave: () => void }) {
  if (!s.baseline || !s.plan) return null;
  const hot = new Set(s.moves.map(m => m.code));
  const termsA = s.baseline.terms.length;
  const termsB = s.plan.terms.length;
  const blocked = s.plan.blocked.length + s.plan.unresolved.length;
  const finishText = (plan: Plan) => plan.finish ?? (plan.unresolved.length ? 'Needs review' : 'Not reachable');
  return (
    <main className="page compare-page">
      <section className="finish-hero compare-hero">
        <div className="finish-block"><span>Original</span><strong>{finishText(s.baseline)}</strong><small>{termsA} term{termsA === 1 ? '' : 's'}</small></div>
        <FlyArrow size={40} playKey={String(s.plan.finish)} />
        <div className={`finish-block ${s.plan.finish === s.baseline.finish ? 'same' : 'changed'}`}><span>Your what-if</span><strong>{finishText(s.plan)}</strong><small>{termsB} planned term{termsB === 1 ? '' : 's'}{blocked > 0 ? ` · ${blocked} to resolve` : ''}</small></div>
        <button className="btn btn-gold compare-save" onClick={onSave}><Icon name="bookmark" /> Save plan</button>
      </section>

      {s.moves.length === 0 && s.editCount === 0 && !blocked ? (
        <section className="empty-state">
          <Icon name="compare" size={40} />
          <h2>No changes yet</h2>
          <p>Open your roadmap and click any course to try a drop, a delay or an add. The comparison builds itself.</p>
          <button className="btn btn-gold btn-lg" onClick={onRoadmap}><Icon name="map" /> Open roadmap</button>
        </section>
      ) : (
        <>
          <section className="panel">
            <header className="panel-head"><h2>Course changes</h2><span className="count">{s.moves.length}</span></header>
            {s.moves.length === 0 && <p className="muted">No course placements changed. Check the plans below for anything that still needs attention.</p>}
            <ul className="move-list">
              {s.moves.map(m => (
                <li key={m.code}>
                  <span className="code-chip lg">{m.code}</span>
                  <span className="move-title">{m.title}</span>
                  <span className="move-path">
                    <span className="move-from">{m.from ?? (m.wasBlocked ? 'Blocked' : 'Not planned')}</span>
                    <Icon name="arrow" size={22} />
                    <span className={`move-to ${m.isBlocked ? 'bad' : ''}`}>{m.to ?? (m.isBlocked ? 'Blocked' : 'Removed')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="cmp-grid">
            <Column title="Original" plan={s.baseline} highlight={hot} />
            <Column title="What-if" plan={s.plan} highlight={hot} />
          </section>
        </>
      )}
    </main>
  );
}
