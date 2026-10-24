import { getState, updateSlice } from '../state.js';
import {
  getRecipes,
  searchRecipes,
  getRecipeTags,
  getRecipesByTag,
  getRecipesByMealType,
} from '../api.js';
import { ALL_ITEMS_LIMIT, RECIPE_CARD_FIELDS, SEARCH_DEBOUNCE_MS } from '../constants.js';
import { debounce, escapeHTML, formatRating } from '../utils.js';
import { loadingMarkup, errorMarkup, emptyMarkup, optionsMarkup } from '../components.js';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

const SORT_CHOICES = [
  { value: '', label: 'Default order' },
  { value: 'name-asc', label: 'Name (A to Z)' },
  { value: 'name-desc', label: 'Name (Z to A)' },
  { value: 'rating-desc', label: 'Rating (best first)' },
  { value: 'caloriesPerServing-asc', label: 'Calories (low to high)' },
  { value: 'caloriesPerServing-desc', label: 'Calories (high to low)' },
];

const DIFFICULTY_CHOICES = [
  { value: '', label: 'Any difficulty' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const TIME_CHOICES = [
  { value: '', label: 'Any time' },
  { value: '15', label: '15 minutes or less' },
  { value: '30', label: '30 minutes or less' },
  { value: '45', label: '45 minutes or less' },
  { value: '60', label: '60 minutes or less' },
];

export function mount() {
  document.getElementById('app').innerHTML = `
    <section class="recipes-view">
      <h1>Recipes</h1>
      ${buildControlsMarkup()}
      <div id="recipe-results"></div>
    </section>`;

  attachListeners();
  loadTagsOnce();
  loadRecipes();
}

function buildControlsMarkup() {
  const { q, sortBy, order, difficulty, maxMinutes } = getState().recipes;
  const sortValue = sortBy ? `${sortBy}-${order}` : '';
  const timeValue = maxMinutes === 0 ? '' : String(maxMinutes);

  return `
    <form id="recipe-controls" class="controls">
      <div class="field">
        <label for="recipe-search">Search recipes</label>
        <input id="recipe-search" name="search" type="search" value="${escapeHTML(q)}">
      </div>
      <div class="field">
        <label for="recipe-tag">Tag</label>
        <select id="recipe-tag" name="tag"></select>
      </div>
      <div class="field">
        <label for="recipe-meal-type">Meal type</label>
        <select id="recipe-meal-type" name="mealType"></select>
      </div>
      <div class="field">
        <label for="recipe-sort">Sort by</label>
        <select id="recipe-sort" name="sort">${optionsMarkup(SORT_CHOICES, sortValue)}</select>
      </div>
      <div class="field">
        <label for="recipe-difficulty">Difficulty</label>
        <select id="recipe-difficulty" name="difficulty">${optionsMarkup(DIFFICULTY_CHOICES, difficulty)}</select>
      </div>
      <div class="field">
        <label for="recipe-time">Ready in</label>
        <select id="recipe-time" name="maxMinutes">${optionsMarkup(TIME_CHOICES, timeValue)}</select>
      </div>
    </form>`;
}

export function render() {
  renderFilterOptions();
  document.getElementById('recipe-results').innerHTML = buildResultsMarkup();
}

// ---------- Events ----------

function attachListeners() {
  const controlsForm = document.getElementById('recipe-controls');
  const resultsArea = document.getElementById('recipe-results');
  const debouncedSearch = debounce(handleSearchChange, SEARCH_DEBOUNCE_MS);

  controlsForm.addEventListener('submit', (event) => event.preventDefault());
  controlsForm.addEventListener('input', (event) => {
    if (event.target.name === 'search') {
      debouncedSearch(event.target.value);
    }
  });
  controlsForm.addEventListener('change', handleControlChange);
  resultsArea.addEventListener('click', handleResultsClick);
}

function handleSearchChange(searchText) {
  updateSlice('recipes', { q: searchText.trim(), tag: '', mealType: '' });
  loadRecipes();
}

function handleControlChange(event) {
  const { name, value } = event.target;

  if (name === 'tag') {
    document.getElementById('recipe-search').value = '';
    updateSlice('recipes', { tag: value, q: '', mealType: '' });
    loadRecipes();
  }
  if (name === 'mealType') {
    document.getElementById('recipe-search').value = '';
    updateSlice('recipes', { mealType: value, q: '', tag: '' });
    loadRecipes();
  }
  if (name === 'sort') {
    const [sortBy, order] = value === '' ? ['', 'asc'] : value.split('-');
    updateSlice('recipes', { sortBy, order });
    loadRecipes();
  }
  if (name === 'difficulty') {
    updateSlice('recipes', { difficulty: value });
  }
  if (name === 'maxMinutes') {
    updateSlice('recipes', { maxMinutes: Number(value) });
  }
}

function handleResultsClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }
  const { action, id } = actionElement.dataset;

  if (action === 'open-recipe') {
    window.location.hash = `#/recipes/${id}`;
  }
  if (action === 'retry') {
    loadRecipes();
  }
}

