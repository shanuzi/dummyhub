// Keeps the header (active link, cart badge, user area) in sync with the state.

import { getState } from './state.js';
import { logout } from './auth.js';
import { escapeHTML, fullName } from './utils.js';

export function mountHeader() {
  const userArea = document.getElementById('user-area');
  userArea.addEventListener('click', handleUserAreaClick);
}

function handleUserAreaClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (actionElement && actionElement.dataset.action === 'logout') {
    logout();
  }
}

export function renderHeader() {
  const { route, cart, auth } = getState();
  highlightActiveLink(route.name);
  updateCartBadge(cart);
  updateUserArea(auth.user);
}

function highlightActiveLink(routeName) {
  // getElementsByClassName gives a LIVE collection: it always matches the page.
  // The nav links never change, so Array.from() is only used to get forEach.
  const navLinks = Array.from(document.getElementsByClassName('nav-link'));

  navLinks.forEach((link) => {
    const isActive = link.dataset.route === routeName;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function updateCartBadge(cart) {
  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const badge = document.getElementById('cart-badge');
  badge.textContent = totalQuantity;
  badge.classList.toggle('is-empty', totalQuantity === 0);
}

function updateUserArea(user) {
  const userArea = document.getElementById('user-area');

  if (!user) {
    userArea.innerHTML = '<a href="#/login">Log in</a>';
    return;
  }

  userArea.innerHTML = `
    <img class="avatar" src="${escapeHTML(user.image)}" alt="${escapeHTML(fullName(user))}">
    <span>${escapeHTML(fullName(user))}</span>
    <button type="button" class="secondary-button" data-action="logout">Log out</button>`;
}
