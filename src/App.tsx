import { useEffect, useState } from 'react';
import { api, type BridgeStatus } from './api.ts';
import { useDegreePath } from './store.ts';
import { Icon, Modal } from './ui/bits.tsx';
import { Welcome } from './ui/Welcome.tsx';
import { Progress } from './ui/Progress.tsx';
import { Roadmap } from './ui/Roadmap.tsx';
import { Compare } from './ui/Compare.tsx';
import { Plans } from './ui/Plans.tsx';
import { Chat } from './ui/Chat.tsx';
import { ChatFab } from './ui/ChatFab.tsx';

type View = 'progress' | 'roadmap' | 'compare' | 'plans';
const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'progress', label: 'Progress', icon: 'home' },
  { id: 'roadmap', label: 'Roadmap', icon: 'map' },
  { id: 'compare', label: 'Compare', icon: 'compare' },
  { id: 'plans', label: 'Plans', icon: 'bookmark' },
];

export function App() {
  const demo = new URLSearchParams(window.location.search).get('demo') === '1';
  const s = useDegreePath(demo);
  const [view, setView] = useState<View>('progress');
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('degreepath.theme') as 'light') ?? 'dark');

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('degreepath.theme', theme); }, [theme]);
  useEffect(() => {
    if (demo) return;
    const poll = () => api.status().then(setStatus).catch(() => setStatus(null));
    poll();
    const t = setInterval(poll, 20_000);
    return () => clearInterval(t);
  }, [demo]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); } }, [toast]);

  async function refresh() {
    setRefreshing(true);
    try { s.setPathway(await api.syncAudit(), true); void s.loadWorkload(true); setToast('DegreeWorks audit refreshed. Checking course offerings.'); }
    catch (e) {
      if ((e as { needsLogin?: boolean }).needsLogin) {
        setToast('Opening a one-time KSU sign-in window…');
        try { await api.connect(); s.setPathway(await api.syncAudit(), true); void s.loadWorkload(true); setToast('Signed in and refreshed. Checking course offerings.'); }
        catch (e2) { setToast(e2 instanceof Error ? e2.message : 'Sign-in failed.'); }
      } else setToast(e instanceof Error ? e.message : 'Refresh failed.');
    }
    finally { setRefreshing(false); }
  }
  const ask = (q: string) => { setSeed(q); setChatOpen(true); };
  const go = (v: View) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  function removeBrowserData() {
    if (!window.confirm('Remove your synced audit, draft and saved plans from this browser? Your KSU account will stay connected.')) return;
    s.setPathway(null);
    setView('progress');
    setChatOpen(false);
    setSeed(null);
    setToast('Removed your audit and plans from this browser.');
  }

  return (
    <div className={`app ${chatOpen ? 'chat-open' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => go('progress')} aria-label="DegreePath home">
          <span className="brand-mark"><Icon name="logo" size={22} /></span>
          <span>Degree<b>Path</b></span>
        </button>
        {s.pathway && (
          <nav className="nav-pills" aria-label="Sections">
            {NAV.map(n => (
              <button key={n.id} className={view === n.id ? 'on' : ''} onClick={() => go(n.id)} aria-current={view === n.id}>
                <Icon name={n.icon} size={17} /> {n.label}
                {n.id === 'roadmap' && s.editCount > 0 && <span className="badge">{s.editCount}</span>}
                {n.id === 'plans' && s.plans.length > 0 && <span className="badge soft">{s.plans.length}</span>}
              </button>
            ))}
          </nav>
        )}
        <div className="topbar-right">
          {s.pathway && (
            <button className={`btn btn-ask ${chatOpen ? 'on' : ''}`} onClick={() => setChatOpen(o => !o)}>
              <Icon name="sparkle" /> Ask DegreePath
            </button>
          )}
          <button className="theme-switch" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <span className="knob"><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={14} /></span>
          </button>
          {s.pathway && !demo && (
            <div className="data-actions" role="group" aria-label="DegreeWorks data">
              <button className="data-action" onClick={refresh} disabled={refreshing}
                title={`Last synced ${new Date(s.pathway.importedAt).toLocaleString()}`}>
                <Icon name="refresh" size={16} className={refreshing ? 'spin' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh DegreeWorks'}
              </button>
              <button className="data-action data-remove" onClick={removeBrowserData} disabled={refreshing}>
                <Icon name="close" size={16} /> Remove browser data
              </button>
            </div>
          )}
        </div>
      </header>

      {demo && <div className="demo-banner" role="note"><strong>Sample demo.</strong> Uses synthetic data. Edits and saved plans last until reload. <a href="/">Open my real plan</a></div>}
      {!s.pathway ? (
        <Welcome status={status} onLoaded={p => { s.setPathway(p); setView('progress'); }} />
      ) : (
        <div className="view" key={view}>
          {view === 'progress' && <Progress s={s} onRoadmap={() => go('roadmap')} onRefresh={demo ? undefined : refresh} refreshing={refreshing} />}
          {view === 'roadmap' && <Roadmap s={s} onCompare={() => go('compare')} onAsk={demo ? undefined : ask} onSave={() => setSaving(true)} />}
          {view === 'compare' && <Compare s={s} onRoadmap={() => go('roadmap')} onSave={() => setSaving(true)} />}
          {view === 'plans' && <Plans s={s} onOpened={() => { go('roadmap'); setToast('Plan opened on your roadmap.'); }} />}
          {s.loadingCourses && <div className="loading-pill"><span className="spinner" /> Checking the KSU schedule…</div>}
        </div>
      )}

      {saving && s.pathway && (
        <Modal title="Save this plan" onClose={() => setSaving(false)}>
          <p className="muted">Save your current what-if and term settings under Plans.</p>
          <form className="save-form" onSubmit={event => {
            event.preventDefault();
            s.savePlan(planName.trim() || `Plan · ${s.plan?.finish ?? 'draft'}`);
            setSaving(false);
            setPlanName('');
            setToast('Plan saved. Open Plans to revisit it.');
          }}>
            <input autoFocus aria-label="Plan name" value={planName} onChange={event => setPlanName(event.target.value)} placeholder="e.g. Lighter spring" maxLength={60} />
            <button className="btn btn-gold" type="submit"><Icon name="bookmark" /> Save</button>
          </form>
        </Modal>
      )}
      {s.pathway && !demo && <ChatFab s={s} view={view} chatOpen={chatOpen} online={!!status?.agent.running && !!status.agent.model} onOpen={q => (q ? ask(q) : setChatOpen(true))} />}
      {s.pathway && <Chat demo={demo} s={s} status={status} open={chatOpen} onClose={() => setChatOpen(false)} seed={seed} onSeedUsed={() => setSeed(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
