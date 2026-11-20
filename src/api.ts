import type { CourseInfo, Pathway } from './core/types.ts';
import type { Workload } from './core/d2l.ts';
import { partialReply, type AgentReply } from './core/agent.ts';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `Request failed (${res.status})`), { needsLogin: (data as { needsLogin?: boolean }).needsLogin === true });
  return data as T;
}

export interface BridgeStatus {
  degreeworks: { signedIn: boolean };
  d2l: { connected: boolean };
  agent: { running: boolean; model: string | null; setup: { state: string; message: string; pct: number | null } | null };
}

export const api = {
  status: () => call<BridgeStatus>('/api/status'),
  workload: (refresh = false) => call<Workload>(`/api/d2l${refresh ? '?refresh=1' : ''}`),
  connect: () => call<{ ok: boolean; degreeworks: boolean; d2l: boolean }>('/api/connect', { method: 'POST', body: '{}' }),
  syncAudit: () => call<{ pathway: Pathway }>('/api/audit/sync', { method: 'POST', body: '{}' }).then(r => r.pathway),
  courses: (codes: string[], refresh = false) =>
    call<{ courses: Record<string, CourseInfo | null> }>('/api/courses', { method: 'POST', body: JSON.stringify({ codes, refresh }) }).then(r => r.courses),
  warmAgent: (context: string) => call<{ warmedMs: number }>('/api/agent/warm', { method: 'POST', body: JSON.stringify({ context }) }),
  agentStream: async (messages: { role: 'user' | 'assistant'; content: string }[], context: string, onText: (text: string) => void): Promise<AgentReply> => {
    const res = await fetch('/api/agent?stream=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, context }) });
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let raw = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const msg = JSON.parse(buffer.slice(0, nl)) as { t?: string; reset?: boolean; done?: boolean; error?: string } & Partial<AgentReply>;
        buffer = buffer.slice(nl + 1);
        if (msg.t) { raw += msg.t; onText(partialReply(raw)); }
        if (msg.reset) { raw = ''; onText(''); }
        if (msg.error) throw new Error(msg.error);
        if (msg.done) return { reply: msg.reply ?? '', actions: msg.actions ?? [] };
      }
    }
    throw new Error('The local agent stopped before finishing.');
  },
  agent: (messages: { role: 'user' | 'assistant'; content: string }[], context: string) =>
    call<AgentReply>('/api/agent', { method: 'POST', body: JSON.stringify({ messages, context }) }),
};
