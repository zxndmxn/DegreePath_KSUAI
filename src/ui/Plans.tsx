import type { DegreePathState } from '../store.ts';
import { emptyEdits } from '../core/plan.ts';
import { Icon } from './bits.tsx';

export function Plans({ s, onOpened }: { s: DegreePathState; onOpened: () => void }) {
  const courseTitles = new Map([
    ...Object.values(s.catalog).flatMap(course => course ? [[course.code, course.title] as const] : []),
    ...(s.pathway?.inProgress ?? []).map(course => [course.code, course.title] as const),
  ]);
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
            const preview = s.preview(p.edits, p.settings);
            const original = s.preview(emptyEdits(), p.settings);
            const finish = preview ? preview.finish : p.finish;
            const blockers = [
              ...(preview?.blocked ?? []).map(course => `${course.title || course.code}: ${course.reason}`),
              ...(preview?.unresolved ?? []).map(rule => rule.reviewReason ? `${rule.label}: ${rule.reviewReason}` : `Choose a course for ${rule.label}.`),
            ];
            const edits = [
              ...p.edits.drop.filter(code => !(code in p.edits.defer)).map(code => ({ code, action: 'Drop' })),
              ...Object.entries(p.edits.defer).map(([code, term]) => ({ code, action: `Delay to ${term}` })),
              ...p.edits.add.map(code => ({ code, action: 'Add' })),
              ...Object.values(p.edits.choose).flat().map(code => ({ code, action: 'Choose' })),
            ];
            const remaining = edits.slice(3);
            const editRow = ({ code, action }: typeof edits[number]) => (
              <li key={`${action}:${code}`}><span>{action}</span><strong>{courseTitles.get(code) || code}</strong>
                {courseTitles.has(code) && <small>{code}</small>}</li>
            );
            return (
              <article key={p.id} className="plan-card">
                <header><h3>{p.name}</h3><time dateTime={p.savedAt}>Saved {new Date(p.savedAt).toLocaleDateString()}</time></header>
                <div className="saved-plan-finish">
                  <span>Projected finish</span>
                  <strong>{finish ?? 'Needs attention'}</strong>
                  {original?.finish && original.finish !== finish && <small>Original finish: {original.finish}</small>}
                </div>
                {blockers.length > 0 && (
                  <div className="saved-plan-blockers">
                    <strong>{blockers.length} to resolve</strong>
                    <p>{blockers[0]}</p>
                    {blockers.length > 1 && <details><summary>See all blockers</summary><ul>{blockers.slice(1).map((blocker, index) => <li key={index}>{blocker}</li>)}</ul></details>}
                  </div>
                )}
                {edits.length > 0 ? (
                  <div>
                    <h4>{edits.length} course {edits.length === 1 ? 'change' : 'changes'}</h4>
                    <ul className="saved-plan-edits">{edits.slice(0, 3).map(editRow)}</ul>
                    {remaining.length > 0 && <details><summary>Show {remaining.length} more</summary><ul className="saved-plan-edits">{remaining.map(editRow)}</ul></details>}
                  </div>
                ) : <p className="muted">No course changes</p>}
                <p className="muted">{p.settings.maxCredits} credits per term · {p.settings.summer ? 'Summer included' : 'Summer off'}</p>
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
