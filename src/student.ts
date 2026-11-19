import './student.css';
import { creditNumber, importDegreeWorks, type StudentCourse, type StudentProgress } from './data/student-progress';
import { courseSuggestions, degreeSuggestions, normalizeCourseCode } from './data/student-suggestions';
import { bindSuggestions } from './student-autocomplete';

const storageKey = 'degreepath.student-progress.v1';
const escape = (value: string) => value.replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function loadProgress(): StudentProgress | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved && ['DegreeWorks', 'Manual'].includes(saved.source) &&
        typeof saved.program === 'string' && Array.isArray(saved.courses) &&
        Array.isArray(saved.requirements)) return saved;
  } catch { /* Storage may be disabled. */ }
}

let progress = loadProgress();

const importHelp = `<details><summary>How do I export from DegreeWorks?</summary>
  <ol><li>Install the organizer’s <a href="https://github.com/Aaryan-Kapoor/degreeworks-cli" target="_blank" rel="noopener noreferrer">DegreeWorks CLI</a>.</li>
  <li>Run <code>dw login</code> and sign in to your KSU account in the browser.</li>
  <li>In PowerShell, run <code>dw --json audit | Set-Content -Encoding utf8 degreeworks-audit.json</code>, then choose that file here.</li></ol>
  <p>The file stays in your browser. DegreePath saves the reviewed fields on this device and leaves out your name, student ID, email and login details.</p>
</details>`;

