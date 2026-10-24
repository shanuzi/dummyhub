// Every network call goes through request(). This file never touches the DOM.

import { API_BASE_URL, LOGIN_EXPIRY_MINUTES } from './constants.js';
import { getState } from './state.js';

// ---------- Helpers ----------

// Turns { limit: 12, skip: 0, q: '' } into "?limit=12&skip=0". Empty values are skipped.
function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(name, value);
    }
  });

  const queryText = searchParams.toString();
  return queryText ? `?${queryText}` : '';
}

// Adds ?delay=1500 style slowdown so loading states can be demonstrated.
function addDelay(url, delayMs) {
  if (delayMs <= 0) {
    return url;
  }
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}delay=${delayMs}`;
}

function normalizeCategory(category) {
  if (typeof category === 'string') {
    return { slug: category, name: category };
  }
  return category;
}

function normalizeTag(tag) {
  if (typeof tag === 'string') {
    return tag;
  }
  return tag.slug;
}

// ---------- The one fetch wrapper ----------

export async function request(path, { method = 'GET', body, auth = false } = {}) {
  const { accessToken } = getState().auth;
  const { delayMs } = getState().settings;

  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const prefix = auth ? '/auth' : '';
  const url = addDelay(`${API_BASE_URL}${prefix}${path}`, delayMs);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();

  // fetch() only fails on network problems. HTTP errors (400, 404...) must be checked by hand.
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

// ---------- Auth ----------

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { username, password, expiresInMins: LOGIN_EXPIRY_MINUTES },
  });
}

export function getCurrentUser() {
  return request('/me', { auth: true });
}

// ---------- Products ----------

export function getProducts(options = {}) {
  return request(`/products${buildQuery(options)}`);
}

export function searchProducts(searchText, options = {}) {
  return request(`/products/search${buildQuery({ q: searchText, ...options })}`);
}

export async function getProductCategories() {
  const categories = await request('/products/categories');
  return categories.map(normalizeCategory);
}

export function getProductsByCategory(slug, options = {}) {
  return request(`/products/category/${encodeURIComponent(slug)}${buildQuery(options)}`);
}

export function getProductById(id) {
  return request(`/products/${id}`);
}

// ---------- Carts ----------

export function getCartsByUser(userId) {
  return request(`/carts/user/${userId}`);
}

export function getMyCarts(userId) {
  return request(`/carts/user/${userId}`, { auth: true });
}

export function addCart(userId, products) {
  return request('/carts/add', { method: 'POST', body: { userId, products } });
}

// ---------- Recipes ----------

export function getRecipes(options = {}) {
  return request(`/recipes${buildQuery(options)}`);
}

export function searchRecipes(searchText, options = {}) {
  return request(`/recipes/search${buildQuery({ q: searchText, ...options })}`);
}

export function getRecipeTags() {
  return request('/recipes/tags');
}

export function getRecipesByTag(tag, options = {}) {
  return request(`/recipes/tag/${encodeURIComponent(tag)}${buildQuery(options)}`);
}

export function getRecipesByMealType(mealType, options = {}) {
  return request(`/recipes/meal-type/${encodeURIComponent(mealType)}${buildQuery(options)}`);
}

export function getRecipeById(id) {
  return request(`/recipes/${id}`);
}

// ---------- Users ----------

export function getUsers(options = {}) {
  return request(`/users${buildQuery(options)}`);
}

export function searchUsers(searchText, options = {}) {
  return request(`/users/search${buildQuery({ q: searchText, ...options })}`);
}

export function filterUsers(key, value, options = {}) {
  return request(`/users/filter${buildQuery({ key, value, ...options })}`);
}

export function getUserById(id) {
  return request(`/users/${id}`);
}

export function getUserPosts(userId) {
  return request(`/users/${userId}/posts`);
}

export function getUserTodos(userId) {
  return request(`/users/${userId}/todos`);
}

export function getUserCarts(userId) {
  return request(`/users/${userId}/carts`);
}

// The same data, requested as the logged-in user (the "/auth" prefix).
export function getMyTodos(userId) {
  return request(`/users/${userId}/todos`, { auth: true });
}

export function getMyPosts(userId) {
  return request(`/users/${userId}/posts`, { auth: true });
}

// ---------- Posts and comments ----------

export function getPosts(options = {}) {
  return request(`/posts${buildQuery(options)}`);
}

export function searchPosts(searchText, options = {}) {
  return request(`/posts/search${buildQuery({ q: searchText, ...options })}`);
}

export async function getPostTags() {
  const tags = await request('/posts/tag-list');
  return tags.map(normalizeTag);
}

export function getPostsByTag(tag, options = {}) {
  return request(`/posts/tag/${encodeURIComponent(tag)}${buildQuery(options)}`);
}

export function getPostById(id) {
  return request(`/posts/${id}`);
}

export function getPostComments(postId) {
  return request(`/posts/${postId}/comments`);
}

export function addComment({ body, postId, userId }) {
  return request('/comments/add', { method: 'POST', body: { body, postId, userId } });
}

// ---------- Todos ----------

export function addTodo({ todo, completed, userId }) {
  return request('/todos/add', { method: 'POST', body: { todo, completed, userId } });
}

export function updateTodo(todoId, completed) {
  return request(`/todos/${todoId}`, { method: 'PUT', body: { completed } });
}

export function deleteTodo(todoId) {
  return request(`/todos/${todoId}`, { method: 'DELETE' });
}

// ---------- Quotes ----------

export function getRandomQuote() {
  return request('/quotes/random', { auth: true });
}
