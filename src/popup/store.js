import { readable, writable } from 'svelte/store';
import browser from 'webextension-polyfill';
import { Aria2Tray } from '../lib/aria2tray';
import { check_connection, wsRpcFetch } from '../lib/util';

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

/** @type {import('svelte/store').Readable<WebSocket>} */
export let integrationWS = readable(null, function start(set) {
  function retry() {
    setTimeout(() => {
      init();
    }, 3000);
  }

  function init() {
    const ws = new WebSocket('ws://127.0.0.1:31795');

    ws.addEventListener('open', async () => {
      const { RPCs } = await browser.storage.local.get(['RPCs']);
      for (const rpcCfg of RPCs) {
        const secret = rpcCfg.secret;
        const a2t = new Aria2Tray(secret);
        const res = await wsRpcFetch(ws, a2t.version('id_c'));
        if (res.result) {
          set(ws);
          setIntegrationPass(secret);
          break;
        }
      }
    });

    ws.addEventListener('close', () => {
      set(null);
      retry();
    });
  }

  init();
});

let integrationPassword = '';
/** @param {string} val */
export function setIntegrationPass(val) {
  integrationPassword = val;
}
export function getIntegrationPass() {
  return integrationPassword;
}
