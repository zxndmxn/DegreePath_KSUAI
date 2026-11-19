import { useEffect, useRef, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import { api, type BridgeStatus } from '../api.ts';
import { applyAction, buildContext, describeAction, groundQuestion, type AgentAction } from '../core/agent.ts';
import { Icon } from './bits.tsx';

interface Msg { role: 'user' | 'assistant'; content: string; sent?: string; actions?: AgentAction[]; applied?: boolean[]; streaming?: boolean }

const STARTERS = [
  'What do I have left to graduate?',
  'What happens if I drop my capstone?',
  'Can I graduate any sooner?',
  'Make my next semester lighter',
];

export function Chat({ s, status, open, onClose, seed, onSeedUsed }:
  { s: DegreePathState; status: BridgeStatus | null; open: boolean; onClose: () => void; seed: string | null; onSeedUsed: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const online = !!status?.agent.running && !!status.agent.model;

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => { if (open && seed) { void send(seed); onSeedUsed(); } }, [open, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = s.pathway!;
  const context = s.plan ? buildContext(p, s.plan, s.edits, s.settings, s.catalog, s.baseline?.finish ?? null) : '';
  const [warm, setWarm] = useState<'idle' | 'warming' | 'ready'>('idle');
  useEffect(() => {
    if (!open || !online || !context || busy) return;
    setWarm('warming');
    const t = setTimeout(() => { api.warmAgent(context).then(() => setWarm('ready')).catch(() => setWarm('idle')); }, 600);
    return () => clearTimeout(t);
  }, [open, online, context]); // eslint-disable-line react-hooks/exhaustive-deps
  const known = new Set([...Object.keys(s.catalog), ...p.inProgress.map(c => c.code), ...p.open.flatMap(r => r.options)]);
  const inProgress = new Set(p.inProgress.map(c => c.code));

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy || !s.plan) return;
    const fact = groundQuestion(question, p, s.catalog, s.edits, s.settings);
    const next: Msg[] = [...msgs, { role: 'user', content: question, sent: fact ? `${question}\n\n[PLANNER RESULT, verified, restate it: ${fact}]` : question }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const r = await api.agentStream(next.map(m => ({ role: m.role, content: m.sent ?? m.content })), context,
        text => setMsgs([...next, { role: 'assistant', content: text, streaming: true }]));
      const actions = r.actions.filter(a => applyAction(a, s.edits, s.settings, known, inProgress));
      setMsgs([...next, { role: 'assistant', content: r.reply, actions, applied: actions.map(() => false) }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: e instanceof Error ? e.message : 'The local agent did not answer.' }]);
    } finally { setBusy(false); }
  }

  function apply(mi: number, ai: number) {
    const a = msgs[mi].actions![ai];
    const r = applyAction(a, s.edits, s.settings, known, inProgress);
    if (!r) return;
    s.setDraft(r);
    setMsgs(ms => ms.map((m, i) => i === mi ? { ...m, applied: m.applied!.map((x, j) => j === ai ? true : x) } : m));
  }

  function outcome(a: AgentAction): string {
    const r = applyAction(a, s.edits, s.settings, known, inProgress);
    if (!r) return '';
    const plan = s.preview(r.edits, r.settings);
    const before = s.plan?.finish ?? 'not reachable';
    const after = plan?.finish ?? 'not reachable';
    return before === after ? `Finish stays ${after}` : `Finish ${before} → ${after}`;
  }

  return (
    <aside className={`chat ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="DegreePath assistant">
      <header className="chat-head">
        <div>
          <h2><Icon name="sparkle" size={18} /> Ask DegreePath</h2>
          <span className={`status-dot ${online ? 'on' : 'off'}`}>{!online ? 'Agent offline' : warm === 'warming' ? 'Reading your plan…' : `Local agent · ${status!.agent.model} · on this computer`}</span>
        </div>
        <button className="icon-btn big" onClick={onClose} aria-label="Close assistant"><Icon name="close" size={22} /></button>
      </header>

      <div className="chat-body" ref={scroller}>
        {msgs.length === 0 && (
          <div className="chat-empty">
            <p>I know your audit, your roadmap and the live KSU schedule. Ask anything about your path. Every change I suggest is checked by the planner before you apply it.</p>
            {!online && <p className="chat-offline">The assistant is optional and is off right now. Everything else in DegreePath works without it. To turn it on, install Ollama and run <code>npm run agent:setup</code> once.</p>}
            <div className="starter-grid">
              {STARTERS.map(q => <button key={q} className="starter" disabled={!online} onClick={() => void send(q)}>{q}</button>)}
            </div>
          </div>
        )}
        {msgs.filter(m => !(m.streaming && !m.content)).map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.streaming ? 'streaming' : ''}`}>
            <p>{m.content}{m.streaming && <i className="caret" />}</p>
            {m.actions?.length ? (
              <div className="msg-actions">
                {m.actions.map((a, j) => (
                  <button key={j} className={`action-chip ${m.applied?.[j] ? 'done' : ''}`} onClick={() => apply(i, j)} disabled={m.applied?.[j]}>
                    <span>{m.applied?.[j] ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />} {describeAction(a)}</span>
                    <small>{m.applied?.[j] ? 'Applied to your roadmap' : outcome(a)}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {busy && !msgs.at(-1)?.streaming && <div className="msg assistant typing"><i /><i /><i /></div>}
      </div>

      <form className="chat-input" onSubmit={e => { e.preventDefault(); void send(text); }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder={online ? 'Ask about your path…' : 'Agent offline'} disabled={!online || busy} maxLength={600} />
        <button className="send" type="submit" disabled={!online || busy || !text.trim()} aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </aside>
  );
}
