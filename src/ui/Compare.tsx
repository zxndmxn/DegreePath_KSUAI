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
      {!plan.terms.length && !plan.blocked.length && <p className="muted">Nothing left to schedule.</p>}
    </div>
  );
}

export function Compare({ s, onRoadmap }: { s: DegreePathState; onRoadmap: () => void }) {
  if (!s.baseline || !s.plan) return null;
  const hot = new Set(s.moves.map(m => m.code));
  const termsA = s.baseline.terms.length;
  const termsB = s.plan.terms.length;
  return (
    <main className="page compare-page">
      <section className="finish-hero compare-hero">
        <div className="finish-block"><span>Original</span><strong>{s.baseline.finish ?? 'Not reachable'}</strong><small>{termsA} term{termsA === 1 ? '' : 's'}</small></div>
        <FlyArrow size={40} playKey={String(s.plan.finish)} />
        <div className={`finish-block ${s.plan.finish === s.baseline.finish ? 'same' : 'changed'}`}><span>Your what-if</span><strong>{s.plan.finish ?? 'Not reachable'}</strong><small>{termsB} term{termsB === 1 ? '' : 's'}</small></div>
      </section>

      {s.moves.length === 0 ? (
        <section className="empty-state">
          <Icon name="compare" size={40} />
          <h2>No changes yet</h2>
          <p>Open your roadmap and click any course to try a drop, a delay or an add. The comparison builds itself.</p>
          <button className="btn btn-gold btn-lg" onClick={onRoadmap}><Icon name="map" /> Open roadmap</button>
        </section>
      ) : (
        <>
          <section className="panel">
            <header className="panel-head"><h2>What moved</h2><span className="count">{s.moves.length}</span></header>
            <ul className="move-list">
              {s.moves.map(m => (
                <li key={m.code}>
                  <span className="code-chip lg">{m.code}</span>
                  <span className="move-title">{m.title}</span>
                  <span className="move-path">
                    <span className="move-from">{m.from ?? 'Not planned'}</span>
                    <Icon name="arrow" size={22} />
                    <span className={`move-to ${m.to ? '' : 'bad'}`}>{m.to ?? 'Blocked'}</span>
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
