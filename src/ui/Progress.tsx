import { useMemo, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import { compareTerms } from '../core/terms.ts';
import { Credits, Icon, Ring, coverageColor } from './bits.tsx';

export function Progress({ s, onRoadmap, onRefresh, refreshing }: { s: DegreePathState; onRoadmap: () => void; onRefresh: () => void; refreshing: boolean }) {
  const p = s.pathway!;
  const [open, setOpen] = useState<string | null>(null);
  const blocks = useMemo(() => [...p.blocks].sort((a, b) => a.percent - b.percent), [p.blocks]);
  const history = useMemo(() => {
    const byTerm = new Map<string, typeof p.completed>();
    for (const c of p.completed) {
      const t = c.term || 'Earlier';
      byTerm.set(t, [...(byTerm.get(t) ?? []), c]);
    }
    return [...byTerm.entries()].sort((a, b) => compareTerms(b[0], a[0]));
  }, [p.completed]);
  const finish = s.baseline?.finish;

  return (
    <main className="page progress-page">
      <section className="hero-card">
        <Ring value={p.percent} label="complete" />
        <div className="hero-body">
          <span className="eyebrow">{p.level} · Catalog {p.catalog}</span>
          <h1>{p.program}</h1>
          {p.concentration && <p className="hero-sub">{p.concentration}</p>}
          <div className="stat-row">
            <div className="stat"><span>Credit hrs applied</span><strong>{p.credits.applied}</strong></div>
            <div className="stat"><span>Credit hrs in progress</span><strong>{p.credits.inProgress}</strong></div>
            <div className="stat accent"><span>Projected finish</span><strong>{finish ?? 'Needs a plan'}</strong></div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-gold btn-lg" onClick={onRoadmap}><Icon name="map" /> Open my roadmap</button>
            <button className="btn btn-soft" onClick={onRefresh} disabled={refreshing}>
              <Icon name="refresh" className={refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh from DegreeWorks'}
            </button>
          </div>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <header className="panel-head"><h2>Requirements</h2><span className="count">{blocks.filter(b => b.percent < 100).length} open</span></header>
          <ul className="req-list">
            {blocks.map(b => {
              const isOpen = open === b.title;
              return (
                <li key={b.title} className={`req ${isOpen ? 'open' : ''}`}>
                  <button className="req-row" onClick={() => setOpen(isOpen ? null : b.title)} aria-expanded={isOpen}>
                    <span className="req-chevron"><Icon name="chevron" size={16} /></span>
                    <span className="req-title">{b.title}</span>
                    <span className={`pill ${b.percent >= 100 ? 'pill-good' : 'pill-gold'}`}>{b.percent >= 100 ? 'Complete' : `${b.percent}%`}</span>
                    <span className="req-bar"><i style={{ width: `${b.percent}%`, background: coverageColor(b.percent) }} /></span>
                  </button>
                  {isOpen && (
                    <ul className="rule-list">
                      {b.rules.length ? b.rules.map(r => (
                        <li key={r.label} className={r.done ? 'done' : ''}>
                          <span className="rule-mark">{r.done ? <Icon name="check" size={14} /> : <i />}</span>
                          <span>{r.label}</span>
                          {!r.done && <span className="rule-pct">{r.percent}%</span>}
                        </li>
                      )) : <li className="muted">No rule details listed.</li>}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="stack">
          <section className="panel">
            <header className="panel-head"><h2>This term</h2><span className="count">{p.activeTerm}</span></header>
            <ul className="course-tiles">
              {p.inProgress.map(c => (
                <li key={c.code} className="course-tile in-progress">
                  <span className="code-chip">{c.code}</span>
                  <strong>{c.title}</strong>
                  <Credits n={c.credits} />
                </li>
              ))}
              {!p.inProgress.length && <li className="muted">No courses in progress.</li>}
            </ul>
          </section>

        </div>
      </div>
          <section className="panel history-panel">
        <details className="history" open>
          <summary><span className="req-chevron"><Icon name="chevron" size={16} /></span><h2>Course history</h2><span className="count">{p.completed.length} courses</span></summary>
          <div className="history-grid">
          {history.map(([term, list]) => (
            <div key={term} className="history-term">
              <h3>{term}<span>{list.reduce((n, c) => n + c.credits, 0)} credit hrs</span></h3>
              <ul className="history-chips">
                {list.map(c => <li key={c.code + term} title={c.title}><b>{c.code}</b><span>{c.title}</span><em>{c.credits}</em></li>)}
              </ul>
            </div>
          ))}
          </div>
        </details>
      </section>
    </main>
  );
}
