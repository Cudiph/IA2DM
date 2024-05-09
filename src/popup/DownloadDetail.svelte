<script>
  import { page, selectedItem } from './store';
  import { getDefaultIcon } from '../lib/graphics';
  import { bestTimeString } from '../lib/util';
</script>

<div class="container">
  <div class="headline">
    <img src={$selectedItem.icon || getDefaultIcon()} alt="icon" />
    <span class="basename">{$selectedItem.basename}</span>
  </div>

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
      <td>{$selectedItem.dirname ? `${$selectedItem.dirname}/` : ''}{$selectedItem.basename}</td>
    </tr>
    <tr style="color: var(--color-{$selectedItem.status})">
      <td>Status</td>
      <td>{$selectedItem.status}</td>
    </tr>
    <tr>
      <td>Config used</td>
      <td>{$selectedItem.serverName || '[EXTERNAL]'}</td>
    </tr>
    <tr class:hide={!$selectedItem.startTime}>
      <td>Time started</td>
      <td>{new Date($selectedItem.startTime).toLocaleString()}</td>
    </tr>
    <tr class:hide={!$selectedItem.finishTime}>
      <td>Time finished</td>
      <td>{new Date($selectedItem.finishTime).toLocaleString()}</td>
    </tr>
    <tr class:hide={!$selectedItem.startTime || !$selectedItem.finishTime}>
      <td>Duration</td>
      <td>{bestTimeString(($selectedItem.finishTime - $selectedItem.startTime) / 1000)}</td>
    </tr>
    <tr class:hide={!$selectedItem.errorMsg} style="color: var(--color-error)">
      <td>Error Message</td>
      <td>{$selectedItem.errorMsg}</td>
    </tr>
  </table>

  <button on:click={() => ($page = 'main')}>Done</button>
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
</style>
