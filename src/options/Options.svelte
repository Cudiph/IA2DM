<script>
  import browser from 'webextension-polyfill';
  import ServerProp from './ServerProp.svelte';
  import Toggle from '../lib/Toggle.svelte';
  import DirList from './DirList.svelte';
  import { RPCs } from './store';
  import './shared.css';
  import { resetConfig } from '../lib/util';

  let has_required_optional_perms = true;
  let has_all_perms = false;
  let intercept = false;
  let sendCookies = false;
  let sendReferer = false;
  let progressColor = '';
  let progressOutlineColor = '';
  let timer = null;
  let errorMsg = '';
  /** @type {HTMLDivElement} */
  let saveMsgElem = null;

  const min_perm_query = {
    origins: ['*://localhost/*', '*://127.0.0.1/*'],
  };
  const all_query = {
    origins: ['<all_urls>'],
  };

  function check_perm() {
    browser.permissions
      .contains(min_perm_query)
      .then((res) => (has_required_optional_perms = res))
      .catch();
    browser.permissions
      .contains(all_query)
      .then((res) => (has_all_perms = res))
      .catch();
  }
  check_perm();

  function checkAllPerm(e) {
    request_allperms();
    if (!has_all_perms) e.preventDefault();
  }

  browser.permissions.onAdded.addListener(check_perm);
  browser.permissions.onRemoved.addListener(check_perm);

  function request_allperms() {
    return browser.permissions.request(all_query);
  }

  function request_localhost() {
    return browser.permissions.request(min_perm_query);
  }

  browser.storage.local.get(null).then(
    /** @param {aria2Storage} res */
    (res) => {
      $RPCs = res.RPCs;
      sendCookies = res.sendCookies;
      sendReferer = res.sendReferer;
      intercept = res.intercept;
      progressColor = res.progressColor;
      progressOutlineColor = res.progressOutlineColor;
    }
  );

  async function addServer() {
    $RPCs.push({
      name: 'Unconfigured Server',
      host: 'localhost',
      port: 6800,
      secret: '',
      secure: false,
      options: {},
    });
    $RPCs = [...$RPCs];
  }

  async function saveConfiguration() {
    const trimList = ['name', 'host'];
    for (let i = 0; i < $RPCs.length; i++) {
      for (const key of trimList) {
        $RPCs[i][key] = $RPCs[i][key].trim();
      }
    }

    try {
      await browser.storage.local.set({
        intercept,
        sendCookies,
        sendReferer,
        RPCs: $RPCs,
        progressColor,
        progressOutlineColor,
      });
      saveMsgElem.firstChild.classList.remove('hide');
    } catch (e) {
      errorMsg = e;
      saveMsgElem.lastChild.classList.remove('hide');
    }

    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      for (const elem of saveMsgElem.children) {
        elem.classList.add('hide');
      }
      timer = null;
    }, 4000);
  }

  function reset() {
    if (confirm('This will reset all configuration and deleting all download history. Proceed?')) {
      resetConfig();
      window.location.reload();
    }
  }

  $: {
    progressColor = progressColor.trim();
    progressOutlineColor = progressOutlineColor.trim();
  }

  const TITLE_COOKIES =
    'Send website cookies to download server in case server has authorization such as login/captcha/cookie tracker.';
  const TITLE_REFERER = 'Send referer header to download server. (disable if it make things worse)';
  const TITLE_INTERCEPT_DOWNLOAD =
    'Forward download made from built in browser download manager to aria2';
  const TITLE_PROGRESS_COLOR = 'Set progress color in CSS color format';
  const TITLE_OUTLINE_COLOR = 'Set outline color in CSS color format';
  const TITLE_RESET =
    'Reset all data stored in the storage in case the UI accessing undefined property';
</script>