export function renderStudent(root: HTMLDivElement, openSample: () => void, screen: 'start' | 'review' = progress ? 'review' : 'start') {
  const manual = progress?.source === 'Manual' ? progress : undefined;
  root.innerHTML = `<header class="student-header"><strong>DegreePath</strong>
    <button type="button" class="student-link" id="open-sample">Open sample roadmap ↗</button></header>
    <main class="student-page">${screen === 'review' && progress ? renderProgress(progress) : `
      <h1 tabindex="-1">Start with your degree.</h1>
      <p class="student-intro">Bring in your audit or enter what you know. Then review your credits, courses and requirements.</p>
      ${progress ? '<button class="student-link" id="return-progress">Back to my progress</button>' : ''}
      <div class="student-inputs">
        <section class="student-panel student-import"><h2>Import from DegreeWorks</h2>
          <p>Use the JSON audit exported by the DegreeWorks CLI.</p>
          <label class="student-label" for="degreeworks-audit">Audit JSON file</label>
          <input id="degreeworks-audit" type="file" accept=".json,application/json">
          <button class="student-primary" id="read-audit" type="button">Review my audit</button>
          ${importHelp}
        </section>
        <section class="student-panel"><h2>Enter progress manually</h2>
          <form id="student-manual">
            <div class="student-suggest">
              <label for="student-degree">Degree or major</label>
              <input id="student-degree" name="program" required maxlength="150" placeholder="Computer Science" value="${escape(manual?.program ?? '')}"
                autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="degree-options">
              <ul class="student-options" id="degree-options" role="listbox" aria-label="Degree suggestions" hidden></ul>
            </div>
            <label>Catalog year <small>(optional)</small><input name="catalog" maxlength="30" placeholder="2026–27" value="${escape(manual?.catalog ?? '')}"></label>
            <div class="student-numbers">
              <label>Credits applied<input name="applied" type="number" min="0" max="1000" step="any" value="${manual?.applied ?? ''}" required></label>
              <label>Credits required <small>(optional)</small><input name="required" type="number" min="1" max="1000" step="any" value="${manual?.required ?? ''}"></label>
            </div>
            <div>
              <label for="student-course">Courses in progress <small>(optional)</small></label>
              <div class="student-course-entry">
                <div class="student-suggest">
                  <input id="student-course" maxlength="80" placeholder="Course code or name"
                    autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"
                    aria-controls="course-options" aria-describedby="course-hint">
                  <ul class="student-options" id="course-options" role="listbox" aria-label="Course suggestions" hidden></ul>
                </div>
                <button class="student-link" id="add-course" type="button">Add</button>
              </div>
              <small id="course-hint">Choose a match or add a course code like CS 3305.</small>
              <ul class="student-tags" id="student-tags" aria-label="Added courses"></ul>
              <p class="student-course-message" id="course-message" role="status"></p>
            </div>
            <button class="student-primary" type="submit">Review my progress</button>
          </form>
        </section>
      </div>`}
      <p class="student-message" id="student-message" role="status"></p>
    </main>`;

  const show = (next: 'start' | 'review') => {
    renderStudent(root, openSample, next);
    root.querySelector('h1')?.focus();
  };
  const message = (value: string) => { root.querySelector('#student-message')!.textContent = value; };
  const save = (value: StudentProgress) => {
    progress = value;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      show('review');
    } catch {
      show('review');
      message('Your browser could not save this review. It will last until you reload.');
    }
  };

  root.querySelector('#open-sample')?.addEventListener('click', openSample);
  root.querySelector('#return-progress')?.addEventListener('click', () => show('review'));
  root.querySelector('#replace-progress')?.addEventListener('click', () => show('start'));
  root.querySelector('#clear-progress')?.addEventListener('click', () => {
    try { localStorage.removeItem(storageKey); }
    catch { message('Your browser blocked removal of the saved review.'); return; }
    progress = undefined;
    show('start');
  });
  root.querySelector('#read-audit')?.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement;
    const file = root.querySelector<HTMLInputElement>('#degreeworks-audit')?.files?.[0];
    if (!file) return message('Choose your audit JSON file first.');
    if (file.size > 5_000_000) return message('Choose an audit file under 5 MB.');
    button.disabled = true;
    try {
      const imported = importDegreeWorks(await file.text());
      if (button.isConnected) save(imported);
    } catch (error) {
      if (button.isConnected) message(error instanceof Error ? error.message : 'Could not read this audit.');
    } finally { button.disabled = false; }
  });
  const manualForm = root.querySelector<HTMLFormElement>('#student-manual');
  if (!manualForm) return;
  const degreeInput = manualForm.querySelector<HTMLInputElement>('#student-degree')!;
  const courseInput = manualForm.querySelector<HTMLInputElement>('#student-course')!;
  const taggedCourses = [...(manual?.courses ?? [])];
  const tags = manualForm.querySelector<HTMLUListElement>('#student-tags')!;
  const courseMessage = manualForm.querySelector<HTMLElement>('#course-message')!;

  function renderTags() {
    tags.innerHTML = taggedCourses.map((course, index) => `<li>
      <span>#${escape(course.code)}</span><button type="button" data-remove-course="${index}"
        aria-label="Remove ${escape(course.code)}">×</button></li>`).join('');
  }

  function addCourse(value: string): boolean {
    const code = normalizeCourseCode(value);
    if (!code) {
      courseMessage.textContent = 'Use a course code like CS 3305, or choose a suggestion.';
      return false;
    }
    if (taggedCourses.some(course => (normalizeCourseCode(course.code) ?? course.code) === code)) {
      courseMessage.textContent = `${code} is already added.`;
      return false;
    }
    const title = courseSuggestions.find(course => course.value === code)?.detail ?? '';
    const course: StudentCourse = { code, title, credits: null, term: '', status: 'In progress' };
    taggedCourses.push(course);
    courseInput.value = '';
    courseInput.dispatchEvent(new Event('input'));
    renderTags();
    courseMessage.textContent = `${code} added.`;
    return true;
  }

  bindSuggestions(degreeInput, manualForm.querySelector('#degree-options')!, () => degreeSuggestions,
    option => { degreeInput.value = option.value; });
  bindSuggestions(courseInput, manualForm.querySelector('#course-options')!,
    () => courseSuggestions.filter(option => !taggedCourses.some(course => course.code === option.value)),
    option => { addCourse(option.value); }, () => { if (courseInput.value.trim()) addCourse(courseInput.value); });
  courseInput.addEventListener('input', () => { courseMessage.textContent = ''; });
  manualForm.querySelector('#add-course')!.addEventListener('click', () => {
    addCourse(courseInput.value);
    courseInput.focus();
  });
  tags.addEventListener('click', event => {
    const remove = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-remove-course]');
    if (!remove) return;
    const [removed] = taggedCourses.splice(Number(remove.dataset.removeCourse), 1);
    renderTags();
    courseInput.focus();
    courseMessage.textContent = `${removed.code} removed.`;
  });
  renderTags();

  manualForm.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const program = String(form.get('program')).trim();
    const applied = creditNumber(form.get('applied'));
    const required = creditNumber(form.get('required'));
    if (!program || applied === null) return message('Enter your degree and the credits applied so far.');
    if (courseInput.value.trim() && !addCourse(courseInput.value)) {
      courseInput.focus();
      return;
    }
    save({
      source: 'Manual', program, catalog: String(form.get('catalog')).trim(), applied, required,
      courses: taggedCourses,
      requirements: [],
    });
  });
}