// ---------- Loading data ----------

async function loadTagsOnce() {
  if (getState().recipes.tags.length > 0) {
    return;
  }
  try {
    const tags = await getRecipeTags();
    updateSlice('recipes', { tags });
  } catch (error) {
    console.error('Could not load the recipe tags:', error.message);
  }
}

function fetchRecipes(searchText, tag, mealType, options) {
  if (searchText) {
    return searchRecipes(searchText, options);
  }
  if (tag) {
    return getRecipesByTag(tag, options);
  }
  if (mealType) {
    return getRecipesByMealType(mealType, options);
  }
  return getRecipes(options);
}

async function loadRecipes() {
  const { q, tag, mealType, sortBy, order } = getState().recipes;
  updateSlice('recipes', { status: 'loading', error: '' });

  const options = {
    limit: ALL_ITEMS_LIMIT,
    select: RECIPE_CARD_FIELDS,
    sortBy,
    order: sortBy ? order : '',
  };

  try {
    const { recipes } = await fetchRecipes(q, tag, mealType, options);
    updateSlice('recipes', { status: 'success', items: recipes });
  } catch (error) {
    updateSlice('recipes', { status: 'error', error: error.message });
  }
}

// ---------- Drawing ----------

function renderFilterOptions() {
  const { tags, tag, mealType } = getState().recipes;

  const tagChoices = [
    { value: '', label: 'All tags' },
    ...tags.map((tagName) => ({ value: tagName, label: tagName })),
  ];
  const mealTypeChoices = [
    { value: '', label: 'All meal types' },
    ...MEAL_TYPES.map((typeName) => ({ value: typeName, label: typeName })),
  ];

  document.getElementById('recipe-tag').innerHTML = optionsMarkup(tagChoices, tag);
  document.getElementById('recipe-meal-type').innerHTML = optionsMarkup(mealTypeChoices, mealType);
}

function buildResultsMarkup() {
  const { status, items, error, difficulty, maxMinutes } = getState().recipes;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading recipes…');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }

  // Derived view: difficulty and time filters are worked out here, not stored.
  const visibleRecipes = items.filter((recipe) => {
    const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
    const matchesDifficulty = difficulty === '' || recipe.difficulty === difficulty;
    const matchesTime = maxMinutes === 0 || totalMinutes <= maxMinutes;
    return matchesDifficulty && matchesTime;
  });

  if (visibleRecipes.length === 0) {
    return emptyMarkup('No recipes match these filters.');
  }
  const cardsMarkup = visibleRecipes.map((recipe) => renderRecipeCard(recipe)).join('');
  return `<div class="card-grid">${cardsMarkup}</div>`;
}

function renderRecipeCard(recipe) {
  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return `
    <article class="recipe-card" data-action="open-recipe" data-id="${escapeHTML(recipe.id)}">
      <img src="${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.name)}" loading="lazy">
      <h2>${escapeHTML(recipe.name)}</h2>
      <p class="muted">${escapeHTML(recipe.cuisine)} &middot; ${escapeHTML(recipe.difficulty)}</p>
      <p>${totalMinutes} minutes &middot; ${recipe.caloriesPerServing} kcal per serving</p>
      <p class="muted">${formatRating(recipe.rating)}</p>
      <button type="button" class="link-button">View recipe</button>
    </article>`;
}
