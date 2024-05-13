<script>
  import Collapser from '../lib/Collapser.svelte';
  import Toggle from '../lib/Toggle.svelte';
  import { getAria2OOP } from '../lib/aria2rpc';
  import { RPCs } from './store';
  import './shared.css';

  /** @type {RPCConfig} */
  export let rpcConfig;
  export let index = 0;
  let useUserAgent = rpcConfig.options['user-agent'] || false;
  let saveDir = rpcConfig.options.dir || '';

  let timeoutID = null;
  let test = '';
  let version = '';
  let optionKey = Object.keys(rpcConfig.options);
  let optionValue = [];
  for (const k of optionKey) {
    optionValue.push(rpcConfig.options[k]);
  }

  $: {
    if (!optionKey.length) {
      optionKey = [''];
      optionValue = [''];
    }
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

  function handleSaveTo() {
    if (!saveDir) {
      tableRemove('dir');
      return;
    }
    tableAssign('dir', saveDir);
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
</script>

<Collapser title={rpcConfig.name + ` #${index + 1}`} hide={!index ? false : true}>
  <label title="sdfsdf">
    <span>Profile Name</span>
    <input type="text" bind:value={rpcConfig.name} />
  </label>

  <span class="subheader">Connection</span>
  <hr />
  <label>
    <span>RPC hostname/address</span>
    <input type="text" bind:value={rpcConfig.host} />
  </label>
  <label>
    <span>RPC Port</span>
    <input type="number" min="1000" max="65530" bind:value={rpcConfig.port} />
  </label>
  <label>
    <span>RPC Secret</span>
    <input type="password" bind:value={rpcConfig.secret} />
  </label>

  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label>
    <span>Secure</span>
    <Toggle bind:booleanInput={rpcConfig.secure} />
  </label>

  <span class="subheader">Quick Options</span>
  <hr />
  <label>
    <span>Save files to</span>
    <input type="text" bind:value={saveDir} on:input={handleSaveTo} />
  </label>

  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label>
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
</style>
