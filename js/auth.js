// Login, logout and session restore. Uses the API, the state and sessionStorage.

import { login, getCurrentUser } from './api.js';
import { createInitialState, getState, setState } from './state.js';
import { SESSION_STORAGE_KEY } from './constants.js';

function saveSession(accessToken, refreshToken) {
  const sessionText = JSON.stringify({ accessToken, refreshToken });
  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionText);
}

function loadSavedSession() {
  const sessionText = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionText) {
    return null;
  }
  try {
    return JSON.parse(sessionText);
  } catch (error) {
    console.error('The saved session could not be read:', error.message);
    return null;
  }
}

// GET /auth/me checks that the token still works and refreshes the user data.
export async function confirmSession() {
  const currentUser = await getCurrentUser();
  const { auth } = getState();
  setState({ auth: { ...auth, user: currentUser } });
}

export async function signIn(username, password) {
  const loginData = await login(username, password);
  const { accessToken, refreshToken, ...user } = loginData;

  setState({ auth: { user, accessToken, refreshToken } });
  saveSession(accessToken, refreshToken);

  try {
    await confirmSession();
  } catch (error) {
    clearSession();
    throw error;
  }
}

// Called once when the app starts (bonus: the session survives a page refresh).
export async function restoreSession() {
  const savedSession = loadSavedSession();
  if (!savedSession) {
    return;
  }

  setState({
    auth: {
      user: null,
      accessToken: savedSession.accessToken,
      refreshToken: savedSession.refreshToken,
    },
  });

  try {
    await confirmSession();
  } catch (error) {
    console.error('The saved session is no longer valid:', error.message);
    clearSession();
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  const freshState = createInitialState();

  setState({
    auth: freshState.auth,
    cart: [],
    checkout: freshState.checkout,
    dashboard: freshState.dashboard,
    tasks: freshState.tasks,
  });
}

export function logout() {
  window.location.replace('#/login');
  clearSession();
}
