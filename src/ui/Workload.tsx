import type { CourseWork } from '../core/d2l.ts';
import { remaining, shortDate } from '../core/d2l.ts';
import { Icon } from './bits.tsx';

// D2L items left this term for one course: titles and due dates only.
export function WorkloadBox({ work }: { work: CourseWork }) {
  const left = remaining(work);
  return (
    <div className="workload">
      <div className="workload-head">
        <span><Icon name="info" size={14} /> This term on D2L</span>
        <b>{left.length ? `${left.length} due left` : 'All caught up'}</b>
      </div>
      {left.length > 0 && (
        <ul>
          {left.slice(0, 4).map(i => (
            <li key={i.title + i.due}><span className={`wk-type t-${i.type.toLowerCase()}`}>{i.type}</span><span className="wk-title">{i.title}</span><em>{shortDate(i.due)}</em></li>
          ))}
          {left.length > 4 && <li className="more">+{left.length - 4} more</li>}
        </ul>
      )}
    </div>
  );
}
