import { createInitialState, getState, updateSlice } from '../state.js';
import { getUserById, getUserPosts, getUserTodos, getUserCarts } from '../api.js';
import { escapeHTML, formatPrice, fullName, joinNonEmpty } from '../utils.js';
import { loadingMarkup, errorMarkup, emptyMarkup } from '../components.js';
import { notFoundMarkup } from './not-found.js';

export function mount(params) {
  document.getElementById('app').innerHTML = `
    <section class="detail-view">
      <p><a href="#/people">&larr; Back to people</a></p>
      <h1>Profile</h1>
      <div id="profile-content"></div>
    </section>`;

  document.getElementById('profile-content').addEventListener('click', handleClick);
  loadProfile(params.id);
}

export function render() {
  document.getElementById('profile-content').innerHTML = buildProfileMarkup();
}

function handleClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (actionElement && actionElement.dataset.action === 'retry') {
    loadProfile(getState().route.params.id);
  }
}

async function loadProfile(id) {
  const freshProfile = createInitialState().userProfile;
  updateSlice('userProfile', { ...freshProfile, status: 'loading' });

  try {
    // These four requests are independent, so they run in parallel.
    const [user, postsResponse, todosResponse, cartsResponse] = await Promise.all([
      getUserById(id),
      getUserPosts(id),
      getUserTodos(id),
      getUserCarts(id),
    ]);
    const { posts } = postsResponse;
    const { todos } = todosResponse;
    const { carts } = cartsResponse;

    updateSlice('userProfile', { status: 'success', user, posts, todos, carts });
  } catch (error) {
    const isNotFound = error.status === 404;
    updateSlice('userProfile', { status: 'error', error: error.message, notFound: isNotFound });
  }
}

// ---------- Drawing ----------

function buildProfileMarkup() {
  const { status, user, posts, todos, carts, error, notFound } = getState().userProfile;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading profile…');
  }
  if (notFound) {
    return notFoundMarkup('We could not find that person.');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }

  return `
    ${renderProfileHeader(user)}
    <section class="panel">
      <h2>Posts (${posts.length})</h2>
      ${renderPostList(posts)}
    </section>
    <section class="panel">
      <h2>Tasks (${todos.length})</h2>
      ${renderTodoList(todos)}
    </section>
    <section class="panel">
      <h2>Carts (${carts.length})</h2>
      ${renderCartList(carts)}
    </section>`;
}

function renderProfileHeader(user) {
  const workText = user.company ? joinNonEmpty(' at ', user.company.title, user.company.name) : '';
  const placeText = user.address ? joinNonEmpty(', ', user.address.city, user.address.country) : '';

  return `
    <article class="panel profile-header">
      <img src="${escapeHTML(user.image)}" alt="${escapeHTML(fullName(user))}">
      <div>
        <h2>${escapeHTML(fullName(user))}</h2>
        <p class="muted">@${escapeHTML(user.username)} &middot; ${escapeHTML(user.role)}</p>
        <p>${escapeHTML(workText)}</p>
        <p>${escapeHTML(placeText)}</p>
        <p>${escapeHTML(user.email)}</p>
      </div>
    </article>`;
}

function renderPostList(posts) {
  if (posts.length === 0) {
    return emptyMarkup('This person has not written any posts.');
  }
  const itemsMarkup = posts
    .map((post) => `<li><a href="#/community/${escapeHTML(post.id)}">${escapeHTML(post.title)}</a></li>`)
    .join('');
  return `<ul>${itemsMarkup}</ul>`;
}

function renderTodoList(todos) {
  if (todos.length === 0) {
    return emptyMarkup('This person has no tasks.');
  }
  const itemsMarkup = todos
    .map((todo) => `<li>${todo.completed ? '[done]' : '[open]'} ${escapeHTML(todo.todo)}</li>`)
    .join('');
  return `<ul class="plain-list">${itemsMarkup}</ul>`;
}

function renderCartList(carts) {
  if (carts.length === 0) {
    return emptyMarkup('This person has no carts.');
  }
  const itemsMarkup = carts
    .map((cart) => `<li>Cart ${escapeHTML(cart.id)}: ${cart.totalQuantity} items, ${formatPrice(cart.discountedTotal)}</li>`)
    .join('');
  return `<ul class="plain-list">${itemsMarkup}</ul>`;
}
