import { getState, updateSlice } from '../state.js';
import { getMyTodos, addTodo, updateTodo, deleteTodo } from '../api.js';
import { escapeHTML, validateTaskText } from '../utils.js';
import { loadingMarkup, errorMarkup, emptyMarkup } from '../components.js';

const FILTER_CHOICES = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export function mount() {
  document.getElementById('app').innerHTML = `
    <section class="tasks-view">
      <h1>My tasks</h1>
      <form id="task-form" class="panel" novalidate>
        <label for="task-text">New task</label>
        <div class="inline-form">
          <input id="task-text" name="task" type="text" autocomplete="off">
          <button id="task-add-button" type="submit">Add task</button>
        </div>
        <p id="task-form-error" class="field-error" role="alert"></p>
      </form>
      <div id="task-list-area"></div>
    </section>`;

  document.getElementById('task-form').addEventListener('submit', handleAddTask);
  document.getElementById('task-list-area').addEventListener('click', handleListClick);
  loadTasks();
}

export function render() {
  const { isAdding, addError } = getState().tasks;

  document.getElementById('task-form-error').textContent = addError;
  document.getElementById('task-add-button').disabled = isAdding;
  document.getElementById('task-add-button').textContent = isAdding ? 'Adding…' : 'Add task';
  document.getElementById('task-list-area').innerHTML = buildListMarkup();
}

// ---------- Events ----------

function handleListClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }
  const { action, id, filter } = actionElement.dataset;

  if (action === 'toggle') {
    toggleTask(Number(id));
  }
  if (action === 'delete') {
    deleteTask(Number(id));
  }
  if (action === 'set-filter') {
    updateSlice('tasks', { filter });
  }
  if (action === 'retry') {
    loadTasks();
  }
}

async function handleAddTask(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const text = form.elements.task.value.trim();

  const errorMessage = validateTaskText(text);
  if (errorMessage) {
    updateSlice('tasks', { addError: errorMessage });
    return;
  }

  updateSlice('tasks', { isAdding: true, addError: '' });

  try {
    const { user } = getState().auth;
    const returnedTodo = await addTodo({ todo: text, completed: false, userId: user.id });
    const { items } = getState().tasks;

    const localTodo = {
      ...returnedTodo,
      id: makeUniqueLocalId(returnedTodo.id, items),
      isLocal: true,
    };
    updateSlice('tasks', { items: [localTodo, ...items], isAdding: false });
    form.reset();
  } catch (error) {
    updateSlice('tasks', { isAdding: false, addError: error.message });
  }
}

// The server returns the same id for every new todo, so we make sure ours is unique.
function makeUniqueLocalId(serverId, items) {
  const highestId = items.reduce((highest, task) => Math.max(highest, task.id), 0);
  return Math.max(serverId, highestId + 1);
}

// ---------- Talking to the server ----------

async function loadTasks() {
  const { user } = getState().auth;
  updateSlice('tasks', { status: 'loading', error: '', actionError: '' });

  try {
    const { todos } = await getMyTodos(user.id);
    updateSlice('tasks', { status: 'success', items: todos });
  } catch (error) {
    updateSlice('tasks', { status: 'error', error: error.message });
  }
}

async function toggleTask(taskId) {
  const task = getState().tasks.items.find((item) => item.id === taskId);
  if (!task) {
    return;
  }
  const newCompletedValue = !task.completed;

  // A task we created here does not exist on the server, so we only change our state.
  if (task.isLocal) {
    changeTask(taskId, { completed: newCompletedValue });
    return;
  }

  try {
    const updatedTodo = await updateTodo(taskId, newCompletedValue);
    changeTask(taskId, { completed: updatedTodo.completed });
  } catch (error) {
    updateSlice('tasks', { actionError: error.message });
  }
}

async function deleteTask(taskId) {
  const task = getState().tasks.items.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  if (task.isLocal) {
    removeTask(taskId);
    return;
  }

  try {
    const deletedTodo = await deleteTodo(taskId);
    if (deletedTodo.isDeleted === true) {
      removeTask(taskId);
    } else {
      updateSlice('tasks', { actionError: 'The server did not delete this task.' });
    }
  } catch (error) {
    updateSlice('tasks', { actionError: error.message });
  }
}

// ---------- Immutable updates ----------

function changeTask(taskId, changes) {
  const { items } = getState().tasks;
  const updatedItems = items.map((item) => (item.id === taskId ? { ...item, ...changes } : item));
  updateSlice('tasks', { items: updatedItems, actionError: '' });
}

function removeTask(taskId) {
  const { items } = getState().tasks;
  const updatedItems = items.filter((item) => item.id !== taskId);
  updateSlice('tasks', { items: updatedItems, actionError: '' });
}

// ---------- Drawing ----------

function matchesFilter(task, filter) {
  if (filter === 'active') {
    return !task.completed;
  }
  if (filter === 'completed') {
    return task.completed;
  }
  return true;
}

function buildListMarkup() {
  const { status, items, filter, error, actionError } = getState().tasks;

  if (status === 'idle' || status === 'loading') {
    return loadingMarkup('Loading your tasks…');
  }
  if (status === 'error') {
    return errorMarkup(error);
  }

  // Derived values: worked out from items every time we draw.
  const visibleTasks = items.filter((task) => matchesFilter(task, filter));
  const itemsLeft = items.filter((task) => !task.completed).length;
  const itemsLeftText = `${itemsLeft} ${itemsLeft === 1 ? 'item' : 'items'} left`;

  const listMarkup =
    visibleTasks.length === 0
      ? emptyMarkup('No tasks to show here.')
      : `<ul class="plain-list">${visibleTasks.map((task) => renderTaskItem(task)).join('')}</ul>`;
  const actionErrorMarkup = actionError
    ? `<p class="form-error" role="alert">${escapeHTML(actionError)}</p>`
    : '';

  return `
    <div class="filter-bar">
      ${FILTER_CHOICES.map((choice) => renderFilterButton(choice, filter)).join('')}
      <span class="muted">${itemsLeftText}</span>
    </div>
    ${actionErrorMarkup}
    ${listMarkup}`;
}

function renderFilterButton(choice, activeFilter) {
  const isActive = choice.value === activeFilter;

  return `<button type="button" class="secondary-button ${isActive ? 'is-active' : ''}" data-action="set-filter" data-filter="${choice.value}" aria-pressed="${isActive}">${choice.label}</button>`;
}

function renderTaskItem(task) {
  const id = escapeHTML(task.id);

  return `
    <li class="task-item ${task.completed ? 'is-completed' : ''}">
      <label>
        <input type="checkbox" data-action="toggle" data-id="${id}" ${task.completed ? 'checked' : ''}>
        <span>${escapeHTML(task.todo)}</span>
      </label>
      <button type="button" class="danger-button" data-action="delete" data-id="${id}">Delete</button>
    </li>`;
}
