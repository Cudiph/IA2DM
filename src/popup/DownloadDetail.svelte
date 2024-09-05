<script>
  import { selectedItem } from './store';
  import { getIntegrationPass, integrationWS } from '../lib/store';
  import { getDefaultIcon } from '../lib/graphics';
  import {
    bestBytesString,
    bestTimeString,
    capitalize,
    wsRpcFetch,
    getDirnameBasename,
  } from '../lib/util';
  import { Aria2Tray } from '../lib/aria2tray';
  import { onDestroy } from 'svelte';

  const a2t = new Aria2Tray(getIntegrationPass());

  let fileState = {
    exist: false,
  };

  let folderState = {
    exist: false,
  };

  async function deleteFile() {
    const fullPath = `${$selectedItem.dirname}/${$selectedItem.basename}`;
    const res = await wsRpcFetch($integrationWS, a2t.delete('id_c', fullPath));
    if (res.result === 'OK') fileState.exist = false;
  }

  function openFolder() {
    $integrationWS.send(a2t.open('id_c', $selectedItem.dirname));
  }

  function openFile() {
    if ($selectedItem.basename.endsWith('.exe')) {
      if (!confirm('You are about to open an EXECUTABLE FILE, proceed?')) return;
    }
    const fullPath = `${$selectedItem.dirname}/${$selectedItem.basename}`;
    $integrationWS.send(a2t.open('id_c', fullPath));
  }

  async function initInfo() {
    if (!$integrationWS) return;

    const folder = await wsRpcFetch($integrationWS, a2t.status('id_c', $selectedItem.dirname));
    const fullPath = `${$selectedItem.dirname}/${$selectedItem.basename}`;
    const file = await wsRpcFetch($integrationWS, a2t.status('id_c', fullPath));
    fileState.exist = file.result?.exist;
    folderState.exist = folder.result?.exist;
  }

  const iWSunsub = integrationWS.subscribe((val) => {
    if (!val) return;
    initInfo();
  });

  initInfo();
  onDestroy(iWSunsub);
</script>

<div class="container">
  <div class="headline">
    <img src={$selectedItem.icon || getDefaultIcon()} alt="icon" />
    <span class="basename">{$selectedItem.basename}</span>
  </div>

  <span><b>Upload:</b> {bestBytesString($selectedItem.uploadSpeed)}/s</span>
  <span><b>Download:</b> {bestBytesString($selectedItem.dlSpeed)}/s</span>
  <span class:hide={!$selectedItem.connections}
    ><b>Connections:</b> {$selectedItem.connections}</span
  >
  <span class:hide={!$selectedItem.seeder}><b>Seeders:</b> {$selectedItem.numSeeders}</span>

  <table>
    <tr>
      <th>Key</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>GID</td>
      <td>{$selectedItem.gid}</td>
    </tr>
    <tr class:hide={!$selectedItem.url}>
      <td>URL</td>
      <td><a href={$selectedItem.url}>{$selectedItem.url}</a></td>
    </tr>
    <tr>
      <td>File location</td>
      <td>
        {$selectedItem.dirname ? `${$selectedItem.dirname}/` : ''}{$selectedItem.basename}
        <div class:hide={!$integrationWS}>
          <button class="file-action" class:hide={!fileState.exist} on:click={openFile}
            >Open File</button
          >
          <button class="file-action" class:hide={!folderState.exist} on:click={openFolder}
            >Open Folder</button
          >
          <button class="file-action" class:hide={!fileState.exist} on:click={deleteFile}
            >Delete File</button
          >
        </div>
      </td>
    </tr>
    <tr style="color: var(--color-{$selectedItem.seeder ? 'complete' : $selectedItem.status})">
      <td>Status</td>
      <td>
        {$selectedItem.seeder ? 'Seeding' : capitalize($selectedItem.status)}
        <span class:hide={!$integrationWS || fileState.exist} style="color: var(--color-removed)"
          >(deleted or moved)</span
        >
      </td>
    </tr>
    <tr class:hide={!$selectedItem.completedLength}>
      <td>Downloaded</td>
      <td
        >{bestBytesString($selectedItem.completedLength)} ({(
          ($selectedItem.completedLength / $selectedItem.filesize) *
          100
        ).toFixed(1)}%)</td
      >
    </tr>
    <tr class:hide={!$selectedItem.uploadLength}>
      <td>Uploaded</td>
      <td
        >{bestBytesString($selectedItem.uploadLength)} ({parseFloat(
          ($selectedItem.uploadLength / $selectedItem.completedLength).toFixed(2)
        )}:1)</td
      >
    </tr>
    <tr>
      <td>Total Filesize</td>
      <td>{bestBytesString($selectedItem.filesize)}</td>
    </tr>
    <tr>
      <td>Config used</td>
      <td>{$selectedItem.serverName || '[EXTERNAL]'}</td>
    </tr>
    <tr class:hide={!$selectedItem.infoHash}>
      <td>Info hash</td>
      <td>{$selectedItem.infoHash}</td>
    </tr>
    <tr class:hide={!$selectedItem.startTime}>
      <td>Time started</td>
      <td>{new Date($selectedItem.startTime).toLocaleString()}</td>
    </tr>
    <tr class:hide={!$selectedItem.finishTime}>
      <td>Time finished</td>
      <td>{new Date($selectedItem.finishTime).toLocaleString()}</td>
    </tr>
    {#if $selectedItem.startTime && $selectedItem.finishTime}
      {@const durationInSeconds = ($selectedItem.finishTime - $selectedItem.startTime) / 1000}
      <tr>
        <td>Duration</td>
        <td>{bestTimeString(durationInSeconds)}</td>
      </tr>
      <tr class:hide={!$selectedItem.filesize}>
        <td>Avg. speed</td>
        <td>{bestBytesString($selectedItem.filesize / durationInSeconds)}/s</td>
      </tr>
    {/if}
    <tr class:hide={!$selectedItem.errorMsg} style="color: var(--color-error)">
      <td>Error Message</td>
      <td>{$selectedItem.errorMsg}</td>
    </tr>
  </table>

  <button on:click={() => (location.hash = '#main')}>Done</button>
</div>

<style>
  table {
    overflow: hidden;
    border-collapse: collapse;
    box-sizing: border-box;
    width: 100%;
  }

  td {
    overflow-wrap: anywhere;
    padding: 5px;
    border-top: solid 1px var(--fg-color);
    font-size: 16px;
  }

  td:first-child {
    white-space: nowrap;
  }

  .container {
    display: block;
    margin: 10px;
  }

  .headline {
    display: flex;
    align-items: center;
    margin: 10px 0;
  }

  .basename {
    font-size: 20px;
    margin: 0 20px;
  }

  th {
    background-color: var(--bg-color-hover);
  }

  .file-action {
    padding: 7px 10px;
  }
</style>
