import { readable, writable } from 'svelte/store';
import browser from 'webextension-polyfill';
import { check_connection } from '../lib/util';

// ============== UI ==================

/** @type {page} */
export let page = readable(window.location.hash, (set) => {
  function hashChangeHandler() {
    set(window.location.hash);
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
  basename: '#0',
  status: 'waiting',
});

export let storageCache = writable({
  progressColor: '#ffaaff',
  progressOutlineColor: '#999',
});

// ============ IPC  =============

/** @type {RPCConfig} */
export let cfg = null;

/** @type {import('svelte/store').Readable<WebSocket>} */
export let aria2WS = readable(null, function start(set, update) {
  function retry() {
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
    const ws = new WebSocket(uri);
    ws.addEventListener('open', async () => {
      set(ws);
    });

    ws.addEventListener('close', () => {
      set(null);
      retry();
    });
  }

  init();
});
