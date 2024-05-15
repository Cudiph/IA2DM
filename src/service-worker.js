import browser from 'webextension-polyfill';
import { getAria2JSON, getAria2OOP } from './lib/aria2rpc.js';
import { gen_checklist_icon, gen_progress_icon, resetActionIcon } from './lib/graphics.js';
import {
  check_connection,
  cookiesStringify,
  getDirnameBasename,
  getFolderName,
  resetConfig,
} from './lib/util.js';

const bslocal = browser.storage.local;
const dl = browser.downloads;
/** @type {WebSocket} */
let wsConn = null;
let intervalIDs = [];
let holdCompleteIcon = false;
let badgeTimeoutID = null;

browser.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason == 'install') {
    resetConfig();
  }

  const min_perms_query = await browser.permissions.contains({
    origins: ['*://localhost/*', '*://127.0.0.1/*'],
  });
  if (!min_perms_query) {
    browser.runtime.openOptionsPage();
  }
});

// intercept start here
browser.downloads.onCreated.addListener(async (item) => {
  const { intercept, activeDownload, sendCookies, sendReferer, RPCs } = await bslocal.get([
    'intercept',
    'activeDownload',
    'sendCookies',
    'sendReferer',
    'RPCs',
  ]);

  if (!intercept) {
    dl.resume(item.id);
    return;
  }
  const onlineIdx = await check_connection(RPCs);

  if (onlineIdx == -1) return;

  const icon = await dl.getFileIcon(item.id).catch((e) => {
    console.error('ICON: ', e);
    return null;
  });

  /** @type {RPCConfig} */
  const rpcOnlineCfg = RPCs[onlineIdx];
  const aria2 = getAria2OOP(rpcOnlineCfg);
  connectWebsocket(rpcOnlineCfg);

  const [dirname, basename] = getDirnameBasename(item.filename);
  if (!rpcOnlineCfg.options.dir) rpcOnlineCfg.options.dir = dirname;
  rpcOnlineCfg.options.out = basename;

  // forward referer to aria2
  // startwith prevent about:blank to be set
  if (sendReferer && item.referrer && item.referrer.startsWith('http')) {
    rpcOnlineCfg.options.referer = item.referrer;
  }

  // forward cookies to aria2
  if (sendCookies) {
    const cookies = await browser.cookies.getAll({
      url: item.url,
      storeId: item.cookieStoreId,
    });
    if (cookies.length) {
      if (!rpcOnlineCfg.options.header) rpcOnlineCfg.options.header = [];
      const cookiesHeader = `Cookie: ${cookiesStringify(cookies)}`;
      rpcOnlineCfg.options.header.push(cookiesHeader);
    }
  }

  /** @type {activeDownloadItem} */
  let download_obj;
  try {
    const res = await aria2.addUri([item.url], rpcOnlineCfg.options);
    const resjson = await res.json();

    download_obj = {
      gid: resjson.result,
      url: item.url || '',
      icon: icon,
      serverName: rpcOnlineCfg.name,
      startTime: +new Date(),
    };
    activeDownload[resjson.result] = download_obj;
  } catch (e) {
    bslocal.set({ lastError: e.toString() });
    console.error(e);
    return;
  }

  // delete download from browser
  dl.cancel(item.id);
  dl.erase({ id: item.id });

  // add to activeDownload list
  bslocal.set({ activeDownload });
});

/**
 * @param {RPCConfig} cfg
 */
function initInterval(cfg) {
  /** @type {any} */
  const aria2json = getAria2JSON(cfg, { id: 'intervalRequest' });
  const progressInterval = setInterval(() => {
    wsConn.send(
      `[${aria2json.tellActive(['totalLength', 'completedLength'])},${aria2json.tellWaiting(
        0,
        1e8,
        ['totalLength', 'completedLength']
      )}]`
    );
  }, 2000);

  const downloadEndInterval = setInterval(() => {
    onDownloadEnd(cfg);
  }, 10000);

  intervalIDs.push(progressInterval, downloadEndInterval);
}

function finiInterval() {
  for (const id of intervalIDs) {
    clearInterval(id);
  }
  intervalIDs = [];
}

/** @param {jsonRPCResponse[]} data */
async function intervalResponseHandler(data) {
  if (data[0].id !== 'intervalRequest') return;
  let totalSize = 0;
  let totalCompletedSize = 0;

  for (const res of data) {
    for (const item of res.result) {
      totalSize += parseInt(item.totalLength);
      totalCompletedSize += parseInt(item.completedLength);
    }
  }

  if (holdCompleteIcon) return;
  browser.action.setIcon({
    imageData: await gen_progress_icon(totalCompletedSize / totalSize),
  });
}

/**
 * @param {RPCConfig} cfg
 */
function onDownloadEnd(cfg) {
  /** @type {any} */
  const aria2json = getAria2JSON(cfg, { id: 'onDownloadEndHandler' });
  wsConn.send(`[${aria2json.getGlobalStat()}]`);
}

/** check for every active download then close the websocket connection
 * @param {any} data
 */
