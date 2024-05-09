import browser from 'webextension-polyfill';
import { getAria2OOP } from './aria2rpc';

//cache
let os = null;

/** return index of rpc config stored in storage, return -1 otherwise
 * @param {RPCConfig[]} RPCs
 */
export async function check_connection(RPCs) {
  /** @type {RPCConfig[]} */
  for (let i = 0; i < RPCs.length; i++) {
    const e = RPCs[i];
    const aria2 = getAria2OOP(e);
    try {
      const res = await aria2.getVersion();
      const resJson = await res.json();
      if (resJson.result) return i;
    } catch (e) {
      continue;
    }
  }

  return -1;
}

/** generate cookie string from cookies list */
export function cookiesStringify(cookies) {
  let temp = '';
  for (const c of cookies) {
    temp += `${c.name}=${c.value}; `;
  }

  return temp.trim().slice(0, -1);
}

export function resetConfig() {
  /** @type {aria2Storage} */
  const initConfig = {
    intercept: true,
    RPCs: [
      {
        name: 'Main Instance',
        host: '127.0.0.1',
        port: 6800,
        saveDir: '',
        secret: '',
        secure: false,
        options: {},
      },
    ],
    activeDownload: {},
    dlHistory: [],
    sendCookies: false,
    sendReferer: false,
    progressColor: '#ffaaff',
    progressOutlineColor: '#999999',
  };
  browser.storage.local.set(initConfig);
}

/** get the best string representasion of bytes
 * @param {number} bytesize
 * @param {Object} opts
 * @param {boolean} [opts.withUnit]
 * @param {number} [opts.comparison]
 */
export function bestBytesString(bytesize, opts = {}) {
  let { withUnit = true, comparison } = opts;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']; // No sane person would reach pettabytes
  let counter = 0;
  let compareCounter = 0;
  while (bytesize >= 1000) {
    bytesize /= 1000;
    counter++;
  }

  if (comparison) {
    while (comparison >= 1000) {
      if (comparison) {
        comparison /= 1000;
        compareCounter++;
      }
    }
    withUnit = counter === compareCounter ? false : true;
  }
  return `${parseFloat(bytesize.toFixed(2))}${withUnit ? ' ' + units[counter] : ''}`;
}

/**
 * @param {string} filename
 * @returns {Promise<[string, string]>}
 */
export async function getDirnameBasename(filename) {
  let separator = '/';
  if (!os) {
    const platform = await browser.runtime.getPlatformInfo();
    os = platform.os;
    if (os === 'win') separator = '\\';
  }
  const splitted = filename.split(separator);
  const basename = splitted.pop();
  const dirname = splitted.join(separator);

  return [dirname, basename];
}

/**
 * @param {number} seconds
 */
export function bestTimeString(seconds) {
  if (!seconds || seconds === Infinity) return '0s';
  const sec = Math.floor(seconds % 60);
  const min = Math.floor((seconds / 60) % 60);
  const hour = Math.floor((seconds / 3600) % 24);
  const day = Math.floor(seconds / 86400);

  let repr = '';
  if (day >= 1) repr += `${day}d `;
  if (hour >= 1) repr += `${hour}h `;
  if (min >= 1) repr += `${min}m `;
  repr += `${sec}s`;

  return repr;
}

/**
 * @param {string} gid
 */
export async function findAndRemoveHistory(gid) {
  const { dlHistory } = await browser.storage.local.get(['dlHistory']);
  for (let i = 0; i < dlHistory.length; i++) {
    if (gid === dlHistory[i].gid) {
      dlHistory.splice(i, 1);
      break;
    }
  }

  browser.storage.local.set({ dlHistory });
}