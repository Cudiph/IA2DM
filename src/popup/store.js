import { writable } from 'svelte/store';
import browser from 'webextension-polyfill';
import { check_connection } from '../lib/util';

// the let variables is to use only in event callback so they're already assigned when called
/** @type {WebSocket} */
export let wsConn = null;

/** @type {RPCConfig} */

export let cfg = null;
/** @type {page} */
export let page = writable('main');
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

export async function getWSConn() {
  if (wsConn) return wsConn;
  const { RPCs, progressColor, progressOutlineColor } = await browser.storage.local.get([
    'RPCs',
    'progressColor',
    'progressOutlineColor',
  ]);
  const onlineIdx = await check_connection(RPCs);

  if (onlineIdx === -1) return null;

  cfg = RPCs[onlineIdx];
  storageCache.set({ progressColor, progressOutlineColor });
  const uri = `ws${cfg.secure ? 's' : ''}://${cfg.host}:${cfg.port}/jsonrpc`;
  wsConn = new WebSocket(uri);
  wsConn.addEventListener('close', () => {
    wsConn = null;
  });
  return wsConn;
}

getWSConn();
