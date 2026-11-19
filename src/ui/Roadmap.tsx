import { useRef, useState, type ReactNode } from 'react';
import type { DegreePathState } from '../store.ts';
import type { Plan } from '../core/types.ts';
import { describeAction } from '../core/agent.ts';
import { FlyArrow, Icon, Modal, coverageColor, riskLabel } from './bits.tsx';
import { CourseDrawer } from './CourseSheet.tsx';
import { AddCourse } from './AddCourse.tsx';
import { WorkloadBox } from './Workload.tsx';
import { workloadLine } from '../core/d2l.ts';

export function Roadmap({ s, onCompare, onAsk }: { s: DegreePathState; onCompare: () => void; onAsk: (q: string) => void }) {
  const workloadFor = (code: string): ReactNode => s.workload?.courses[code] ? <WorkloadBox work={s.workload.courses[code]} /> : null;
  const [view, setView] = useState<'whatif' | 'baseline'>('whatif');
  const [open, setOpen] = useState<string | null>(null);
  const [explain, setExplain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const rows = useRef<Record<string, HTMLElement | null>>({});
  const plan: Plan | null = view === 'baseline' ? s.baseline : s.plan;
  if (!plan || !s.baseline) return null;
  const changed = s.editCount > 0;
  const moved = new Set(s.moves.map(m => m.code));
  const cap = (label: string) => (label.startsWith('Summer') ? Math.min(9, s.settings.maxCredits) : s.settings.maxCredits);

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
  const jump = (label: string) => rows.current[label]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const blockedOpen = open && plan.blocked.some(b => b.code === open);

  return (
    <main className="page rm">
      {/* Finish + settings */}
      <section className="rm-head">
        <div className="rm-finish">
          <span>{changed ? 'Original finish' : 'Projected finish'}</span>
          <strong>{s.baseline.finish ?? 'Not reachable'}</strong>
        </div>
        {changed && <>
          <FlyArrow size={34} playKey={String(s.plan?.finish)} />
          <div className={`rm-finish ${s.plan?.finish === s.baseline.finish ? 'same' : 'changed'}`}>
            <span>With your changes</span>
            <strong>{s.plan?.finish ?? 'Not reachable'}</strong>
          </div>
        </>}
        <div className="rm-controls">
          <div className="seg" role="group" aria-label="Credit hours per term">
            <span className="seg-label">Credit hrs / term</span>
            {[12, 15, 18].map(n => <button key={n} className={s.settings.maxCredits === n ? 'on' : ''} onClick={() => s.setSettings({ ...s.settings, maxCredits: n })}>{n}</button>)}
          </div>
          <button className={`toggle ${s.settings.summer ? 'on' : ''}`} onClick={() => s.setSettings({ ...s.settings, summer: !s.settings.summer })} aria-pressed={s.settings.summer}>
            <i /> Summer
          </button>
        </div>
      </section>

      {/* The path */}
      <section className="journey" aria-label="Path to graduation">
        {plan.terms.map((t, i) => (
          <button key={t.label} className={`jn ${i === 0 && t.courses.every(c => c.status === 'in-progress') ? 'now' : ''}`} onClick={() => jump(t.label)}>
            <span className="jn-dot" style={{ background: coverageColor(t.percentAfter) }} />
            <span className="jn-term">{t.label}</span>
            <span className="jn-meta">{t.credits} cr hrs · <b style={{ color: coverageColor(t.percentAfter) }}>{t.percentAfter}%</b></span>
          </button>
        ))}
        <span className={`jn grad ${plan.finish ? '' : 'none'}`}>
          <span className="jn-dot"><Icon name="sparkle" size={14} /></span>
          <span className="jn-term">{plan.finish ? 'Graduate' : 'Not reachable'}</span>
          <span className="jn-meta">{plan.finish ?? 'Fix blocked courses'}</span>
        </span>
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
              <button key={b.code} className={`blocked-card ${open === b.code ? 'sel' : ''}`} onClick={() => setOpen(open === b.code ? null : b.code)}>
                <b>{b.code}</b><span>{b.title}</span><em>{b.reason}</em>
              </button>
            ))}
          </div>
          {blockedOpen && <CourseDrawer key={open} s={s} code={open!} onClose={() => setOpen(null)} workload={workloadFor(open!)} />}
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
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Semester rows */}
      <section className="trows">
        {plan.terms.map((t, i) => {
          const openHere = open && t.courses.some(c => c.code === open);
          const current = i === 0 && t.courses.every(c => c.status === 'in-progress');
          return (
            <article key={t.label} ref={el => { rows.current[t.label] = el; }} className={`trow ${current ? 'current' : ''} ${plan.finish === t.label ? 'final' : ''}`}>
              <header className="trow-side">
                <span className="trow-idx">{String(i + 1).padStart(2, '0')}{current && <em>Now</em>}</span>
                <h3>{t.label}</h3>
                <span className="trow-hrs"><b>{t.credits}</b> / {cap(t.label)} credit hrs</span>
                <div className="trow-cov">
                  <div className="coverage-bar"><i style={{ width: `${t.percentAfter}%`, background: coverageColor(t.percentAfter) }} /></div>
                  <span>Degree <b style={{ color: coverageColor(t.percentAfter) }}>{t.percentAfter}%</b> done after</span>
                </div>
              </header>
              <div className="trow-main">
                <ul className="trow-courses">
                  {t.courses.map(c => (
                    <li key={c.code}>
                      <button className={`chipcard risk-${c.status === 'in-progress' ? 'now' : c.risk} ${moved.has(c.code) && view === 'whatif' ? 'pulse' : ''} ${open === c.code ? 'sel' : ''}`}
                        onClick={() => setOpen(open === c.code ? null : c.code)} aria-expanded={open === c.code}>
                        <span className="cc-row"><span className="code-chip">{c.code}</span><span className="cc-hrs"><b>{c.credits}</b> cr hrs</span></span>
                        <strong className="cc-title">{c.title}</strong>
                        <span className="cc-status"><i />{c.status === 'in-progress' ? 'Taking now' : riskLabel[c.risk]}{c.status === 'in-progress' && workloadLine(s.workload?.courses[c.code]) ? <em> · {workloadLine(s.workload?.courses[c.code])}</em> : c.notes[0] ? <em> · {c.notes[0]}</em> : null}</span>
                        <span className="chev"><Icon name="chevron" size={14} /></span>
                      </button>
                    </li>
                  ))}
                </ul>
                {openHere && <CourseDrawer key={open} s={s} code={open!} onClose={() => setOpen(null)} workload={workloadFor(open!)} />}
              </div>
              {plan.finish === t.label && <footer className="grad-line"><Icon name="sparkle" size={16} /> Graduate after {t.label}</footer>}
            </article>
          );
        })}
        {plan.terms.length === 0 && <p className="muted">{plan.blocked.length ? 'No courses can be placed with these changes. Undo a change above or open a blocked course.' : 'Nothing left to schedule.'}</p>}
      </section>

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
            <li><b>Coverage</b> is credit hours earned by the end of each term out of everything your plan needs.</li>
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
