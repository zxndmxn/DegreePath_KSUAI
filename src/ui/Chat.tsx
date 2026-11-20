import { useEffect, useRef, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import { api, type BridgeStatus } from '../api.ts';
import { applyAction, buildContext, describeAction, groundQuestionResult, type AgentAction } from '../core/agent.ts';
import { Icon } from './bits.tsx';
import { dueWithin, shortDate } from '../core/d2l.ts';

interface Msg { role: 'user' | 'assistant'; content: string; sent?: string; actions?: AgentAction[]; applied?: boolean[]; streaming?: boolean }

const STARTERS = [
  'What do I have left to graduate?',
  "What's due this week?",
  'What happens if I drop my capstone?',
  'Can I graduate any sooner?',
  'Make my next semester lighter',
];

export function Chat({ s, status, open, onClose, seed, onSeedUsed, demo = false }:
  { s: DegreePathState; status: BridgeStatus | null; open: boolean; onClose: () => void; seed: string | null; onSeedUsed: () => void; demo?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const online = !!status?.agent.running && !!status.agent.model;

  const canAnswer = online || demo;

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => { if (open && seed) { void send(seed); onSeedUsed(); } }, [open, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = s.pathway!;
  const context = s.plan ? buildContext(p, s.plan, s.edits, s.settings, s.catalog, s.baseline?.finish ?? null, dueWithin(s.workload, 30)) : '';
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
    const verified = groundQuestionResult(question, p, s.catalog, s.edits, s.settings);
    if (demo) {
      setText('');
      setMsgs([...msgs, { role: 'user', content: question }, {
        role: 'assistant',
        content: verified?.reply ?? 'Try asking about dropping the capstone or changing the credit limit.',
        actions: verified?.actions,
        applied: verified?.actions.map(() => false),
      }]);
      return;
    }
    let dueFact: string | null = null;
    if (s.workload && /\b(due|deadline|assignment|homework|quiz|exam|this week|busy|workload)\b/i.test(question)) {
      const week = dueWithin(s.workload, 7);
      dueFact = week.length ? `Due in the next 7 days on D2L: ${week.map(i => `${i.code} ${i.title} (${shortDate(i.due)})`).join('; ')}.` : 'Nothing is due on D2L in the next 7 days.';
    }
    if (verified?.actions.length || (verified && /\b(drop|withdraw|credit|credits)\b/i.test(question))) {
      setText('');
      setMsgs([...msgs, { role: 'user', content: question }, {
        role: 'assistant', content: verified.reply, actions: verified.actions, applied: verified.actions.map(() => false),
      }]);
      return;
    }
    if (dueFact && /^(what(?:'s| is) due|show (?:me )?(?:what(?:'s| is) )?due) (?:this week|in the next 7 days)[?.!]*$/i.test(question)) {
      setText('');
      setMsgs([...msgs, { role: 'user', content: question }, { role: 'assistant', content: dueFact }]);
      return;
    }
    const fact = [verified?.reply, dueFact].filter(Boolean).join(' ') || null;
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
          <span className={`status-dot ${online ? 'on' : 'off'}`}>{demo ? 'Sample mode · planner answers' : !online ? (settingUp(status) ? 'Setting up…' : 'Agent offline') : warm === 'warming' ? 'Reading your plan…' : `Local agent · ${status!.agent.model} · on this computer`}</span>
        </div>
        <button className="icon-btn big" onClick={onClose} aria-label="Close assistant"><Icon name="close" size={22} /></button>
      </header>

      <div className="chat-body" ref={scroller}>
        {msgs.length === 0 && (
          <div className="chat-empty">
            <p>{demo ? 'Ask what happens if you change the sample plan. Answers come from the planner.' : 'I can answer questions using your audit, roadmap and KSU schedule. Suggested changes are checked by the planner before you apply them.'}</p>
            {!canAnswer && <p className="chat-offline">{setupNote(status)}</p>}
            <div className="starter-grid">
              {(demo ? STARTERS.slice(2) : STARTERS).map(q => <button key={q} className="starter" disabled={!canAnswer} onClick={() => void send(q)}>{q}</button>)}
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
        <input value={text} onChange={e => setText(e.target.value)} placeholder={canAnswer ? 'Ask about your path…' : settingUp(status) ? 'Assistant is setting up…' : 'Agent offline'} disabled={!canAnswer || busy} maxLength={600} />
        <button className="send" type="submit" disabled={!canAnswer || busy || !text.trim()} aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </aside>
  );
}

function settingUp(status: BridgeStatus | null) {
  const st = status?.agent.setup?.state;
  return st === 'installing' || st === 'downloading' || st === 'starting' || st === 'building';
}

function setupNote(status: BridgeStatus | null) {
  const setup = status?.agent.setup;
  if (settingUp(status)) return `${setup!.message} This happens once. Everything else in DegreePath works meanwhile.`;
  if (setup?.state === 'unavailable') return `${setup.message} Everything else in DegreePath works without it.`;
  return 'The assistant is off right now. Restart DegreePath with the launcher and it sets itself up. Everything else works without it.';
}