<main>
  {#if !has_required_optional_perms}
    <div class="yapping">
      <h1 class="center">Additional Permission Required!</h1>
      <p class="center">
        <b>TL;DR</b>: This extension require "Access your data for all websites".
      </p>
      <p>
        With manifest v3 being introduced, some part has been changed including host permission for
        security reason. Now, host permission require your consent for the permission to be granted
        while in mv2 host permission is granted when user add the extension to the browser. This is
        a better approach in my opinion so users know what extension can do.
      </p>
      <h2>Why this extension need to access all websites data?</h2>
      <p>
        Some downloads need cookies for it to works because the server has additional authorization
        such as downloading from private google drive/mega file or captcha cookie. And for the
        extension to access the cookies, it needs that permission.
      </p>
      <h2>I'm not convinced enough.</h2>
      <p>
        Good, you shouldn't trust my words and trust the code instead as a part of transparency.
        This is an open source project, the source code is publicly available for you to see,
        verify, modify or distribute. Source code can be accessed at
        <a href="https://github.com/cudiph/IA2DM">github here</a>.
      </p>
      <h2>
        Are there any other way to make the extension works without accessing all website data?
      </h2>
      <p>
        Of course! And yes <b>the TLDR is a lie</b> and one reason to not trust anyone lol. Anyway you
        can allow data for only localhost (or 127.0.0.1) so the extension can interact with local aria2
        rpc (remote instance still need all data permission) but with limitation that you can only download
        file that publicly available without login or without any kind of authorization barrier.
      </p>

      <div class="center">
        <button on:click={request_allperms}>Allow access data for all website</button>
        <button on:click={request_localhost}>Allow access data for localhost only</button>
      </div>
    </div>
  {:else}
    <h1 class="center">Integrated Aria2 Options</h1>
    <pre>Tips: Hover over the option name for more information</pre>
    {#each $RPCs as cfg, i}
      <div class="server-cfg-container">
        <ServerProp rpcConfig={cfg} index={i} />
      </div>
    {/each}
    <button on:click={addServer}>Add new Server</button>

    <h2>Global</h2>

    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label title={TITLE_COOKIES}>
      <span>Send Cookies</span>
      <Toggle bind:booleanInput={sendCookies} on:click={checkAllPerm} />
    </label>
    {#if sendCookies}
      <div class="message">
        <p class="warning">
          Cookies is very sensitive data, using at least self-signed SSL/TLS certificate and enable
          secure option is highly reccomended <a href="https://github.com/Cudiph/IA2DM#guides"
            >See the guides</a
          >. If you're sure that your RPC traffic is not being monitored or your aria2 is hosted
          locally you can ignore this warning.
        </p>
      </div>
    {/if}

    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label title={TITLE_REFERER}>
      <span>Send Referer</span>
      <Toggle bind:booleanInput={sendReferer} on:click={checkAllPerm} />
    </label>

    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label title={TITLE_INTERCEPT_DOWNLOAD}>
      <span>Intercept Download</span>
      <Toggle bind:booleanInput={intercept} />
    </label>

    <label title={TITLE_PROGRESS_COLOR}>
      <span>Progress Color</span>
      <input type="text" bind:value={progressColor} />
    </label>

    <label title={TITLE_OUTLINE_COLOR}>
      <span>Progress Outline Color</span>
      <input type="text" bind:value={progressOutlineColor} />
    </label>

    <div bind:this={saveMsgElem} class="message">
      <p class="hide success">Configuration saved successfully</p>
      <p class="hide failed">Failed to save configuration. Reason:<br /> `{errorMsg}`</p>
    </div>
    <button on:click={saveConfiguration}>Save Configuration</button>
    <button on:click={reset} title={TITLE_RESET}>Reset Storage</button>

    <DirList />
  {/if}
</main>

<style>
  main {
    min-width: 800px;
    max-width: 800px;
  }

  .yapping > p {
    text-indent: 30px;
  }

  .center {
    text-align: center;
  }

  button {
    margin: 20px 3em;
  }

  .server-cfg-container {
    padding: 5px;
    border: solid 1px var(--fg-color);
    margin: 10px;
  }

  .message p {
    padding: 10px;
    border-radius: 10px;
  }
</style>
