import { useEffect, useMemo, useState } from 'react';
import type { DegreePathState } from '../store.ts';
import { Icon } from './bits.tsx';

type View = 'progress' | 'roadmap' | 'compare' | 'plans';
interface Hint { text: string; ask?: string }

function hintsFor(view: View, s: DegreePathState): Hint[] {
  const p = s.pathway!;
  const out: Hint[] = [];
  const blocked = s.plan?.blocked[0];
  if (blocked) out.push({ text: `${blocked.code} can't be placed right now. Want to know why?`, ask: `Why can't ${blocked.code} be scheduled, and how do I fix it?` });
  if (view === 'progress') {
    out.push({ text: 'Ask me what you still need to graduate.', ask: 'What do I have left to graduate?' });
    if (p.inProgress[0]) out.push({ text: `Curious what dropping ${p.inProgress[0].code} would do?`, ask: `What happens if I drop ${p.inProgress[0].code}?` });
  }
  if (view === 'roadmap') {
    out.push({ text: 'Click any course to preview a drop or a delay before you commit.' });
    out.push({ text: 'Want a lighter semester? I can check 12 credit hours for you.', ask: 'What if I take 12 credit hours per term?' });
    if (!s.settings.summer) out.push({ text: 'Summer terms can speed things up. Ask me.', ask: 'Would allowing summer terms help me finish sooner?' });
  }
  if (view === 'compare') out.push(s.moves.length
    ? { text: 'I can explain every move on this page.', ask: 'Explain what changed between my original plan and my what-if.' }
    : { text: 'Try a change on the roadmap and I will compare it here.' });
  if (view === 'plans') out.push({ text: 'Save a few versions, then ask me which one fits you best.', ask: 'Which saved plan finishes soonest with the lightest load?' });
  return out;
}

export function ChatFab({ s, view, chatOpen, online, onOpen }: { s: DegreePathState; view: View; chatOpen: boolean; online: boolean; onOpen: (q?: string) => void }) {
  // Without the optional AI, only show tips that don't need it.
  const hints = useMemo(() => hintsFor(view, s).filter(h => online || !h.ask), [view, s.plan, s.moves.length, s.settings.summer, online]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [muted, setMuted] = useState(() => sessionStorage.getItem('degreepath.hints') === 'off');

  useEffect(() => { setI(0); setShow(false); }, [view]);
  useEffect(() => {
    if (muted || chatOpen || !hints.length) { setShow(false); return; }
    const first = setTimeout(() => setShow(true), 4000);
    const cycle = setInterval(() => {
      setShow(false);
      setTimeout(() => { setI(x => (x + 1) % hints.length); setShow(true); }, 400);
    }, 28000);
    const hide = setInterval(() => setShow(false), 28000 + 9000);
    return () => { clearTimeout(first); clearInterval(cycle); clearInterval(hide); };
  }, [muted, chatOpen, hints.length, view]);

  if (chatOpen) return null;
  const hint = hints[i % Math.max(1, hints.length)];

  return (
    <div className="fab-wrap">
      {show && hint && (
        <div className="fab-hint" role="status">
          <button className="fab-hint-body" onClick={() => { setShow(false); if (hint.ask) onOpen(hint.ask); }}>
            <Icon name="sparkle" size={15} /> <span>{hint.text}</span>
          </button>
          <button className="fab-hint-x" aria-label="Stop hints" title="Stop hints"
            onClick={() => { setShow(false); setMuted(true); sessionStorage.setItem('degreepath.hints', 'off'); }}>
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
      <button className="fab" onClick={() => onOpen()} aria-label="Ask DegreePath">
        <Icon name="chat" size={24} />
        {show && <span className="fab-dot" />}
      </button>
    </div>
  );
}
