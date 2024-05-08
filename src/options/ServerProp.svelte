<script>
  import Collapser from '../lib/Collapser.svelte';
  import { getAria2OOP } from '../lib/aria2rpc';
  import { RPCs } from './store';

  /** @type {RPCConfig} */
  export let rpcConfig;
  export let index = 0;

  let test = '';
  let version = '';

  let yaml_option = '';

  for (const key in rpcConfig.options) {
    yaml_option += `${key}: ${rpcConfig.options[key]}\n`;
  }

  $: {
    const lines = yaml_option.split('\n');
    const as_obj = {};
    for (const line of lines) {
      let [key, ...val] = line.split(':');
      key = key.trim();
      const theRest = val.join(':').trim();
      if (!key?.trim() || !theRest?.trim()) continue;
      as_obj[key] = theRest;
    }

    // LSP need to chill
    rpcConfig.options = as_obj;
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
      version = resjson.result.version;
      test = 'success';
    } catch (e) {
      test = 'fail';
    }
    setTimeout(() => {
      test = '';
    }, 4000);
  }
</script>

<!-- TODO: make sure the required fields are not empty -->
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
  <label
    >Save files to:
    <input type="text" bind:value={rpcConfig.saveDir} />
  </label>
  <label>
    <input type="checkbox" bind:checked={rpcConfig.secure} />
    Secure
  </label>

  <!-- TODO: custom options need to handled better -->
  <label>
    Aria2 Options:
    <textarea bind:value={yaml_option}></textarea>
  </label>

  <button on:click={testConnection}>Test Connection</button>
  {#if $RPCs.length > 1}
    <button on:click={deleteConfig}>Delete</button>
  {/if}

  <div class="message">
    {#if test === 'success'}
      <p class="success">Connection Successful, Using Aria version {version}</p>
    {:else if test === 'fail'}
      <p class="failed">Connection Failed</p>
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

  .message p {
    padding: 10px;
    border-radius: 10px;
  }
</style>