async function onDownloadEndResponseHandler(data) {
  let activeCounter = 0;
  const res = data[0];
  if (res.id !== 'onDownloadEndHandler') return;
  activeCounter += parseInt(res.result.numActive) + parseInt(res.result.numWaiting);

  if (activeCounter === 0) {
    wsConn.close();
    browser.action.setIcon({ imageData: await gen_checklist_icon() });
  }
}

/**
 * @param {RPCConfig} cfg
 * @param {jsonRPCPayload} data
 */
async function moveToDLHistory(cfg, data) {
  const { activeDownload, dlHistory } = await bslocal.get(['activeDownload', 'dlHistory']);
  const aria2 = getAria2OOP(cfg);
  const status = data.method.split('load').pop();
  switch (status) {
    case 'Stop':
      break;
    case 'Complete':
      holdCompleteIcon = true;
      browser.action.setIcon({ imageData: await gen_checklist_icon() });
      setTimeout(() => {
        holdCompleteIcon = false;
      }, 3000);
      break;
    case 'Error':
    default:
      break;
  }

  for (const i of data.params) {
    let activeDlCache = activeDownload[i.gid];
    const res = await aria2.tellStatus(i.gid);
    const { result } = await res.json();
    const theUri = result.files[0]?.uris[0]?.uri;

    let dirname, basename;
    const folderName = getFolderName(result.dir, result.files[0]?.path);
    if (folderName && result.dir && !result.files[0]?.path?.startsWith('./')) {
      dirname = result.dir;
      basename = folderName;
    } else {
      [dirname, basename] = getDirnameBasename(result.files[0]?.path);
    }

    // default value
    const download_obj = {
      gid: i.gid,
      icon: '',
      dirname,
      basename: basename || theUri || 'Unknown filename',
      status: result.status,
      url: theUri || '',
      seeder: result.seeder === 'true' ? true : false,
      uploadSpeed: parseInt(result.uploadSpeed),
      dlSpeed: parseInt(result.downloadSpeed),
      connections: parseInt(result.connections),
      completedLength: parseInt(result.completedLength),
      uploadLength: parseInt(result.uploadLength),
      pieceLength: parseInt(result.pieceLength),
      numPieces: parseInt(result.numPieces),
      numSeeders: parseInt(result.numSeeders),
      filesize: parseInt(result.totalLength),
      serverName: '',
      startTime: 0,
      finishTime: 0,
      errorMsg: result.errorMessage,
      infoHash: result.infoHash,
      bittorrent: result.bittorrent,
      verifiedLength: result.verifiedLength,
      verifyIntegrityPending: result.verifyIntegrityPending,
    };

    // activeDlCache will be empty if its not handled from this extension
    activeDlCache = activeDlCache ? Object.assign(download_obj, activeDlCache) : download_obj;

    activeDlCache.finishTime = +new Date();
    dlHistory.unshift(activeDlCache);
    delete activeDownload[i.gid];
  }
  bslocal.set({ activeDownload, dlHistory });
}

/** @param {RPCConfig} cfg */
function connectWebsocket(cfg) {
  if (wsConn) return;

  const uri = `ws${cfg.secure ? 's' : ''}://${cfg.host}:${cfg.port}/jsonrpc`;
  wsConn = new WebSocket(uri);

  wsConn.onopen = (_) => {
    initInterval(cfg);
  };

  // for websocket when sending a message, the request should be in array
  // so that we can easily differentiate between websocket event and our response.
  wsConn.onmessage = (event) => {
    const res = JSON.parse(event.data);

    // handle response
    if (res.length) {
      onDownloadEndResponseHandler(res);
      intervalResponseHandler(res);
      return;
    }

    // handle notification
    switch (res.method) {
      case 'aria2.onDownloadStop':
      case 'aria2.onDownloadComplete':
      case 'aria2.onDownloadError':
        moveToDLHistory(cfg, res);
        onDownloadEnd(cfg);
      default:
        break;
    }
  };

  wsConn.onclose = (_) => {
    finiInterval();
    setTimeout(() => {
      resetActionIcon();
    }, 3000);
    wsConn = null;
  };
}

browser.runtime.onMessage.addListener(async (data, _) => {
  if (data.type === 'poke') {
    if (wsConn) return;
    const { RPCs } = await browser.storage.local.get(['RPCs']);
    const onlineIdx = await check_connection(RPCs);
    connectWebsocket(RPCs[onlineIdx]);
  }
});

browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd === 'toggle-intercept') {
    let { intercept } = await browser.storage.local.get('intercept');
    intercept = !intercept;
    browser.storage.local.set({ intercept }).then(() => {
      const badgeText = intercept ? 'ON' : 'OFF';
      const badgeColor = intercept ? '#a5d0e6' : '#f08e97';
      browser.action.setBadgeBackgroundColor({ color: badgeColor });
      browser.action.setBadgeText({ text: badgeText });

      if (badgeTimeoutID) clearTimeout(badgeTimeoutID);
      badgeTimeoutID = setTimeout(() => {
        browser.action.setBadgeText({ text: '' });
        badgeTimeoutID = null;
      }, 3000);
    });
  }
});
