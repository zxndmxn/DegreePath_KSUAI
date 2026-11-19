import type { Term, TermSeason } from './types.ts';

const ORDER: TermSeason[] = ['Spring', 'Summer', 'Fall'];

export function parseTerm(label: string): Term | null {
  const m = /^(Spring|Summer|Fall)\s+(\d{4})$/.exec(label.trim());
  return m ? { season: m[1] as TermSeason, year: Number(m[2]) } : null;
}

export function termLabel(t: Term): string {
  return `${t.season} ${t.year}`;
}

export function termIndex(label: string): number {
  const t = parseTerm(label);
  return t ? t.year * 3 + ORDER.indexOf(t.season) : Number.MAX_SAFE_INTEGER;
}

export function nextTerm(label: string, summer: boolean): string {
  const t = parseTerm(label);
  if (!t) return label;
  let i = ORDER.indexOf(t.season) + 1;
  let year = t.year;
  if (i >= ORDER.length) { i = 0; year += 1; }
  if (!summer && ORDER[i] === 'Summer') i += 1;
  return termLabel({ season: ORDER[i], year });
}

export function compareTerms(a: string, b: string): number {
  return termIndex(a) - termIndex(b);
}

export function termsBetween(a: string, b: string, summer: boolean): number {
  let n = 0;
  let t = a;
  while (compareTerms(t, b) < 0 && n < 40) { t = nextTerm(t, summer); n += 1; }
  return n;
}
