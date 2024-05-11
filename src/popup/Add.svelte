<script>
  import browser from 'webextension-polyfill';
  import { getAria2OOP } from '../lib/aria2rpc';
  import { cookiesStringify } from '../lib/util';
  import { getWSConn, cfg } from './store';
  let input = '';
  let anyConnection = null;
  let error = false;
  let success = false;
  let files;
  let ext = '';

  getWSConn().then((res) => {
    anyConnection = res;
  });

  /**
   * @param {File} file
   */
  async function readFile(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async function addNewDownloadHandler() {
    const aria2 = getAria2OOP(cfg);

    if (files?.length) {
      try {
        for (const file of files) {
          const content = (await readFile(file)).split(';base64,').pop();
          const ext = getExtension(file.name);
          if (ext === 'torrent') {
            await aria2.addTorrent(content, [], cfg.options);
          } else if (ext === 'metalink') {
            await aria2.addMetalink(content, cfg.options);
          }
        }
        success = true;
        setTimeout(() => {
          location.hash = '#main';
        }, 1000);
      } catch (e) {
        error = e;
      }

      return;
    }

    const { sendCookies } = await browser.storage.local.get(['sendCookies']);

    if (sendCookies) {
      const cookies = await browser.cookies.getAll({
        url: input,
      });
      if (cookies.length) {
        if (!cfg.options.header) cfg.options.header = [];
        const cookiesHeader = `Cookie: ${cookiesStringify(cookies)}`;
        cfg.options.header.push(cookiesHeader);
      }
    }

    try {
      await browser.runtime.sendMessage({ type: 'poke' });
      const res = await aria2.addUri([input], cfg.options);
      const resjson = await res.json();
      if (!res.ok) {
        throw new Error(resjson.error.message);
      }
      success = true;
      const gid = resjson.result;
      const { activeDownload } = await browser.storage.local.get('activeDownload');
      activeDownload[gid] = {
        gid,
        url: input,
        serverName: cfg.name,
        startTime: +new Date(),
      };
      browser.storage.local.set({ activeDownload });
      setTimeout(() => {
        location.hash = '#main';
      }, 1000);
    } catch (e) {
      error = e;
    }
  }

  /** @param {string} name */
  function getExtension(name) {
    return name.split('.').pop();
  }

  $: if (files?.length > 1) {
    ext = 'Files';
  } else if (files?.length) {
    ext = getExtension(files[0].name);
  }
</script>

<div class="container">
  {#if anyConnection}
    <label>
      Paste URL here
      <textarea name="" id="" bind:value={input}></textarea>
    </label>
    <label>
      Or use metalink/torrent file:
      <input type="file" accept=".torrent, .metalink" bind:files multiple />
    </label>
    <div class="msg">
      {#if success}
        <p>Success added download</p>
      {:else if error}
        <p>Download failed, reason: {error}</p>
      {/if}
    </div>
    <button on:click={addNewDownloadHandler}>Add {ext}</button>
    <button on:click={(_) => (location.hash = '#main')}>cancel</button>
  {:else}
    <h1>Not connected to any aria2 instance</h1>
  {/if}
</div>

<style>
  .container {
    margin: 3px 10px;
  }

  textarea {
    box-sizing: border-box;
    resize: vertical;
    width: 100%;
    height: 100px;
  }
</style>
