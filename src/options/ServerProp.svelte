<script>
  import Collapser from '../lib/Collapser.svelte';
  import Toggle from '../lib/Toggle.svelte';
  import { getAria2OOP } from '../lib/aria2rpc';
  import { RPCs } from './store';
  import './shared.css';
  import { getIntegrationPass, integrationVersion, integrationWS } from '../lib/store';
  import { Aria2Tray } from '../lib/aria2tray';
  import { semverCmp, wsRpcFetch } from '../lib/util';

  /** @type {RPCConfig} */
  export let rpcConfig;
  export let index = 0;
  let useUserAgent = rpcConfig.options['user-agent'] || false;
  let quickTableForTextInput = {
    dir: rpcConfig.options.dir || '',
    'max-download-limit': rpcConfig.options['max-download-limit'] || '',
  };

  let timeoutID = null;
  let test = '';
  let version = '';
  let optionKey = Object.keys(rpcConfig.options);
  let optionValue = [];
  for (const k of optionKey) {
    optionValue.push(rpcConfig.options[k]);
  }

  // process the table
  $: {
    // set at least one row when nothing in the options
    if (!optionKey.length) {
      optionKey = [''];
      optionValue = [''];
    }

    // commit changes
    rpcConfig.options = {};
    for (let i = 0; i < optionKey.length; i++) {
      const key = optionKey[i];
      const val = optionValue[i];
      if (!key || !val) continue;
      rpcConfig.options[key] = val;
    }
  }

  function handleUseUserAgent() {
    if (!useUserAgent) {
      tableAssign('user-agent', navigator.userAgent);
    } else {
      tableRemove('user-agent');
    }
    useUserAgent = !useUserAgent;
  }

  /** @param {string} key */
  function handleInputQuickOptions(key) {
    if (!quickTableForTextInput[key]) {
      tableRemove(key);
    }
    tableAssign(key, quickTableForTextInput[key]);
  }

  function deleteConfig() {
    $RPCs.splice(index, 1);
    $RPCs = [...$RPCs];
  }

  async function testConnection() {
    const aria2 = getAria2OOP(rpcConfig);
    try {
      const res = await aria2.getVersion();
      const resjson = await res.json();
      if (resjson.error) {
        throw new Error(resjson.error.message);
      }
      version = resjson.result.version;
      test = 'success';
    } catch (e) {
      test = e;
    }
    if (timeoutID) clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      test = '';
      timeoutID = null;
    }, 3000);
  }

  // option table operation
  function addNewOption() {
    optionKey = [...optionKey, ''];
    optionValue = [...optionValue, ''];
  }

  /** @param {number} idx */
  function removeByIndex(idx) {
    optionKey.splice(idx, 1);
    optionValue.splice(idx, 1);
    refreshOptionTable();
  }

  function refreshOptionTable() {
    optionKey = [...optionKey];
    optionValue = [...optionValue];
  }

  /**
   * @param {any} key
   * @param {any} value
   */
  function tableAssign(key, value) {
    if (optionKey.length && !optionKey[0] && !optionValue[0]) {
      optionKey = [];
      optionValue = [];
    }
    for (let i = 0; i < optionKey.length; i++) {
      const k = optionKey[i];
      if (k === key) {
        optionValue[i] = value;
        refreshOptionTable();
        return;
      }
    }

    optionKey.push(key);
    optionValue.push(value);
    refreshOptionTable();
  }

  /**
   * @param {any} key
   */
  function tableRemove(key) {
    for (let i = 0; i < optionKey.length; i++) {
      const k = optionKey[i];
      if (k === key) {
        optionKey.splice(i, 1);
        optionValue.splice(i, 1);
        refreshOptionTable();
        return;
      }
    }
  }

  async function chooseFolder() {
    const a2t = new Aria2Tray(getIntegrationPass());
    const res = await wsRpcFetch($integrationWS, a2t.filePicker('id_c', 'folder'), 1e10);

    if (!res.result?.selected) return;
    quickTableForTextInput.dir = res.result.selected;
    handleInputQuickOptions('dir');
  }

  const TITLE_HOSTNAME = 'Value can hostname/IP Address/Domain name';
  const TITLE_PORT = 'Port where aria2 is listening in range 1024-65535';
  const TITLE_SECRET = 'RPC authorization secret token (keep empty if not set)';
  const TITLE_SECURE = 'Connect to RPC using SSL/TLS (To setup self-signed certificate see README)';
  const TITLE_SAVES_FILES_TO = 'Directory to save downloaded files';
  const TITLE_USE_BROWSER_AGENT =
    "Send this browser's user agent to download server instead of aria2 default";
  const TITLE_MAX_DLSPEED = '(1K = 1024, 1M = 1024K) "0" means unrestricted';
