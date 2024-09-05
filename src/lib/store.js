import browser from 'webextension-polyfill';
import { wsRpcFetch } from '../lib/util';
import { readable, writable } from 'svelte/store';
import { Aria2Tray } from '../lib/aria2tray';

export let integrationVersion = writable('0.1.0');

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
          integrationVersion.update((_) => res.result.version);
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
