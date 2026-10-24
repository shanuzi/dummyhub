import { getState, updateSlice } from '../state.js';
import { getUsers, searchUsers, filterUsers } from '../api.js';
import { PEOPLE_PER_PAGE, PEOPLE_CARD_FIELDS, SEARCH_DEBOUNCE_MS } from '../constants.js';
import { debounce, escapeHTML, fullName, getTotalPages } from '../utils.js';
import {
  loadingMarkup,
  errorMarkup,
  emptyMarkup,
  optionsMarkup,
  paginationMarkup,
} from '../components.js';

const ROLE_CHOICES = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'user', label: 'User' },
];

const SORT_CHOICES = [
  { value: '', label: 'Default order' },
  { value: 'firstName-asc', label: 'First name (A to Z)' },
  { value: 'firstName-desc', label: 'First name (Z to A)' },
  { value: 'lastName-asc', label: 'Last name (A to Z)' },
  { value: 'lastName-desc', label: 'Last name (Z to A)' },
  { value: 'age-asc', label: 'Age (youngest first)' },
  { value: 'age-desc', label: 'Age (oldest first)' },
];

export function mount() {
  const { q, role, sortBy, order } = getState().people;
  const sortValue = sortBy ? `${sortBy}-${order}` : '';

  document.getElementById('app').innerHTML = `
    <section class="people-view">
      <h1>People</h1>
      <form id="people-controls" class="controls">
        <div class="field">
          <label for="people-search">Search people</label>
          <input id="people-search" name="search" type="search" value="${escapeHTML(q)}">
        </div>
        <div class="field">
          <label for="people-role">Role</label>
          <select id="people-role" name="role">${optionsMarkup(ROLE_CHOICES, role)}</select>
        </div>
        <div class="field">
          <label for="people-sort">Sort by</label>
          <select id="people-sort" name="sort">${optionsMarkup(SORT_CHOICES, sortValue)}</select>
        </div>
      </form>
      <div id="people-results"></div>
    </section>`;

  attachListeners();
  loadPeople();
}

export function render() {
  document.getElementById('people-results').innerHTML = buildResultsMarkup();
}

// ---------- Events ----------

function attachListeners() {
  const controlsForm = document.getElementById('people-controls');
  const debouncedSearch = debounce(handleSearchChange, SEARCH_DEBOUNCE_MS);

  controlsForm.addEventListener('submit', (event) => event.preventDefault());
  controlsForm.addEventListener('input', (event) => {
    if (event.target.name === 'search') {
      debouncedSearch(event.target.value);
    }
  });
  controlsForm.addEventListener('change', handleControlChange);
  document.getElementById('people-results').addEventListener('click', handleResultsClick);
}

function handleSearchChange(searchText) {
  document.getElementById('people-role').value = '';
  updateSlice('people', { q: searchText.trim(), role: '', page: 1 });
  loadPeople();
}

function handleControlChange(event) {
  const { name, value } = event.target;

  if (name === 'role') {
    document.getElementById('people-search').value = '';
    updateSlice('people', { role: value, q: '', page: 1 });
    loadPeople();
  }
  if (name === 'sort') {
    const [sortBy, order] = value === '' ? ['', 'asc'] : value.split('-');
    updateSlice('people', { sortBy, order, page: 1 });
    loadPeople();
  }
}

function handleResultsClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }
  const { action, id } = actionElement.dataset;
  const { page } = getState().people;

  if (action === 'open-person') {
    window.location.hash = `#/people/${id}`;
  }
  if (action === 'previous-page') {
    goToPage(page - 1);
  }
  if (action === 'next-page') {
    goToPage(page + 1);
  }
  if (action === 'retry') {
    loadPeople();
  }
}

function goToPage(newPage) {
  updateSlice('people', { page: newPage });
  loadPeople();
}

// ---------- Loading data ----------

function fetchPeople(searchText, role, options) {
  if (searchText) {
    return searchUsers(searchText, options);
  }
  if (role) {
    return filterUsers('role', role, options);
  }
  return getUsers(options);
}

async function loadPeople() {
  const { page, q, role, sortBy, order } = getState().people;
  updateSlice('people', { status: 'loading', error: '' });

  const options = {
    limit: PEOPLE_PER_PAGE,
    skip: (page - 1) * PEOPLE_PER_PAGE,
    select: PEOPLE_CARD_FIELDS,
    sortBy,
    order: sortBy ? order : '',
  };

  try {
    const { users, total } = await fetchPeople(q, role, options);
    updateSlice('people', { status: 'success', items: users, total });
  } catch (error) {
    updateSlice('people', { status: 'error', error: error.message });
  }
}

// ---------- Drawing ----------

function buildResultsMarkup() {
  const { status, items, total, page, error, q } = getState().people;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading people…');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }

  let listMarkup = '';
  if (items.length === 0) {
    listMarkup = emptyMarkup(q ? `No people found for "${q}".` : 'No people to show.');
  } else {
    const cardsMarkup = items.map((person) => renderPersonCard(person)).join('');
    listMarkup = `<div class="card-grid">${cardsMarkup}</div>`;
  }

  return listMarkup + paginationMarkup(page, getTotalPages(total, PEOPLE_PER_PAGE));
}

function renderPersonCard(person) {
  const companyName = person.company ? person.company.name : '';

  return `
    <article class="person-card" data-action="open-person" data-id="${escapeHTML(person.id)}">
      <img class="avatar" src="${escapeHTML(person.image)}" alt="${escapeHTML(fullName(person))}">
      <h2>${escapeHTML(fullName(person))}</h2>
      <p class="muted">${escapeHTML(person.role)}</p>
      <p>${escapeHTML(companyName)}</p>
      <button type="button" class="link-button">View profile</button>
    </article>`;
}