</script>

<Collapser title={rpcConfig.name + ` #${index + 1}`} hide={!index ? false : true}>
  <label>
    <span>Profile Name</span>
    <input type="text" bind:value={rpcConfig.name} />
  </label>

  <span class="subheader">Connection</span>
  <hr />
  <label title={TITLE_HOSTNAME}>
    <span>RPC hostname/address</span>
    <input type="text" bind:value={rpcConfig.host} />
  </label>
  <label title={TITLE_PORT}>
    <span>RPC Port</span>
    <input type="number" min="1000" max="65530" bind:value={rpcConfig.port} />
  </label>
  <label title={TITLE_SECRET}>
    <span>RPC Secret</span>
    <input type="password" bind:value={rpcConfig.secret} />
  </label>

  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label title={TITLE_SECURE}>
    <span>Secure</span>
    <Toggle bind:booleanInput={rpcConfig.secure} />
  </label>

  <span class="subheader">Quick Options</span>
  <hr />
  <label class="relative" title={TITLE_SAVES_FILES_TO}>
    <span>Save files to</span>
    {#if $integrationWS && semverCmp('0.2.0', $integrationVersion) >= 0}
      <button class="inline-button" on:click={chooseFolder}>Browse...</button>
    {/if}
    <input
      type="text"
      bind:value={quickTableForTextInput.dir}
      on:input={(_) => handleInputQuickOptions('dir')}
    />
  </label>

  <label title={TITLE_MAX_DLSPEED}>
    <span>Max download speed</span>
    <input
      type="text"
      bind:value={quickTableForTextInput['max-download-limit']}
      on:input={(_) => handleInputQuickOptions('max-download-limit')}
    />
  </label>

  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label title={TITLE_USE_BROWSER_AGENT}>
    <span>Use browser user agent</span>
    <Toggle bind:booleanInput={useUserAgent} on:click={handleUseUserAgent} />
  </label>

  <span class="subheader">Aria2 Options Table</span>
  <hr />
  <table>
    <thead>
      <tr>
        <th>Key</th>
        <th>Value</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each optionKey as k, i}
        <tr>
          <td class="key"><input type="text" bind:value={k} /></td>
          <td><input type="text" bind:value={optionValue[i]} /></td>
          <td style="width: 5%;"
            ><button on:click={() => removeByIndex(i)} class="tbl-button">⨉</button></td
          >
        </tr>
      {/each}
      <tr>
        <td></td>
        <td></td>
        <td>
          <button on:click={addNewOption} class="tbl-button">＋</button>
        </td>
      </tr>
    </tbody>
    <caption
      ><a href="https://aria2.github.io/manual/en/html/aria2c.html#id2">Full options list</a
      ></caption
    >
  </table>

  <button on:click={testConnection}>Test Connection</button>
  {#if $RPCs.length > 1}
    <button on:click={deleteConfig}>Delete</button>
  {/if}

  <div class="message">
    {#if test === 'success'}
      <p class="success">Connection Successful, Using Aria version {version}</p>
    {:else if test !== ''}
      <p class="failed">Connection Failed {test}</p>
    {/if}
  </div>
</Collapser>

<style>
  button,
  p {
    margin: 10px;
  }

  .tbl-button {
    padding: 5px 11px;
    margin: 0;
    font-size: 15px;
  }

  .message p {
    padding: 10px;
    border-radius: 10px;
  }

  .subheader {
    font-weight: 600;
    font-size: 18px;
  }

  hr {
    color: #888;
  }

  table {
    width: 100%;
  }

  td input {
    box-sizing: border-box;
    width: 100%;
  }

  .key {
    width: 30%;
  }

  caption {
    caption-side: bottom;
  }

  label {
    align-items: center;
  }

  .inline-button {
    margin: 0;
    padding: 6px;
    position: absolute;
    left: 102%;
  }
</style>
