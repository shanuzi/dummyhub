// Bootstrap: read the delay setting, restore a saved session, then start the router.

import { setRenderCallback, setState } from './state.js';
import { renderHeader, mountHeader } from './header.js';
import { renderCurrentView, startRouter } from './router.js';
import { restoreSession } from './auth.js';

function renderApp() {
  renderHeader();
  renderCurrentView();
}

// Open the app with ?delay=1500 to slow down every request (handy for the walkthrough).
function readDelayFromAddress() {
  const addressParams = new URLSearchParams(window.location.search);
  const delayMs = Number(addressParams.get('delay'));

  if (delayMs > 0) {
    setState({ settings: { delayMs } });
  }
}

async function startApp() {
  readDelayFromAddress();
  setRenderCallback(renderApp);
  mountHeader();
  await restoreSession();
  startRouter();
}

startApp();
