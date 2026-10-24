// Reads the URL hash, finds the matching route, checks guards and mounts a view.
// The router never fetches data and never builds markup.

import { getState, setState } from './state.js';

import * as loginView from './views/login.js';
import * as dashboardView from './views/dashboard.js';
import * as shopView from './views/shop.js';
import * as productDetailView from './views/product-detail.js';
import * as cartView from './views/cart.js';
import * as recipesView from './views/recipes.js';
import * as recipeDetailView from './views/recipe-detail.js';
import * as communityView from './views/community.js';
import * as postDetailView from './views/post-detail.js';
import * as peopleView from './views/people.js';
import * as userProfileView from './views/user-profile.js';
import * as tasksView from './views/tasks.js';
import * as notFoundView from './views/not-found.js';

// "name" is the navigation section, so /shop and /shop/:id both highlight "Shop".
// "access" is 'public', 'member' (logged in only) or 'guest' (logged out only).
const routes = [
  { pattern: '/login', name: 'login', access: 'guest', view: loginView },
  { pattern: '/', name: 'dashboard', access: 'member', view: dashboardView },
  { pattern: '/shop', name: 'shop', access: 'public', view: shopView },
  { pattern: '/shop/:id', name: 'shop', access: 'public', view: productDetailView },
  { pattern: '/cart', name: 'cart', access: 'member', view: cartView },
  { pattern: '/recipes', name: 'recipes', access: 'public', view: recipesView },
  { pattern: '/recipes/:id', name: 'recipes', access: 'public', view: recipeDetailView },
  { pattern: '/community', name: 'community', access: 'public', view: communityView },
  { pattern: '/community/:id', name: 'community', access: 'public', view: postDetailView },
  { pattern: '/people', name: 'people', access: 'public', view: peopleView },
  { pattern: '/people/:id', name: 'people', access: 'public', view: userProfileView },
  { pattern: '/tasks', name: 'tasks', access: 'member', view: tasksView },
];

// The view that is on screen right now. (A reference to a module, not app data.)
let currentView = null;

export function startRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

export function renderCurrentView() {
  if (currentView) {
    currentView.render();
  }
}

function getPathFromHash() {
  const path = window.location.hash.slice(1); // "#/shop/12" becomes "/shop/12"
  return path === '' ? '/' : path;
}

// Returns an object of params (like { id: '12' }) or null when the pattern does not match.
function matchPattern(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};
  const isMatch = patternParts.every((patternPart, index) => {
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathParts[index];
      return true;
    }
    return patternPart === pathParts[index];
  });

  return isMatch ? params : null;
}

function findMatchingRoute(path) {
  for (const route of routes) {
    const params = matchPattern(route.pattern, path);
    if (params) {
      return { route, params };
    }
  }
  return null;
}

function handleRouteChange() {
  const path = getPathFromHash();
  const match = findMatchingRoute(path);

  if (!match) {
    showView('not-found', notFoundView, {});
    return;
  }

  const { route, params } = match;
  const isLoggedIn = Boolean(getState().auth.accessToken);

  if (route.access === 'member' && !isLoggedIn) {
    setState({ redirectPath: path });
    window.location.replace('#/login');
    return;
  }
  if (route.access === 'guest' && isLoggedIn) {
    window.location.replace('#/');
    return;
  }

  showView(route.name, route.view, params);
}

function showView(name, view, params) {
  currentView = view;
  view.mount(params);
  setState({ route: { name, params } });

  window.scrollTo(0, 0);
  document.getElementsByTagName('main')[0].focus({ preventScroll: true });
}
