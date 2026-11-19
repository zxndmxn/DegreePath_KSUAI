import { useRef, useState } from 'react';
import { api, type BridgeStatus } from '../api.ts';
import { parseAudit } from '../core/audit.ts';
import type { Pathway } from '../core/types.ts';
import { Icon } from './bits.tsx';

export function Welcome({ status, onLoaded }: { status: BridgeStatus | null; onLoaded: (p: Pathway) => void }) {
  const [busy, setBusy] = useState<'sync' | 'file' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function sync() {
    setBusy('sync'); setError(null);
    try { onLoaded(await api.syncAudit()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sync failed.'); setNeedsLogin(!!(e as { needsLogin?: boolean }).needsLogin); }
    finally { setBusy(null); }
  }
  async function signIn() {
    setBusy('sync'); setError(null);
    try { await api.login(); setNeedsLogin(false); onLoaded(await api.syncAudit()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed.'); }
    finally { setBusy(null); }
  }
  async function readFile(file?: File | null) {
    if (!file) return;
    setBusy('file'); setError(null);
    try {
      if (file.size > 5_000_000) throw new Error('Choose an audit file under 5 MB.');
      onLoaded(parseAudit(await file.text()));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read that file.'); }
    finally { setBusy(null); }
  }

  const signedIn = status?.degreeworks.signedIn;
  return (
    <main className="welcome">
      <div className="welcome-hero">
        <span className="eyebrow"><Icon name="sparkle" size={14} /> KSU degree planner</span>
        <h1>See every path<br />to your <em>graduation.</em></h1>
        <p>Bring in your DegreeWorks audit. DegreePath maps what is left against the live KSU schedule, then lets you try drops, delays and adds before you commit.</p>
      </div>

      <div className="welcome-cards">
        <button className="welcome-card primary" onClick={sync} disabled={busy !== null}>
          <span className="welcome-icon"><Icon name="refresh" size={26} /></span>
          <strong>{busy === 'sync' ? 'Syncing your audit…' : 'Sync from DegreeWorks'}</strong>
          <span>{signedIn === false ? 'Sign in once on this computer, then sync.' : 'One click. Renews your DegreeWorks session automatically.'}</span>
          <span className={`status-dot ${signedIn ? 'on' : signedIn === false ? 'off' : ''}`}>{signedIn ? 'Session ready' : signedIn === false ? 'Not signed in' : 'Checking…'}</span>
        </button>

        <label className={`welcome-card drop ${drag ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); void readFile(e.dataTransfer.files[0]); }}>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => void readFile(e.target.files?.[0])} />
          <span className="welcome-icon"><Icon name="upload" size={26} /></span>
          <strong>{busy === 'file' ? 'Reading…' : 'Upload your audit file'}</strong>
          <span>Drag the JSON from <code>dw --json audit</code> here, or browse for it.</span>
          <span className="fake-btn" aria-hidden="true"><Icon name="upload" size={16} /> Choose file</span>
        </label>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          {needsLogin && <button className="btn btn-gold" onClick={signIn} disabled={busy !== null}><Icon name="lock" /> Sign in to DegreeWorks</button>}
        </div>
      )}

      <p className="privacy-note"><Icon name="lock" size={15} /> Runs on this computer. Grades, GPA, name and student ID are never kept.</p>
    </main>
  );
}
