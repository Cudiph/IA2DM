<script>
  import Collapser from '../lib/Collapser.svelte';
  import { getAria2OOP } from '../lib/aria2rpc';
  import { RPCs } from './store';

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
  <label>
    Profile Name:
    <input type="text" bind:value={rpcConfig.name} />
  </label>
  <label
    >RPC hostname/address:
    <input type="text" bind:value={rpcConfig.host} />
  </label>
  <label
    >RPC Port:
    <input type="number" min="1000" max="65530" bind:value={rpcConfig.port} />
  </label>
  <label
    >RPC Secret:
    <input type="password" bind:value={rpcConfig.secret} />
  </label>
  <label>
    <input type="checkbox" bind:checked={rpcConfig.secure} />
    Secure
  </label>

  <span>Quick Options</span>
  <label
    >Save files to:
    <input type="text" bind:value={saveDir} on:input={handleSaveTo} />
  </label>

  <label>
    <input type="checkbox" bind:checked={useUserAgent} on:click={handleUseUserAgent} />
    Use browser user agent
  </label>

  <span>Aria2 Options Table:</span>
  <table>
    <tr>
      <th>Key</th>
      <th>Value</th>
      <th></th>
    </tr>
    {#each optionKey as k, i}
      <tr>
        <td><input type="text" bind:value={k} /></td>
        <td><input type="text" bind:value={optionValue[i]} /></td>
        <td><button on:click={() => removeByIndex(i)} class="delete-button">x</button></td>
      </tr>
    {/each}
    <button on:click={addNewOption}>+</button>
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
  label {
    display: block;
    margin: 10px;
  }

  button,
  p {
    margin: 10px;
  }

  .delete-button {
    padding: 0 10px;
    margin: 0;
  }

  .message p {
    padding: 10px;
    border-radius: 10px;
  }
</style>
