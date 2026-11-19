import { useRef, useState } from 'react';
import { api, type BridgeStatus } from '../api.ts';
import { parseAudit } from '../core/audit.ts';
import type { Pathway } from '../core/types.ts';
import { Icon } from './bits.tsx';

export function Welcome({ status, onLoaded }: { status: BridgeStatus | null; onLoaded: (p: Pathway) => void }) {
  const [busy, setBusy] = useState<'sync' | 'login' | 'file' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function sync() {
    if (status && !status.degreeworks.signedIn) return signIn();
    setBusy('sync'); setError(null);
    try { onLoaded(await api.syncAudit()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sync failed.'); setNeedsLogin(!!(e as { needsLogin?: boolean }).needsLogin); }
    finally { setBusy(null); }
  }
  async function signIn() {
    setBusy('login'); setError(null);
    try { await api.connect(); setNeedsLogin(false); onLoaded(await api.syncAudit()); }
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
          <span className="welcome-icon"><Icon name={signedIn === false ? 'lock' : 'refresh'} size={26} /></span>
          <strong>{busy === 'login' ? 'Finish signing in…' : busy === 'sync' ? 'Syncing your audit…' : signedIn === false ? 'Connect your KSU account' : 'Sync from DegreeWorks'}</strong>
          <span>{busy === 'login'
            ? 'Use the KSU sign-in window that just opened. It closes on its own when you are done.'
            : signedIn === false
              ? 'Opens the KSU sign-in (same as Owl Express) once. Covers DegreeWorks and D2L.'
              : 'One click. Your KSU session renews automatically.'}</span>
          <span className={`status-dot ${signedIn ? 'on' : signedIn === false ? 'off' : ''}`}>{signedIn ? 'Connected' : signedIn === false ? 'Not connected' : 'Checking…'}</span>
        </button>

        <label className={`welcome-card drop ${drag ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); void readFile(e.dataTransfer.files[0]); }}>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => void readFile(e.target.files?.[0])} />
          <span className="welcome-icon"><Icon name="upload" size={26} /></span>
          <strong>{busy === 'file' ? 'Reading…' : 'Upload your audit file'}</strong>
          <span>Have an audit JSON already? Drag it here, or browse for it.</span>
          <span className="fake-btn" aria-hidden="true"><Icon name="upload" size={16} /> Choose file</span>
        </label>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          {needsLogin && <button className="btn btn-gold" onClick={signIn} disabled={busy !== null}><Icon name="lock" /> Connect your KSU account</button>}
        </div>
      )}

      <p className="privacy-note"><Icon name="lock" size={15} /> Runs on this computer. Grades, GPA, name and student ID are never kept.</p>
    </main>
  );
}
