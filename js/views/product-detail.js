import { createInitialState, getState, updateSlice } from '../state.js';
import { getProductById } from '../api.js';
import { addProductToCart } from '../cart-actions.js';
import { DEFAULT_MINIMUM_ORDER } from '../constants.js';
import {
  escapeHTML,
  formatPrice,
  formatRating,
  getDiscountedPrice,
  joinNonEmpty,
  starsText,
} from '../utils.js';
import { loadingMarkup, errorMarkup, emptyMarkup } from '../components.js';
import { notFoundMarkup } from './not-found.js';

export function mount(params) {
  document.getElementById('app').innerHTML = `
    <section class="detail-view">
      <p><a href="#/shop">&larr; Back to the shop</a></p>
      <h1>Product details</h1>
      <div id="product-content"></div>
    </section>`;

  const contentArea = document.getElementById('product-content');
  contentArea.addEventListener('click', handleClick);
  contentArea.addEventListener('change', handleQuantityChange);
  contentArea.addEventListener('submit', handleAddToCartSubmit);

  loadProduct(params.id);
}

export function render() {
  document.getElementById('product-content').innerHTML = buildProductMarkup();
}

// ---------- Events ----------

function handleClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }
  const { action, index } = actionElement.dataset;

  if (action === 'select-image') {
    updateSlice('productDetail', { selectedImageIndex: Number(index) });
  }
  if (action === 'retry') {
    loadProduct(getState().route.params.id);
  }
}

function handleQuantityChange(event) {
  if (event.target.name === 'quantity') {
    updateSlice('productDetail', { quantity: Number(event.target.value), cartMessage: '' });
  }
}

function handleAddToCartSubmit(event) {
  event.preventDefault();
  const quantity = Number(event.target.elements.quantity.value);
  const { product } = getState().productDetail;

  const errorMessage = addProductToCart(product, quantity);

  updateSlice('productDetail', {
    quantity,
    cartMessage: errorMessage || `Added ${quantity} to your cart.`,
    cartMessageIsError: Boolean(errorMessage),
  });
}

// ---------- Loading data ----------

async function loadProduct(id) {
  const freshDetail = createInitialState().productDetail;
  updateSlice('productDetail', { ...freshDetail, status: 'loading' });

  try {
    const product = await getProductById(id);
    const startingQuantity = product.minimumOrderQuantity || DEFAULT_MINIMUM_ORDER;
    updateSlice('productDetail', { status: 'success', product, quantity: startingQuantity });
  } catch (error) {
    const isNotFound = error.status === 404;
    updateSlice('productDetail', { status: 'error', error: error.message, notFound: isNotFound });
  }
}

// ---------- Drawing ----------

function buildProductMarkup() {
  const { status, product, error, notFound, selectedImageIndex } = getState().productDetail;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading product…');
  }
  if (notFound) {
    return notFoundMarkup('We could not find that product.');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }

  const finalPrice = getDiscountedPrice(product.price, product.discountPercentage);
  const brandAndCategory = joinNonEmpty(' · ', product.brand, product.category);
  const stockText = product.stock > 0 ? `${product.stock} in stock` : 'Out of stock';

  return `
    <article class="product-detail">
      ${renderGallery(product, selectedImageIndex)}
      <div>
        <h2>${escapeHTML(product.title)}</h2>
        <p class="muted">${escapeHTML(brandAndCategory)}</p>
        <p class="price">
          ${formatPrice(finalPrice)}
          <s class="muted">${formatPrice(product.price)}</s>
          <span class="discount">${Math.round(product.discountPercentage)}% off</span>
        </p>
        <p>${formatRating(product.rating)}</p>
        <p>${stockText}</p>
        <p>${escapeHTML(product.description)}</p>
        ${renderAddToCartForm(product)}
      </div>
    </article>
    ${renderReviews(product.reviews || [])}`;
}

function getProductImages(product) {
  if (product.images && product.images.length > 0) {
    return product.images;
  }
  return [product.thumbnail];
}

function renderGallery(product, selectedIndex) {
  const images = getProductImages(product);
  const mainImage = images[selectedIndex] || images[0];

  const thumbnailsMarkup = images
    .map((imageUrl, index) => {
      const activeClass = index === selectedIndex ? 'is-active' : '';
      return `
        <button type="button" class="thumbnail-button ${activeClass}" data-action="select-image" data-index="${index}">
          <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(product.title)}, picture ${index + 1}">
        </button>`;
    })
    .join('');

  return `
    <div class="gallery">
      <img class="gallery-main" src="${escapeHTML(mainImage)}" alt="${escapeHTML(product.title)}">
      <div class="thumbnail-strip">${thumbnailsMarkup}</div>
    </div>`;
}

function renderAddToCartForm(product) {
  const { quantity, cartMessage, cartMessageIsError } = getState().productDetail;
  const minimumOrder = product.minimumOrderQuantity || DEFAULT_MINIMUM_ORDER;
  const isOutOfStock = product.stock <= 0;
  const messageClass = cartMessageIsError ? 'form-error' : 'form-success';

  return `
    <form class="add-to-cart">
      <div class="field">
        <label for="quantity">Quantity</label>
        <input id="quantity" name="quantity" type="number" min="${minimumOrder}" max="${product.stock}" value="${quantity}">
      </div>
      <button type="submit" ${isOutOfStock ? 'disabled' : ''}>Add to cart</button>
    </form>
    <p class="${messageClass}" role="status">${escapeHTML(cartMessage)}</p>
    <p class="muted">Minimum order: ${minimumOrder}</p>`;
}

function renderReviews(reviews) {
  const listMarkup =
    reviews.length === 0
      ? emptyMarkup('No reviews yet.')
      : `<ul class="plain-list">${reviews.map((review) => renderReviewItem(review)).join('')}</ul>`;

  return `
    <section class="panel">
      <h2>Reviews (${reviews.length})</h2>
      ${listMarkup}
    </section>`;
}

function renderReviewItem(review) {
  const reviewDate = new Date(review.date).toLocaleDateString();

  return `
    <li class="comment">
      <p class="comment-author">${escapeHTML(review.reviewerName)} <span class="muted">${escapeHTML(reviewDate)}</span></p>
      <p>${starsText(review.rating)}</p>
      <p>${escapeHTML(review.comment)}</p>
    </li>`;
}
