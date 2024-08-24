<script>
  import browser from 'webextension-polyfill';
  import { getAria2OOP } from '../lib/aria2rpc';
  import { cookiesStringify } from '../lib/util';
  import { aria2WS, cfg } from './store';
  let input = '';
  let error = false;
  let success = false;
  let files;
  let ext = '';
  let dir = '';
  let dirList = [];

  browser.storage.local.get(['dirList', 'addPageLastDir']).then((res) => {
    dir = res.addPageLastDir || '';
    dirList = res.dirList || [];
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

    if (dir) cfg.options.dir = dir;

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
      const { activeDownload = {} } = await browser.storage.session.get('activeDownload');
      activeDownload[gid] = {
        gid,
        url: input,
        serverName: cfg.name,
        startTime: +new Date(),
      };
      browser.storage.session.set({ activeDownload });
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

  $: browser.storage.local.set({ addPageLastDir: dir });
</script>

<div class="container">
  {#if $aria2WS}
    <label>
      Paste URL here
      <textarea name="" id="" bind:value={input}></textarea>
    </label>
    <label>
      Or use metalink/torrent file:
      <input type="file" accept=".torrent, .metalink" bind:files multiple />
    </label>
    <label>
      Save files to:
      <input type="text" bind:value={dir} />
      <select
        class:hide={!dirList.length}
        on:change={(e) => {
          dir = e.target.value;
        }}
      >
        <option value="" disabled selected>--Quick directory selection--</option>
        {#each dirList as d}
          <option value={d}>{d}</option>
        {/each}
      </select>
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
    <div class="center">
      <h1>Not connected to any aria2 instance</h1>
      <button on:click={() => (location.hash = '#main')}>OK</button>
    </div>
  {/if}
</div>

<style>
  .container {
    margin: 3px 10px;
  }

  label {
    display: block;
  }

  textarea {
    box-sizing: border-box;
    resize: vertical;
    width: 100%;
    height: 100px;
  }

  .center {
    text-align: center;
  }

  .center button {
    margin-bottom: 20px;
  }
</style>
