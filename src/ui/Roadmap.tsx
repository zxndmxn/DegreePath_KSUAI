import { useState } from 'react';
import type { DegreePathState } from '../store.ts';
import type { Plan } from '../core/types.ts';
import { describeAction } from '../core/agent.ts';
import { Credits, FlyArrow, Icon, Modal, coverageColor, riskLabel } from './bits.tsx';
import { CourseSheet } from './CourseSheet.tsx';
import { AddCourse } from './AddCourse.tsx';

export function Roadmap({ s, onCompare, onAsk }: { s: DegreePathState; onCompare: () => void; onAsk: (q: string) => void }) {
  const [view, setView] = useState<'whatif' | 'baseline'>('whatif');
  const [sheet, setSheet] = useState<string | null>(null);
  const [explain, setExplain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const plan: Plan | null = view === 'baseline' ? s.baseline : s.plan;
  if (!plan || !s.baseline) return null;
  const changed = s.editCount > 0;
  const moved = new Set(s.moves.map(m => m.code));

  const editChips = [
    ...s.edits.drop.filter(c => !(c in s.edits.defer)).map(c => ({ code: c, label: describeAction({ type: 'drop', code: c }) })),
    ...Object.entries(s.edits.defer).map(([c, t]) => ({ code: c, label: describeAction({ type: 'defer', code: c, term: t }) })),
    ...s.edits.add.map(c => ({ code: c, label: describeAction({ type: 'add', code: c }) })),
  ];
  const undo = (code: string) => {
    const e = { ...s.edits, drop: s.edits.drop.filter(c => c !== code), add: s.edits.add.filter(c => c !== code), defer: { ...s.edits.defer } };
    delete e.defer[code];
    s.setEdits(e);
  };

  return (
    <main className="page roadmap-page">
      <section className="finish-hero">
        <div className="finish-block">
          <span>{changed ? 'Original finish' : 'Projected finish'}</span>
          <strong>{s.baseline.finish ?? 'Not reachable'}</strong>
        </div>
        {changed && <>
          <FlyArrow size={40} playKey={String(s.plan?.finish)} />
          <div className={`finish-block ${s.plan?.finish === s.baseline.finish ? 'same' : 'changed'}`}>
            <span>With your changes</span>
            <strong>{s.plan?.finish ?? 'Not reachable'}</strong>
          </div>
        </>}
        <div className="finish-controls">
          <div className="seg" role="group" aria-label="Credits per term">
            <span className="seg-label">Credit hrs / term</span>
            {[12, 15, 18].map(n => <button key={n} className={s.settings.maxCredits === n ? 'on' : ''} onClick={() => s.setSettings({ ...s.settings, maxCredits: n })}>{n}</button>)}
          </div>
          <button className={`toggle ${s.settings.summer ? 'on' : ''}`} onClick={() => s.setSettings({ ...s.settings, summer: !s.settings.summer })} aria-pressed={s.settings.summer}>
            <i /> Summer
          </button>
        </div>
      </section>

      {changed && (
        <section className="change-bar">
          <div className="change-chips">
            {editChips.map(c => (
              <span key={c.label} className="edit-chip">{c.label}<button onClick={() => undo(c.code)} aria-label={`Undo ${c.label}`}><Icon name="close" size={14} /></button></span>
            ))}
          </div>
          <div className="change-actions">
            <div className="seg small">
              <button className={view === 'baseline' ? 'on' : ''} onClick={() => setView('baseline')}>Original</button>
              <button className={view === 'whatif' ? 'on' : ''} onClick={() => setView('whatif')}>What-if</button>
            </div>
            <button className="btn btn-soft" onClick={onCompare}><Icon name="compare" /> Compare</button>
            <button className="btn btn-gold" onClick={() => setSaving(true)}><Icon name="bookmark" /> Save plan</button>
            <button className="btn btn-ghost" onClick={s.reset}><Icon name="refresh" /> Reset</button>
          </div>
        </section>
      )}

      {plan.blocked.length > 0 && (
        <section className="blocked-panel">
          <h2><Icon name="info" size={20} /> {plan.blocked.length} course{plan.blocked.length > 1 ? 's' : ''} can't be scheduled</h2>
          <div className="blocked-cards">
            {plan.blocked.map(b => (
              <button key={b.code} className="blocked-card" onClick={() => setSheet(b.code)}>
                <b>{b.code}</b><span>{b.title}</span><em>{b.reason}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {plan.unresolved.length > 0 && (
        <section className="panel choose-panel">
          <header className="panel-head"><h2>Pick a course for these requirements</h2></header>
          {plan.unresolved.map(r => (
            <div key={r.id} className="choose-row">
              <strong>{r.label}</strong>
              <div className="chips">
                {r.options.slice(0, 12).map(code => (
                  <button key={code} className={`chip-btn ${s.edits.choose[r.id]?.includes(code) ? 'on' : ''}`}
                    onClick={() => s.setEdits({ ...s.edits, choose: { ...s.edits.choose, [r.id]: [code] } })}>{code}{s.catalog[code]?.title && <small>{s.catalog[code]!.title}</small>}</button>
                ))}
                {!r.options.length && <span className="muted">Any course. Add one below.</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className={`roadmap-body ${sheet ? 'with-panel' : ''}`}>
      <section className="timeline">
        {plan.terms.map((t, i) => (
          <article key={t.label} className={`term ${i === 0 && t.courses.every(c => c.status === 'in-progress') ? 'current' : ''}`}>
            <header>
              <div><span className="term-index">{String(i + 1).padStart(2, '0')}</span><h3>{t.label}</h3></div>
              <span className="term-credits"><b>{t.credits}</b> / {t.label.startsWith('Summer') ? Math.min(9, s.settings.maxCredits) : s.settings.maxCredits} credit hrs</span>
            </header>
            <div className="coverage">
              <div className="coverage-top"><span>Degree done after this term</span><strong style={{ color: coverageColor(t.percentAfter) }}>{t.percentAfter}%</strong></div>
              <div className="coverage-bar"><i style={{ width: `${t.percentAfter}%`, background: coverageColor(t.percentAfter) }} /></div>
            </div>
            <ul className="term-courses">
              {t.courses.map(c => (
                <li key={c.code}>
                  <button className={`course-card risk-${c.status === 'in-progress' ? 'now' : c.risk} ${moved.has(c.code) && view === 'whatif' ? 'pulse' : ''} ${sheet === c.code ? 'selected' : ''}`} onClick={() => setSheet(sheet === c.code ? null : c.code)} aria-pressed={sheet === c.code}>
                    <span className="course-meta"><span className="code-chip">{c.code}</span><span className="risk-tag">{c.status === 'in-progress' ? 'Taking now' : riskLabel[c.risk]}</span></span>
                    <strong>{c.title}</strong>
                    {c.notes[0] && <small>{c.notes[0]}</small>}
                    <Credits n={c.credits} />
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {plan.terms.length === 0 && <p className="muted">{plan.blocked.length ? 'No courses can be placed with these changes. Undo a change above or open a blocked course.' : 'Nothing left to schedule.'}</p>}
        {plan.finish && (
          <article className="term grad">
            <Icon name="sparkle" size={34} />
            <h3>Graduate</h3>
            <p>{plan.finish}</p>
          </article>
        )}
      </section>
      {sheet && <CourseSheet key={sheet} s={s} code={sheet} onClose={() => setSheet(null)} />}
      </div>

      <section className="roadmap-foot">
        <AddCourse s={s} />
        <div className="foot-links">
          <button className="link" onClick={() => onAsk('Can I graduate any sooner?')}><Icon name="sparkle" size={15} /> Ask how to finish sooner</button>
          <button className="link" onClick={() => setExplain(true)}><Icon name="info" size={15} /> How this is calculated</button>
        </div>
      </section>

      {explain && (
        <Modal title="How your roadmap is calculated" onClose={() => setExplain(false)}>
          <ul className="explain-list">
            <li><b>Your record</b> comes from your DegreeWorks audit: what you finished, what you are taking, and which requirements are still open.</li>
            <li><b>Offerings and seats</b> come from KSU's published class schedule through the DegreeWorks CLI. Past the published terms, a course is assumed to repeat in the same season and is marked Watch.</li>
            <li><b>Prerequisites</b> follow KSU's rules, including same-term co-requisites. Prerequisites your record can't confirm are flagged, never silently blocked.</li>
            <li><b>Coverage</b> is credits earned by the end of each term out of everything your plan needs.</li>
            <li><b>Colors:</b> <span className="legend risk-good">On track</span> <span className="legend risk-watch">Watch</span> <span className="legend risk-moved">Moved</span> <span className="legend risk-blocked">Blocked</span></li>
            <li>This is a planning tool. Confirm registration, withdrawals and financial aid with your advisor.</li>
          </ul>
        </Modal>
      )}

      {saving && (
        <Modal title="Save this plan" onClose={() => setSaving(false)}>
          <form className="save-form" onSubmit={e => { e.preventDefault(); s.savePlan(name.trim() || `Plan · ${s.plan?.finish ?? 'draft'}`); setSaving(false); setName(''); }}>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lighter spring" maxLength={60} />
            <button className="btn btn-gold" type="submit"><Icon name="bookmark" /> Save</button>
          </form>
        </Modal>
      )}
    </main>
  );
}
