import programs from '../../data/research/ksu-program-discovery.json';

export interface Suggestion {
  value: string;
  detail?: string;
  aliases?: string;
}

export const degreeSuggestions: Suggestion[] = programs.entries
  .filter(entry => ['bachelor', 'master', 'specialist', 'doctorate'].includes(entry.credentialCategory))
  .map(entry => ({
    value: entry.title,
    aliases: entry.title.replace(/^(Bachelor|Master|Doctor) of .*? in /i, ''),
  }));

// Course codes and names from KSU's public Computer Science curriculum sheet.
// https://www.kennesaw.edu/ccse/advising/resources/docs/curriculum-sheets/bscs-2025.pdf
export const courseSuggestions: Suggestion[] = [
  { value: 'CS 3305', detail: 'Data Structures' },
  { value: 'CS 3410', detail: 'Introduction to Database Systems' },
  { value: 'CS 3502', detail: 'Operating Systems' },
  { value: 'CS 3503', detail: 'Computer Organization and Architecture' },
  { value: 'CS 3622', detail: 'Fundamentals of Data Communications' },
  { value: 'CS 4306', detail: 'Algorithm Analysis' },
  { value: 'CS 4308', detail: 'Concepts of Programming Languages' },
  { value: 'CS 4504', detail: 'Parallel and Distributed Computing' },
  { value: 'CS 4850', detail: 'Senior Project' },
  { value: 'CSE 1321', detail: 'Programming and Problem Solving I' },
  { value: 'CSE 1322', detail: 'Programming and Problem Solving II' },
  { value: 'CSE 3801', detail: 'Professional Practices and Ethics' },
  { value: 'MATH 2202', detail: 'Calculus II' },
  { value: 'MATH 2345', detail: 'Discrete Mathematics' },
  { value: 'MATH 3260', detail: 'Linear Algebra' },
  { value: 'STAT 2332', detail: 'Probability and Data Analysis' },
  { value: 'SWE 3313', detail: 'Introduction to Software Engineering' },
  { value: 'TCOM 2010', detail: 'Technical Writing' },
];

const normalize = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');

export function findSuggestions(query: string, options: Suggestion[]): Suggestion[] {
  const search = normalize(query).replace(/^#/, '');
  if (!search) return [];
  const compact = search.replace(/ /g, '');
  return options.flatMap(option => {
    const value = normalize(option.value);
    const aliases = normalize(option.aliases ?? '');
    const detail = normalize(option.detail ?? '');
    const searchable = `${value} ${aliases} ${detail}`;
    const score = value.replace(/ /g, '') === compact ? 0
      : value.startsWith(search) || aliases.startsWith(search) || value.replace(/ /g, '').startsWith(compact) ? 1
      : detail.startsWith(search) ? 2
      : search.split(' ').every(word => searchable.includes(word)) ? 3 : -1;
    return score === -1 ? [] : [{ option, score }];
  }).sort((a, b) => a.score - b.score).slice(0, 6).map(match => match.option);
}

export function normalizeCourseCode(input: string): string | null {
  const match = input.trim().toUpperCase().match(/^#?([A-Z]{2,6})\s*-?\s*(\d{4}[A-Z]?)$/);
  return match ? `${match[1]} ${match[2]}` : null;
}
