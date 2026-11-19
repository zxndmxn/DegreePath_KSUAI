import type { CourseInfo, Pathway } from './core/types.ts';
import type { AgentReply } from './core/agent.ts';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface BridgeStatus {
  degreeworks: { signedIn: boolean };
  agent: { running: boolean; model: string | null };
}

export const api = {
  status: () => call<BridgeStatus>('/api/status'),
  syncAudit: () => call<{ pathway: Pathway }>('/api/audit/sync', { method: 'POST', body: '{}' }).then(r => r.pathway),
  courses: (codes: string[]) =>
    call<{ courses: Record<string, CourseInfo | null> }>('/api/courses', { method: 'POST', body: JSON.stringify({ codes }) }).then(r => r.courses),
  warmAgent: (context: string) => call<{ warmedMs: number }>('/api/agent/warm', { method: 'POST', body: JSON.stringify({ context }) }),
  agent: (messages: { role: 'user' | 'assistant'; content: string }[], context: string) =>
    call<AgentReply>('/api/agent', { method: 'POST', body: JSON.stringify({ messages, context }) }),
};
