import { getState, updateSlice } from '../state.js';
import { getPosts, searchPosts, getPostTags, getPostsByTag } from '../api.js';
import { POSTS_PER_PAGE, POST_EXCERPT_LENGTH, SEARCH_DEBOUNCE_MS } from '../constants.js';
import { debounce, escapeHTML, truncateText } from '../utils.js';
import { loadingMarkup, errorMarkup, emptyMarkup } from '../components.js';

export function mount() {
  const { q } = getState().community;

  document.getElementById('app').innerHTML = `
    <section class="community-view">
      <h1>Community</h1>
      <form id="community-controls" class="controls">
        <div class="field">
          <label for="community-search">Search posts</label>
          <input id="community-search" name="search" type="search" value="${escapeHTML(q)}">
        </div>
      </form>
      <div id="tag-chips" class="chip-list"></div>
      <div id="post-feed"></div>
    </section>`;

  attachListeners();
  loadTagsOnce();
  loadPosts(false);
}

export function render() {
  document.getElementById('tag-chips').innerHTML = buildTagChipsMarkup();
  document.getElementById('post-feed').innerHTML = buildFeedMarkup();
}

// ---------- Events ----------

function attachListeners() {
  const controlsForm = document.getElementById('community-controls');
  const debouncedSearch = debounce(handleSearchChange, SEARCH_DEBOUNCE_MS);

  controlsForm.addEventListener('submit', (event) => event.preventDefault());
  controlsForm.addEventListener('input', (event) => {
    if (event.target.name === 'search') {
      debouncedSearch(event.target.value);
    }
  });

  document.getElementById('tag-chips').addEventListener('click', handleClick);
  document.getElementById('post-feed').addEventListener('click', handleClick);
}

function handleSearchChange(searchText) {
  updateSlice('community', { q: searchText.trim(), tag: '' });
  loadPosts(false);
}

function handleClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }
  const { action, id, tag, reaction } = actionElement.dataset;

  if (action === 'select-tag') {
    chooseTag(tag);
  }
  if (action === 'react') {
    addReaction(Number(id), reaction);
  }
  if (action === 'load-more') {
    loadPosts(true);
  }
  if (action === 'retry') {
    loadPosts(false);
  }
}

// Clicking the active tag again turns the filter off.
function chooseTag(tag) {
  const newTag = getState().community.tag === tag ? '' : tag;
  document.getElementById('community-search').value = '';
  updateSlice('community', { tag: newTag, q: '' });
  loadPosts(false);
}

// Likes and dislikes only change local state (the server would not save them).
function addReaction(postId, reactionName) {
  const { items } = getState().community;

  const updatedItems = items.map((post) => {
    if (post.id !== postId) {
      return post;
    }
    const updatedReactions = {
      ...post.reactions,
      [reactionName]: post.reactions[reactionName] + 1,
    };
    return { ...post, reactions: updatedReactions };
  });

  updateSlice('community', { items: updatedItems });
}

// ---------- Loading data ----------

async function loadTagsOnce() {
  if (getState().community.tags.length > 0) {
    return;
  }
  try {
    const tags = await getPostTags();
    updateSlice('community', { tags });
  } catch (error) {
    console.error('Could not load the post tags:', error.message);
  }
}

function fetchPosts(searchText, tag, options) {
  if (searchText) {
    return searchPosts(searchText, options);
  }
  if (tag) {
    return getPostsByTag(tag, options);
  }
  return getPosts(options);
}

// shouldAppend is true for "Load more" and false for a fresh list.
async function loadPosts(shouldAppend) {
  const { items, q, tag } = getState().community;
  const skip = shouldAppend ? items.length : 0;

  if (shouldAppend) {
    updateSlice('community', { isLoadingMore: true, loadMoreError: '' });
  } else {
    updateSlice('community', { status: 'loading', error: '' });
  }

  try {
    const { posts, total } = await fetchPosts(q, tag, { limit: POSTS_PER_PAGE, skip });
    const latestItems = getState().community.items;
    const allPosts = shouldAppend ? [...latestItems, ...posts] : posts;
    updateSlice('community', { status: 'success', items: allPosts, total, isLoadingMore: false });
  } catch (error) {
    if (shouldAppend) {
      updateSlice('community', { isLoadingMore: false, loadMoreError: error.message });
    } else {
      updateSlice('community', { status: 'error', error: error.message });
    }
  }
}

// ---------- Drawing ----------

function buildTagChipsMarkup() {
  const { tags, tag: activeTag } = getState().community;

  return tags
    .map((tagName) => {
      const activeClass = tagName === activeTag ? 'is-active' : '';
      return `<button type="button" class="chip secondary-button ${activeClass}" data-action="select-tag" data-tag="${escapeHTML(tagName)}">${escapeHTML(tagName)}</button>`;
    })
    .join('');
}

function buildFeedMarkup() {
  const { status, items, total, error, q, isLoadingMore, loadMoreError } = getState().community;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading posts…');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }
  if (items.length === 0) {
    return emptyMarkup(q ? `No posts found for "${q}".` : 'No posts to show.');
  }

  const postsMarkup = items.map((post) => renderPostCard(post)).join('');
  const loadMoreErrorMarkup = loadMoreError
    ? `<p class="form-error" role="alert">${escapeHTML(loadMoreError)}</p>`
    : '';
  const loadMoreMarkup =
    items.length < total
      ? `<button type="button" data-action="load-more" ${isLoadingMore ? 'disabled' : ''}>${isLoadingMore ? 'Loading…' : 'Load more'}</button>`
      : '';

  return `
    <div class="post-list">${postsMarkup}</div>
    ${loadMoreErrorMarkup}
    ${loadMoreMarkup}`;
}

function renderPostCard(post) {
  const tagsMarkup = post.tags
    .map((tagName) => `<span class="tag">#${escapeHTML(tagName)}</span>`)
    .join('');
  const id = escapeHTML(post.id);

  return `
    <article class="panel">
      <h2><a href="#/community/${id}">${escapeHTML(post.title)}</a></h2>
      <p>${escapeHTML(truncateText(post.body, POST_EXCERPT_LENGTH))}</p>
      <div class="chip-list">${tagsMarkup}</div>
      <div class="post-actions">
        <button type="button" class="secondary-button" data-action="react" data-reaction="likes" data-id="${id}">Like (${post.reactions.likes})</button>
        <button type="button" class="secondary-button" data-action="react" data-reaction="dislikes" data-id="${id}">Dislike (${post.reactions.dislikes})</button>
        <span class="muted">${post.views} views</span>
      </div>
    </article>`;
}
