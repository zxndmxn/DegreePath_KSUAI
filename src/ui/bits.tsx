import type { ReactNode } from 'react';
import type { Risk } from '../core/types.ts';

const paths: Record<string, ReactNode> = {
  logo: <><path d="M7 21V5m0 10c0-7 10-2 10-10" /><circle cx="7" cy="4.5" r="2" /><circle cx="17" cy="4.5" r="2" /><circle cx="7" cy="20" r="2" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
  close: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  chat: <path d="M5 18.5V6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H9z" />,
  send: <><path d="m5 12 14-7-5 14-3-6z" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>,
  upload: <><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14m6-12v14" /></>,
  compare: <><path d="M8 4v16M16 4v16" /><path d="M4 8h4m8 8h4" /></>,
  bookmark: <path d="M7 4h10v16l-5-3.5L7 20z" />,
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  undo: <><path d="M9 7 4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -6)" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  sparkle: <path d="M12 3.5 13.8 10 20.5 12l-6.7 2-1.8 6.5-1.8-6.5L3.5 12l6.7-2z" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
};

export function Icon({ name, size = 18, className }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Ring({ value, size = 168, stroke = 14, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} strokeLinecap="round"
          style={{ stroke: coverageColor(value) }} />
      </svg>
      <div className="ring-label"><strong>{value}%</strong>{label && <span>{label}</span>}</div>
    </div>
  );
}

// red -> orange -> gold -> green as coverage climbs
export function coverageColor(pct: number): string {
  if (pct >= 100) return 'var(--good)';
  if (pct >= 85) return 'var(--gold)';
  if (pct >= 60) return 'var(--orange)';
  return 'var(--bad)';
}

export const riskLabel: Record<Risk, string> = {
  done: 'Done', good: 'On track', watch: 'Watch', moved: 'Moved', blocked: 'Blocked',
};

export function Credits({ n }: { n: number }) {
  return <span className="credits" title={`${n} credit hours`}><b>{n}</b><i>Credit Hrs</i></span>;
}

export function CourseTag({ code, title, tone }: { code: string; title?: string; tone?: 'hot' | 'bad' }) {
  return (
    <span className={`course-tag ${tone ? `tag-${tone}` : ''}`} title={title}>
      <b>#{code.replace(' ', ' ')}</b>{title && <span>{title}</span>}
    </span>
  );
}

// Arrow that flies out top-right and re-enters from bottom-left. Re-key it to replay.
export function FlyArrow({ size = 34, playKey }: { size?: number; playKey?: string }) {
  return (
    <span className="fly-arrow" key={playKey} style={{ width: size + 18, height: size + 18 }} aria-hidden="true">
      <span className="fly-arrow-inner"><Icon name="arrow" size={size} /></span>
    </span>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn big" onClick={onClose} aria-label="Close"><Icon name="close" size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
