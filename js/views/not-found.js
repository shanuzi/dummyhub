import { escapeHTML } from '../utils.js';

// Also used inside detail views when the server answers 404.
export function notFoundMarkup(message) {
  return `
    <div class="panel not-found">
      <p>${escapeHTML(message)}</p>
      <p><a href="#/">Back to the dashboard</a></p>
    </div>`;
}

export function mount() {
  document.getElementById('app').innerHTML = `
    <section>
      <h1>Page not found</h1>
      ${notFoundMarkup('That page does not exist.')}
    </section>`;
}

// Nothing in this view depends on state.
export function render() {}
