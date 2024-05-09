<script>
  import browser from 'webextension-polyfill';
  import { getAria2OOP } from '../lib/aria2rpc';
  import { cookiesStringify } from '../lib/util';
  import { page, getWSConn, cfg } from './store';
  let input = '';
  let anyConnection = null;
  let error = false;
  let success = false;

  getWSConn().then((res) => {
    anyConnection = res;
  });

  async function addNewDownloadHandler() {
    const aria2 = getAria2OOP(cfg);
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
      // TODO: Add to active download list
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
        $page = 'main';
      }, 1000);
    } catch (e) {
      error = e;
    }
  }
</script>

<div class="container">
  {#if anyConnection}
    <label>
      Paste URL here
      <textarea name="" id="" bind:value={input}></textarea>
    </label>
    <div class="msg">
      {#if success}
        <p>Success added download</p>
      {:else if error}
        <p>Download failed, reason: {error}</p>
      {/if}
    </div>
    <button on:click={addNewDownloadHandler}>Add</button>
    <button on:click={(_) => ($page = 'main')}>cancel</button>
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
