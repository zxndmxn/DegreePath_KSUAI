import type { DegreePathState } from '../store.ts';
import { describeAction } from '../core/agent.ts';
import { Icon } from './bits.tsx';

export function Plans({ s, onOpened }: { s: DegreePathState; onOpened: () => void }) {
  return (
    <main className="page plans-page">
      <h1 className="page-title">Saved plans</h1>
      {s.plans.length === 0 ? (
        <section className="empty-state">
          <Icon name="bookmark" size={40} />
          <h2>Nothing saved yet</h2>
          <p>Make a change on your roadmap, then hit Save plan to keep it here.</p>
        </section>
      ) : (
        <div className="plan-cards">
          {s.plans.map(p => {
            const edits = [
              ...p.edits.drop.filter(c => !(c in p.edits.defer)).map(c => describeAction({ type: 'drop', code: c })),
              ...Object.entries(p.edits.defer).map(([c, t]) => describeAction({ type: 'defer', code: c, term: t })),
              ...p.edits.add.map(c => describeAction({ type: 'add', code: c })),
            ];
            return (
              <article key={p.id} className="plan-card">
                <header><h3>{p.name}</h3><span className="pill pill-gold">{p.finish ?? 'Not reachable'}</span></header>
                <div className="chips">{edits.length ? edits.map(e => <span key={e} className="chip">{e}</span>) : <span className="muted">No course changes</span>}</div>
                <p className="muted">{p.settings.maxCredits} credits per term{p.settings.summer ? ' · summer on' : ''} · saved {new Date(p.savedAt).toLocaleDateString()}</p>
                <footer>
                  <button className="btn btn-gold" onClick={() => { s.openPlan(p.id); onOpened(); }}><Icon name="map" /> Open on roadmap</button>
                  <button className="btn btn-ghost" onClick={() => s.deletePlan(p.id)}>Delete</button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
