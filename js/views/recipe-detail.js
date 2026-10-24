import { createInitialState, getState, updateSlice } from '../state.js';
import { getRecipeById } from '../api.js';
import { MIN_SERVINGS, MAX_SERVINGS } from '../constants.js';
import { escapeHTML, formatRating } from '../utils.js';
import { loadingMarkup, errorMarkup } from '../components.js';
import { notFoundMarkup } from './not-found.js';

export function mount(params) {
  document.getElementById('app').innerHTML = `
    <section class="detail-view">
      <p><a href="#/recipes">&larr; Back to recipes</a></p>
      <h1>Recipe</h1>
      <div id="recipe-content"></div>
    </section>`;

  document.getElementById('recipe-content').addEventListener('click', handleClick);
  loadRecipe(params.id);
}

export function render() {
  document.getElementById('recipe-content').innerHTML = buildRecipeMarkup();
}

function handleClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }
  const { action } = actionElement.dataset;
  const { servings } = getState().recipeDetail;

  if (action === 'servings-down' && servings > MIN_SERVINGS) {
    updateSlice('recipeDetail', { servings: servings - 1 });
  }
  if (action === 'servings-up' && servings < MAX_SERVINGS) {
    updateSlice('recipeDetail', { servings: servings + 1 });
  }
  if (action === 'retry') {
    loadRecipe(getState().route.params.id);
  }
}

async function loadRecipe(id) {
  const freshDetail = createInitialState().recipeDetail;
  updateSlice('recipeDetail', { ...freshDetail, status: 'loading' });

  try {
    const recipe = await getRecipeById(id);
    updateSlice('recipeDetail', { status: 'success', recipe, servings: recipe.servings });
  } catch (error) {
    const isNotFound = error.status === 404;
    updateSlice('recipeDetail', { status: 'error', error: error.message, notFound: isNotFound });
  }
}

function buildRecipeMarkup() {
  const { status, recipe, error, notFound, servings } = getState().recipeDetail;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading recipe…');
  }
  if (notFound) {
    return notFoundMarkup('We could not find that recipe.');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }

  const ingredientsMarkup = recipe.ingredients
    .map((ingredient) => `<li>${escapeHTML(ingredient)}</li>`)
    .join('');
  const instructionsMarkup = recipe.instructions
    .map((step) => `<li>${escapeHTML(step)}</li>`)
    .join('');

  return `
    <article>
      <h2>${escapeHTML(recipe.name)}</h2>
      <img src="${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.name)}" width="400">
      <p class="muted">
        ${escapeHTML(recipe.cuisine)} &middot; ${escapeHTML(recipe.difficulty)} &middot;
        prep ${recipe.prepTimeMinutes} min &middot; cook ${recipe.cookTimeMinutes} min
      </p>
      <p>${formatRating(recipe.rating)}</p>
      ${renderServingsAdjuster(recipe, servings)}
      <h3>Ingredients</h3>
      <ul>${ingredientsMarkup}</ul>
      <h3>Instructions</h3>
      <ol>${instructionsMarkup}</ol>
    </article>`;
}

function renderServingsAdjuster(recipe, servings) {
  const totalCalories = recipe.caloriesPerServing * servings;

  return `
    <section class="panel">
      <h3>Servings</h3>
      <div class="servings-box">
        <button type="button" class="secondary-button" data-action="servings-down" aria-label="Fewer servings" ${servings <= MIN_SERVINGS ? 'disabled' : ''}>-</button>
        <strong>${servings}</strong>
        <button type="button" class="secondary-button" data-action="servings-up" aria-label="More servings" ${servings >= MAX_SERVINGS ? 'disabled' : ''}>+</button>
      </div>
      <p>${recipe.caloriesPerServing} calories per serving &times; ${servings} servings = <strong>${totalCalories} calories</strong></p>
    </section>`;
}
