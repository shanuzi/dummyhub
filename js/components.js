// Small functions that return markup used by many views.

import { escapeHTML } from './utils.js';

export function loadingMarkup(message = 'Loading…') {
  return `
    <div class="state-message is-loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <p>${escapeHTML(message)}</p>
    </div>`;
}

export function errorMarkup(message) {
  return `
    <div class="state-message is-error" role="alert">
      <p>Something went wrong: ${escapeHTML(message)}</p>
      <button type="button" data-action="retry">Retry</button>
    </div>`;
}

export function emptyMarkup(message) {
  return `
    <div class="state-message is-empty">
      <p>${escapeHTML(message)}</p>
    </div>`;
}

// options looks like [{ value: 'a', label: 'Option A' }]
export function optionsMarkup(options, selectedValue) {
  return options
    .map((option) => {
      const selectedAttribute = option.value === selectedValue ? 'selected' : '';
      return `<option value="${escapeHTML(option.value)}" ${selectedAttribute}>${escapeHTML(option.label)}</option>`;
    })
    .join('');
}

export function paginationMarkup(page, totalPages) {
  const previousDisabled = page <= 1 ? 'disabled' : '';
  const nextDisabled = page >= totalPages ? 'disabled' : '';

  return `
    <nav class="pagination" aria-label="Pagination">
      <button type="button" data-action="previous-page" ${previousDisabled}>Previous</button>
      <span>Page ${page} of ${totalPages}</span>
      <button type="button" data-action="next-page" ${nextDisabled}>Next</button>
    </nav>`;
}
