<script>
  import Header from './Header.svelte';
  import DownloadItem from './DownloadItem.svelte';
  import Add from './Add.svelte';
  import browser from 'webextension-polyfill';
  import { getWSConn, page, cfg, selectedItem } from './store';
  import { getAria2JSON } from '../lib/aria2rpc';
  import { getDirnameBasename, getFolderName } from '../lib/util';
  import DownloadDetail from './DownloadDetail.svelte';

  let intervalID = null;
  let ws = null;

  let activeDownloadList = [];
  let dlHistory = [];
  let lastError = '';
  browser.storage.local.get(['dlHistory', 'lastError']).then((res) => {
    dlHistory = res.dlHistory;
    lastError = res.lastError;
  });

  let has_required_optional_perms = true;
  let min_perm_query = {
    origins: ['*://localhost/*', '*://127.0.0.1/*'],
  };

  function check_perm() {
    browser.permissions
      .contains(min_perm_query)
      .then((res) => {
        has_required_optional_perms = res;
        if (!res) browser.runtime.openOptionsPage();
      })
      .catch();
  }
  check_perm();

  browser.permissions.onAdded.addListener(check_perm);
  browser.permissions.onRemoved.addListener(check_perm);

  browser.storage.onChanged.addListener((changes, area) => {
    if (!changes.dlHistory) return;

    dlHistory = changes.dlHistory.newValue;
  });

  function initIntervalPolling() {
    const aria2json = getAria2JSON(cfg, { id: 'popupIntervalPolling' });
    const handler = () => {
      ws.send(`[${aria2json.tellActive()}, ${aria2json.tellWaiting(0, 9999)}]`);
    };
    handler();
    intervalID = setInterval(handler, 1000);
  }

  function finiIntervalPolling() {
    clearInterval(intervalID);
    intervalID = null;
    ws = null;
  }

  /**
   * @param {jsonRPCResponse[]} data
   */
  async function handleIntervalPollingResponse(data) {
    if (data[0].id !== 'popupIntervalPolling') return;
    let newActiveDownloads = [];

    const { activeDownload = {} } = await browser.storage.session.get('activeDownload');
    for (const res of data) {
      for (const item of res.result) {
        const folderName = getFolderName(item.dir, item.files[0].path);
        let dirname, basename;
        if (folderName && item.dir && !item.files[0]?.path?.startsWith('./')) {
          dirname = item.dir;
          basename = folderName;
        } else {
          [dirname, basename] = getDirnameBasename(item.files[0].path);
        }
        const theUri = item.files[0]?.uris[0]?.uri;
        const saved = activeDownload[item.gid];
        const downloadItemStruct = {
          gid: item.gid,
          icon: saved?.icon || '',
          dirname,
          basename: basename || theUri || 'Unknown filename',
          status: item.status,
          url: saved?.url || theUri || '',
          seeder: item.seeder === 'true' ? true : false,
          uploadSpeed: parseInt(item.uploadSpeed),
          dlSpeed: parseInt(item.downloadSpeed),
          connections: parseInt(item.connections),
          completedLength: parseInt(item.completedLength),
          uploadLength: parseInt(item.uploadLength),
          pieceLength: parseInt(item.pieceLength),
          numPieces: parseInt(item.numPieces),
          numSeeders: parseInt(item.numSeeders),
          filesize: parseInt(item.totalLength),
          serverName: saved?.serverName || '',
          startTime: saved?.startTime || 0,
          finishTime: 0,
          errorMsg: item.errorMessage,
          infoHash: item.infoHash,
          bittorrent: item.bittorrent,
          verifiedLength: item.verifiedLength,
          verifyIntegrityPending: item.verifyIntegrityPending,
        };

        // reactive detail
        if (item.gid === $selectedItem?.gid) {
          $selectedItem = downloadItemStruct;
        }

        newActiveDownloads.push(downloadItemStruct);
      }
    }

    if (newActiveDownloads.length) {
      browser.runtime.sendMessage({ type: 'poke' });
    }

    activeDownloadList = [...newActiveDownloads];
  }

  function tryReconnect() {
    setTimeout(() => {
      initWebSocket();
    }, 3000);
  }

  // begin
  async function initWebSocket() {
    ws = await getWSConn();
    if (!ws) {
      tryReconnect();
      return;
    }

    ws.addEventListener('open', (_) => {
      initIntervalPolling();
    });

    ws.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);

      if (data.length) {
        handleIntervalPollingResponse(data);
      }
    });

    ws.addEventListener('close', (_) => {
      finiIntervalPolling();
      tryReconnect();
    });
  }

  function clearError() {
    browser.storage.local.set({ lastError: '' });
    lastError = '';
  }

  initWebSocket();
</script>

<div class="root-container">
  {#if lastError}
    <div class="notif message">
      <p class="failed">
        There was an error. <b>{lastError}</b><br />
        Download has been returned to browser if possible.
      </p>
      <button on:click={clearError}>OK</button>
    </div>
  {:else if $page === '#add'}
    <Add />
  {:else if $page === '#item-detail'}
    <DownloadDetail />
  {:else}
    <Header {ws} />
    <main>
      {#if !has_required_optional_perms}
        <h2>Additional Permission Required.</h2>
      {:else}
        {#each activeDownloadList as item}
          <div class="item">
            <DownloadItem {item} />
          </div>
        {/each}
        {#each dlHistory as item}
          <div class="item">
            <DownloadItem {item} />
          </div>
        {/each}
        {#if !activeDownloadList.length && !dlHistory.length}
          <div class="notif">
            <p>Nobody here but us chickens!</p>
          </div>
        {/if}
      {/if}
    </main>
  {/if}
</div>

<style>
  .root-container {
    max-width: 600px;
    min-width: 600px;
    overflow-x: hidden;
  }

  @media screen and (min-width: 601px) {
    .root-container {
      max-width: 1000px;
    }
  }

  @media screen and (max-height: 375px) {
    .root-container {
      max-height: 375px;
    }
  }

  .item {
    margin: 5px;
  }

  main {
    margin: 5px 0;
  }

  .notif {
    text-align: center;
  }

  .message p {
    padding: 10px;
    border-radius: 10px;
  }
</style>
