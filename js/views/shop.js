import { getState, updateSlice } from '../state.js';
import {
  getProducts,
  searchProducts,
  getProductsByCategory,
  getProductCategories,
} from '../api.js';
import { PRODUCTS_PER_PAGE, PRODUCT_CARD_FIELDS, SEARCH_DEBOUNCE_MS } from '../constants.js';
import {
  debounce,
  escapeHTML,
  formatPrice,
  formatRating,
  getDiscountedPrice,
  getTotalPages,
} from '../utils.js';
import {
  loadingMarkup,
  errorMarkup,
  emptyMarkup,
  optionsMarkup,
  paginationMarkup,
} from '../components.js';

const SORT_CHOICES = [
  { value: '', label: 'Default order' },
  { value: 'title-asc', label: 'Title (A to Z)' },
  { value: 'title-desc', label: 'Title (Z to A)' },
  { value: 'price-asc', label: 'Price (low to high)' },
  { value: 'price-desc', label: 'Price (high to low)' },
  { value: 'rating-desc', label: 'Rating (best first)' },
  { value: 'rating-asc', label: 'Rating (lowest first)' },
];

export function mount() {
  const { q, sortBy, order, inStockOnly } = getState().shop;
  const sortValue = sortBy ? `${sortBy}-${order}` : '';

  document.getElementById('app').innerHTML = `
    <section class="shop-view">
      <h1>Shop</h1>
      <form id="shop-controls" class="controls">
        <div class="field">
          <label for="shop-search">Search products</label>
          <input id="shop-search" name="search" type="search" value="${escapeHTML(q)}">
        </div>
        <div class="field">
          <label for="shop-category">Category</label>
          <select id="shop-category" name="category"></select>
        </div>
        <div class="field">
          <label for="shop-sort">Sort by</label>
          <select id="shop-sort" name="sort">${optionsMarkup(SORT_CHOICES, sortValue)}</select>
        </div>
        <label class="checkbox-field">
          <input type="checkbox" name="inStock" ${inStockOnly ? 'checked' : ''}>
          In stock only
        </label>
      </form>
      <div id="shop-results"></div>
    </section>`;

  attachListeners();
  loadCategoriesOnce();
  loadProducts();
}

export function render() {
  renderCategoryOptions();
  document.getElementById('shop-results').innerHTML = buildResultsMarkup();
}

// ---------- Events ----------

function attachListeners() {
  const controlsForm = document.getElementById('shop-controls');
  const resultsArea = document.getElementById('shop-results');
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
  updateSlice('shop', { q: searchText.trim(), category: '', page: 1 });
  loadProducts();
}

function handleControlChange(event) {
  const { name, value, checked } = event.target;

  if (name === 'category') {
    handleCategoryChange(value);
  }
  if (name === 'sort') {
    handleSortChange(value);
  }
  if (name === 'inStock') {
    updateSlice('shop', { inStockOnly: checked });
  }
}

function handleCategoryChange(slug) {
  document.getElementById('shop-search').value = '';
  updateSlice('shop', { category: slug, q: '', page: 1 });
  loadProducts();
}

function handleSortChange(sortValue) {
  const [sortBy, order] = sortValue === '' ? ['', 'asc'] : sortValue.split('-');
  updateSlice('shop', { sortBy, order, page: 1 });
  loadProducts();
}

function handleResultsClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }
  const { action, id } = actionElement.dataset;
  const { page } = getState().shop;

  if (action === 'open-product') {
    window.location.hash = `#/shop/${id}`;
  }
  if (action === 'previous-page') {
    goToPage(page - 1);
  }
  if (action === 'next-page') {
    goToPage(page + 1);
  }
  if (action === 'retry') {
    loadProducts();
  }
}

function goToPage(newPage) {
  updateSlice('shop', { page: newPage });
  loadProducts();
}

// ---------- Loading data ----------

async function loadCategoriesOnce() {
  if (getState().shop.categories.length > 0) {
    return;
  }
  try {
    const categories = await getProductCategories();
    updateSlice('shop', { categories });
  } catch (error) {
    console.error('Could not load the categories:', error.message);
  }
}

function fetchProducts(searchText, category, options) {
  if (searchText) {
    return searchProducts(searchText, options);
  }
  if (category) {
    return getProductsByCategory(category, options);
  }
  return getProducts(options);
}

async function loadProducts() {
  const { page, q, category, sortBy, order } = getState().shop;
  updateSlice('shop', { status: 'loading', error: '' });

  const options = {
    limit: PRODUCTS_PER_PAGE,
    skip: (page - 1) * PRODUCTS_PER_PAGE,
    select: PRODUCT_CARD_FIELDS,
    sortBy,
    order: sortBy ? order : '',
  };

  try {
    const { products, total } = await fetchProducts(q, category, options);
    updateSlice('shop', { status: 'success', items: products, total });
  } catch (error) {
    updateSlice('shop', { status: 'error', error: error.message });
  }
}

// ---------- Drawing ----------

function renderCategoryOptions() {
  const { categories, category } = getState().shop;
  const categoryChoices = categories.map((item) => ({ value: item.slug, label: item.name }));
  const allChoices = [{ value: '', label: 'All categories' }, ...categoryChoices];

  document.getElementById('shop-category').innerHTML = optionsMarkup(allChoices, category);
}

function buildResultsMarkup() {
  const { status, items, total, page, inStockOnly, error, q } = getState().shop;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading products…');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }

  // Derived view: the "in stock" filter is worked out here, not stored.
  const visibleProducts = inStockOnly ? items.filter((product) => product.stock > 0) : items;

  let listMarkup = '';
  if (visibleProducts.length === 0) {
    listMarkup = emptyMarkup(q ? `No products found for "${q}".` : 'No products to show.');
  } else {
    const cardsMarkup = visibleProducts.map((product) => renderProductCard(product)).join('');
    listMarkup = `<div class="card-grid">${cardsMarkup}</div>`;
  }

  return listMarkup + paginationMarkup(page, getTotalPages(total, PRODUCTS_PER_PAGE));
}

function renderProductCard(product) {
  const finalPrice = getDiscountedPrice(product.price, product.discountPercentage);
  const isOutOfStock = product.stock <= 0;
  const stockClass = isOutOfStock ? 'is-out-of-stock' : '';
  const stockLabel = isOutOfStock ? 'Out of stock' : `${product.stock} in stock`;

  return `
    <article class="product-card ${stockClass}" data-action="open-product" data-id="${escapeHTML(product.id)}">
      <img src="${escapeHTML(product.thumbnail)}" alt="${escapeHTML(product.title)}" loading="lazy">
      <h2>${escapeHTML(product.title)}</h2>
      <p class="muted">${escapeHTML(product.category)}</p>
      <p class="price">${formatPrice(finalPrice)}</p>
      <p class="muted">${formatRating(product.rating)}</p>
      <p class="muted">${stockLabel}</p>
      <button type="button" class="link-button">View details</button>
    </article>`;
}
