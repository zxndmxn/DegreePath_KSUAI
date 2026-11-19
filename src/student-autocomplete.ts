import { findSuggestions, type Suggestion } from './data/student-suggestions';

export function bindSuggestions(
  input: HTMLInputElement, list: HTMLElement,
  options: () => Suggestion[], choose: (option: Suggestion) => void,
  submitText?: () => void,
) {
  let matches: Suggestion[] = [];
  let active = -1;

  function close() {
    matches = [];
    active = -1;
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function select(option: Suggestion) {
    close();
    choose(option);
  }

  function show() {
    close();
    matches = findSuggestions(input.value, options());
    if (!matches.length) return;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    matches.forEach((option, index) => {
      const row = document.createElement('li');
      row.id = `${list.id}-${index}`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      const value = document.createElement('strong');
      value.textContent = option.value;
      row.append(value);
      if (option.detail) {
        const detail = document.createElement('span');
        detail.textContent = option.detail;
        row.append(detail);
      }
      row.addEventListener('pointerdown', event => event.preventDefault());
      row.addEventListener('click', () => select(option));
      list.append(row);
    });
  }

  input.addEventListener('input', show);
  input.addEventListener('focus', show);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') close();
    if (event.key === 'Enter' && (active >= 0 || submitText)) {
      event.preventDefault();
      if (active >= 0) select(matches[active]);
      else { close(); submitText?.(); }
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if (!matches.length) show();
    if (!matches.length) return;
    event.preventDefault();
    active = event.key === 'ArrowDown' ? (active + 1) % matches.length
      : active <= 0 ? matches.length - 1 : active - 1;
    Array.from(list.children).forEach((row, index) => row.setAttribute('aria-selected', String(index === active)));
    input.setAttribute('aria-activedescendant', list.children[active].id);
    list.children[active].scrollIntoView({ block: 'nearest' });
  });
}