function renderProgress(value: StudentProgress): string {
  const { applied, required } = value;
  const creditGap = applied !== null && required ? Math.max(0, required - applied) : null;
  const percent = applied !== null && required ? Math.floor(Math.min(applied / required, 1) * 100) : null;
  const current = value.courses.filter(course => course.status === 'In progress');
  const history = value.courses.filter(course => course.status === 'History');
  const requirements = [...value.requirements].sort((a, b) => Number(a.percent === 100) - Number(b.percent === 100));
  return `<div class="student-review-title"><div>
    <h1 tabindex="-1">Your degree progress</h1>
    <p class="student-intro">${escape(value.program || 'Degree not listed')}${value.catalog ? ` · Catalog ${escape(value.catalog)}` : ''}</p>
    </div><button class="student-link" type="button" id="replace-progress">Update my information</button></div>
    <section class="student-panel student-balance" aria-label="Credit progress">
      <div><span class="student-label">Credits applied</span><strong>${applied ?? '—'}${required !== null ? ` <small>/ ${required}</small>` : ''}</strong>
        <p>${value.source === 'DegreeWorks' ? 'From your DegreeWorks audit' : 'Entered by you'}</p></div>
      <div>${percent !== null ? `<label for="student-credit-progress">${percent}% of credit total</label>
        <progress id="student-credit-progress" value="${percent}" max="100"></progress>
        <p>${creditGap === 0 ? 'Listed credit total reached. Check your requirements for what remains.'
          : `${creditGap!.toLocaleString('en-US', { maximumFractionDigits: 6 })} credits left to reach the listed total.`}</p>`
        : `<p>${applied === null ? 'The applied credit count is missing.' : 'Add your required credit total to see credits remaining.'}</p>`}</div>
    </section>
    <div class="student-results">
      <section class="student-panel"><h2>Requirements</h2>
        ${requirements.length ? requirements.map(requirement => `<details class="student-requirement"><summary><span>${escape(requirement.title)}</span>
          <strong>${requirement.percent === null ? 'Needs review' : requirement.percent === 100 ? 'Complete' : `${requirement.percent}% complete`}</strong></summary>
          ${requirement.rules.length ? `<ul>${requirement.rules.map(rule => `<li>${escape(rule)}</li>`).join('')}</ul>` : '<p>No open rule text was listed for this block.</p>'}</details>`).join('')
          : value.source === 'Manual' ? '<p>Import an audit to see how DegreeWorks groups your requirements.</p>'
          : '<p>This audit did not include any named requirement blocks.</p>'}
      </section>
      <section class="student-panel"><h2>Courses in progress <span class="student-count">${current.length}</span></h2>
        ${renderCourses(current)}
        <details class="student-history"><summary>Course history (${history.length})</summary>${renderCourses(history)}</details>
      </section>
    </div>
    <div class="student-storage"><span>Saved on this browser when storage is available. You can return to this review after reopening the app.</span>
      <details><summary>Remove saved progress</summary><button class="student-link" id="clear-progress" type="button">Clear this browser’s student progress</button></details>
    </div>`;
}

function renderCourses(courses: StudentProgress['courses']): string {
  if (!courses.length) return '<p>No courses listed.</p>';
  return `<ul class="student-course-list">${courses.map(course => `<li>
    <div><strong>${escape(course.title || course.code)}</strong>${course.title || course.term ? `<small>${escape([course.title && course.code, course.term].filter(Boolean).join(' · '))}</small>` : ''}</div>
    ${course.credits === null ? '' : `<span aria-label="${course.credits} credits" title="${course.credits} credits">${course.credits}</span>`}</li>`).join('')}</ul>`;
}
