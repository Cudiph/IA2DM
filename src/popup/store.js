import { readable, writable } from 'svelte/store';
import browser from 'webextension-polyfill';
import { check_connection } from '../lib/util';
import { parseHashURL } from '../lib/routing';

// ============== UI ==================

/** @type {route} */
export let route = readable(parseHashURL(), (set) => {
  function hashChangeHandler() {
    const pageStruct = parseHashURL();

    set(pageStruct);
  }

  window.addEventListener('hashchange', hashChangeHandler);

  return function stop() {
    window.removeEventListener('hashchange', hashChangeHandler);
  };
});

/** @type {import("svelte/store").Writable<DownloadItem>} */
export let selectedItem = writable({
  gid: '0',
  url: '',
  icon: '',
  dirname: '/',
  basename: 'GID not found',
  status: 'error',
});

export let storageCache = writable({
  progressColor: '#ffaaff',
  progressOutlineColor: '#999',
});

export let searchQuery = writable('');

export let activeDownloadList = writable([]);

// ============ IPC  =============

/** @type {RPCConfig} */
export let cfg = null;

/** @type {import('svelte/store').Readable<WebSocket>} */
export let aria2WS = readable(null, function start(set, update) {
  let ws = null;
  let enoughTrying = false;

  function retry() {
    if (enoughTrying) return;
    setTimeout(() => {
      init();
    }, 3000);
  }

  async function init() {
    const { RPCs, progressColor, progressOutlineColor } = await browser.storage.local.get([
      'RPCs',
      'progressColor',
      'progressOutlineColor',
    ]);

    const onlineIdx = await check_connection(RPCs);

    if (onlineIdx === -1) {
      set(null);
      retry();
      return;
    }

    cfg = RPCs[onlineIdx];
    storageCache.set({ progressColor, progressOutlineColor });
    const uri = `ws${cfg.secure ? 's' : ''}://${cfg.host}:${cfg.port}/jsonrpc`;
    ws = new WebSocket(uri);
    ws.addEventListener('open', async () => {
      set(ws);
    });

    ws.addEventListener('close', () => {
      set(null);
      retry();
    });
  }

  init();

  return function stop() {
    enoughTrying = true;
    if (ws) {
      ws.close();
      ws = null;
    }
  };
});
