// Pure helper functions: no state, no DOM, no side effects.

import { MAX_STAR_COUNT, PERCENT_BASE } from './constants.js';

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const TASK_TEXT_PATTERN = /^.{3,120}$/;
const HAS_VISIBLE_CHARACTER_PATTERN = /\S/;
const COMMENT_LENGTH_PATTERN = /^[\s\S]{1,280}$/;
const MIN_PASSWORD_LENGTH = 6;

// ---------- Safe text ----------

// Turns special characters into harmless text so API data can never become real HTML.
export function escapeHTML(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

// "Rest" parameters: parts can be any number of values. Empty ones are skipped.
export function joinNonEmpty(separator, ...parts) {
  return parts.filter(Boolean).join(separator);
}

export function fullName(person) {
  return joinNonEmpty(' ', person.firstName, person.lastName);
}

// ---------- Numbers and prices ----------

export function formatPrice(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

export function getDiscountedPrice(price, discountPercentage) {
  const discountAmount = price * (discountPercentage / PERCENT_BASE);
  return price - discountAmount;
}

export function calculateCartTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountedTotal = cart.reduce((sum, item) => {
    const discountedPrice = getDiscountedPrice(item.price, item.discountPercentage);
    return sum + discountedPrice * item.quantity;
  }, 0);
  return {
    subtotal,
    discountAmount: subtotal - discountedTotal,
    grandTotal: discountedTotal,
  };
}

export function getTotalPages(totalItems, itemsPerPage) {
  return Math.max(1, Math.ceil(totalItems / itemsPerPage));
}

export function starsText(rating) {
  const filledStars = Math.min(Math.round(rating), MAX_STAR_COUNT);
  const emptyStars = MAX_STAR_COUNT - filledStars;
  return '★'.repeat(filledStars) + '☆'.repeat(emptyStars);
}

export function formatRating(rating) {
  return `${starsText(rating)} ${Number(rating).toFixed(1)}`;
}

// ---------- Debounce (a closure) ----------

// The returned function "remembers" timerId between calls. That is the closure.
export function debounce(callback, waitMilliseconds) {
  let timerId = null;

  return function debouncedFunction(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => callback(...args), waitMilliseconds);
  };
}

// ---------- Validators: return an error message, or '' when the value is fine ----------

export function validateUsername(username) {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username must be 3 to 20 letters, numbers, or underscores.';
  }
  return '';
}

export function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return '';
}

export function validateComment(text) {
  if (!HAS_VISIBLE_CHARACTER_PATTERN.test(text)) {
    return 'Write something before posting.';
  }
  if (!COMMENT_LENGTH_PATTERN.test(text.trim())) {
    return 'A comment can have at most 280 characters.';
  }
  return '';
}

export function validateTaskText(text) {
  if (!TASK_TEXT_PATTERN.test(text.trim())) {
    return 'A task needs between 3 and 120 characters.';
  }
  return '';
}
