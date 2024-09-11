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
        secret: '',
        secure: false,
        options: {},
      },
    ],
    dlHistory: [],
    sendCookies: false,
    sendReferer: false,
    progressColor: '#ffaaff',
    progressOutlineColor: '#999999',
    lastError: '',
    dirList: [],
    addPageLastDir: '',
    aria2DecideFilename: false,
  };
  browser.storage.local.set(initConfig);
  browser.storage.session.set({ activeDownload: {} });
}

/** get the best string representasion of bytes
 * @param {number} bytesize
 * @param {Object} opts
 * @param {boolean} [opts.withUnit]
 * @param {number} [opts.comparison]
 */
export function bestBytesString(bytesize, opts = {}) {
  let { withUnit = true, comparison } = opts;
  if (!bytesize) return `0${withUnit ? ' B' : ''}`;
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
 * there is some inconsistency when in windows,
 * so I guess I'll just change windows path to unix path.
 * @param {string} filename
 * @returns
 */
export function converttoUnixPath(filename) {
  return filename.replaceAll('\\', '/');
}

/**
 * @param {string} filename
 * @returns {[string, string]}
 */
export function getDirnameBasename(filename) {
  if (navigator.userAgent.includes('Windows')) {
    filename = converttoUnixPath(filename);
  }
  let separator = '/';
  const splitted = filename.split(separator);
  const basename = splitted.pop();
  const dirname = splitted.join(separator);

  return [dirname, basename];
}

/** return empty string if not folder otherwise return the foldername
 * if root directory of the downloaded file is /home/person/downloads
 * and the full file path is /home/person/downloads/AnimeBatch/Anime-EPS[1-12].mkv
 * then it return `AnimeBatch`.
 * @param {string} rootDir
 * @param {string} fullFilePath
 */
export function getFolderName(rootDir, fullFilePath) {
  if (navigator.userAgent.includes('Windows')) {
    rootDir = converttoUnixPath(rootDir);
    fullFilePath = converttoUnixPath(fullFilePath);
  }

  let separator = '/';
  if (!fullFilePath.startsWith(rootDir)) return '';

  let relativePath = fullFilePath.replace(rootDir, '').split(separator);
  if (relativePath[0] === '') relativePath = relativePath.slice(1);

  if (relativePath.length > 1) {
    return relativePath[0];
  }

  return '';
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

/** @param {string} txt */
export function capitalize(txt) {
  return txt[0].toUpperCase() + txt.slice(1);
}

/** @param {number} len */
export function randASCII(len) {
  const list = [];
  const range = 0x7f - 0x20;
  while (list.length !== len) {
    list.push(String.fromCharCode(Math.floor(Math.random() * range) + 0x20));
  }

  return list.join('');
}

/**
 * request -> response kinda way for websocket
 *
 * @param {WebSocket} ws
 * @param {any} req - ws.send(req)
 * @param {number} timeout - in ms
 */
export async function wsRpcFetch(ws, req, timeout = 10000) {
  if (typeof req === 'string') {
    req = JSON.parse(req);
  }

  req.id = randASCII(16);

  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject('request timed out');
    }, timeout);

    /** @param {MessageEvent<any>} ev */
    function process(ev) {
      const data = JSON.parse(ev.data);
      if (data.id !== req.id) return;
      resolve(data);

      clearTimeout(id);
      ws.removeEventListener('message', process);
    }

    ws.addEventListener('message', process);

    ws.send(JSON.stringify(req));
  });
}

/**
 * Format must be exactly `Major.minor.patch` without letter prefix/suffix.
 *
 * 0, if the s1 and s2 are equal;
 * a negative value if s1 is less than s2;
 * a positive value if s1 is greater than s2.
 *
 * @param {string} s1
 * @param {string} s2
 */
export function semverCmp(s1, s2) {
  const semver_l = s1.split('.');
  const semver_r = s2.split('.');

  for (let i = 0; i < 3; i++) {
    const left = parseInt(semver_l[i]);
    const right = parseInt(semver_r[i]);

    if (left !== right) {
      return right - left;
    }
  }

  return 0;
}

/**
 * Perform insertion fuzzy finding and return the list of matching character index.
 * empty list if pattern don't match.
 * pattern such as `*` or `?` is not implemented.
 *
 * @param {string} s
 * @param {string} pattern
 */
export function fuzzyFind(s, pattern, caseSensitive = false) {
  const matchIndexes = [];
  if (!pattern) return matchIndexes;

  let pattern_index = 0;

  if (!caseSensitive) {
    s = s.toLowerCase();
    pattern = pattern.toLowerCase();
  }

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const c_pattern = pattern[pattern_index];

    if (c === c_pattern) {
      matchIndexes.push(i);
      pattern_index++;
    }

    if (pattern_index >= pattern.length) break;
  }

  if (pattern_index !== pattern.length) return [];

  return matchIndexes;
}

const htmlEscapeLookup = {
  '&': '&amp',
  '<': '&lt',
  '>': '&gt',
  '"': '&quot',
  "'": '&#39',
};

/** @param {string} s */
export function escapeHTML(s) {
  return s.replace(/[&"'<>]/g, (c) => htmlEscapeLookup[c]);
}
