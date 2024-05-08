import browser from 'webextension-polyfill';
import { getAria2Batch, getAria2JSON, getAria2OOP } from './lib/aria2rpc.js';
import { gen_checklist_icon, gen_progress_icon, resetActionIcon } from './lib/graphics.js';
import { check_connection, cookiesStringify, getDirnameBasename, resetConfig } from './lib/util.js';

const bslocal = browser.storage.local;
const dl = browser.downloads;
/** @type {WebSocket} */
let wsConn = null;
let intervalID = null;
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

  const [dirname, basename] = await getDirnameBasename(item.filename);
  if (rpcOnlineCfg.saveDir.trim()) {
    rpcOnlineCfg.options.dir = rpcOnlineCfg.saveDir;
    rpcOnlineCfg.options.out = basename;
  } else {
    rpcOnlineCfg.options.dir = dirname;
    rpcOnlineCfg.options.out = basename;
  }

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

  /** @type {DownloadItem} */
  let download_obj;
  try {
    // throw Error("dsfs");;
    const res = await aria2.addUri([item.url], rpcOnlineCfg.options);
    const resjson = await res.json();

    download_obj = {
      gid: resjson.result,
      url: item.url || '',
      icon: icon,
      dirname: rpcOnlineCfg.options.dir,
      basename: rpcOnlineCfg.options.out,
      filesize: item.fileSize,
      status: 'active',
      serverName: rpcOnlineCfg.name,
      startTime: +new Date(),
    };
    activeDownload[resjson.result] = download_obj;
  } catch (e) {
    // TODO: tell user about the error
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
  return setInterval(() => {
    wsConn.send(
      `[${aria2json.tellActive(['totalLength', 'completedLength'])},${aria2json.tellWaiting(
        0,
        1e8,
        ['totalLength', 'completedLength']
      )}]`
    );
  }, 2000);
}

function finiInterval() {
  clearInterval(intervalID);
  intervalID = null;
  wsConn = null;
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
  let statusValue = 'Unknown';
  switch (status) {
    case 'Stop':
      statusValue = 'removed';
      break;
    case 'Complete':
      holdCompleteIcon = true;
      browser.action.setIcon({ imageData: await gen_checklist_icon() });
      setTimeout(() => {
        holdCompleteIcon = false;
      }, 3000);
      statusValue = 'complete';
      break;
    case 'Error':
      statusValue = 'error';
    default:
      break;
  }

  for (const i of data.params) {
    const item = activeDownload[i.gid];
    const res = await aria2.tellStatus(i.gid, [
      'dir',
      'files',
      'completedLength',
      'totalLength',
      'errorMessage',
    ]);
    const { result } = await res.json();

    // handle probably external download or manual download
    if (!item) {
      const [dirname, basename] = await getDirnameBasename(result.files[0].path);
      const theUri = result.files[0]?.uris[0]?.uri;
      const download_obj = {
        gid: i.gid,
        url: theUri || '',
        icon: '',
        dirname: dirname || result.dir,
        basename: basename || theUri || 'Unknown filename',
        completedLength: parseInt(result?.completedLength),
        filesize: parseInt(result?.totalLength),
        status: statusValue,
        errorMsg: result.errorMessage,
      };

      dlHistory.unshift(download_obj);
      continue;
    }

    // fetch the filesize
    if (statusValue === 'complete') {
      item.filesize = parseInt(result.completedLength);
    } else if (statusValue === 'error') {
      item.errorMsg = result.errorMessage;
    }

    item.status = statusValue;
    item.finishTime = +new Date();
    dlHistory.unshift(item);
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
    intervalID = initInterval(cfg);
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
  };
}

browser.runtime.onMessage.addListener(async (data, _) => {
  if (data.type !== 'poke') return;

  const { RPCs } = await browser.storage.local.get(['RPCs']);
  const onlineIdx = await check_connection(RPCs);
  connectWebsocket(RPCs[onlineIdx]);
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
      }, 3000);
    });
  }
});
