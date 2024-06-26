<script>
  import resumeIcon from '../assets/play.svg';
  import pauseIcon from '../assets/pause.svg';
  import clearIcon from '../assets/delete-outline.svg';
  import xIcon from '../assets/close.svg';
  import stopIcon from '../assets/stop.svg';
  import { wsConn, cfg, selectedItem, storageCache } from './store';
  import { getAria2JSON } from '../lib/aria2rpc';
  import { getDefaultIcon } from '../lib/graphics';
  import { bestBytesString, bestTimeString, findAndRemoveHistory, capitalize } from '../lib/util';

  /** @type {DownloadItem} */
  export let item;
  let hasDetail = item.dlSpeed || item.completedLength || item.filesize || item.uploadSpeed;
  let lastClick = 0; // unix epoch
  const patientThreshold = 3000; // ms

  function impatientTest() {
    const diff = +new Date() - lastClick;
    if (diff < patientThreshold) return true;
    return false;
  }

  async function handleResumeClick() {
    const aria2json = getAria2JSON(cfg);
    wsConn.send(aria2json.unpause(item.gid));
  }

  async function handlePauseClick() {
    const aria2json = getAria2JSON(cfg);
    if (impatientTest()) {
      wsConn.send(aria2json.pause(item.gid));
    } else {
      wsConn.send(aria2json.forcePause(item.gid));
    }
    lastClick = +new Date();
  }

  async function handleRemoveClick() {
    const aria2json = getAria2JSON(cfg);
    if (impatientTest()) {
      wsConn.send(aria2json.forceRemove(item.gid));
    } else {
      wsConn.send(aria2json.remove(item.gid));
    }
    lastClick = +new Date();
  }

  async function handleClearClick() {
    findAndRemoveHistory(item.gid);
  }

  /**
   * @param {number} dlSpeed
   * @param {number} completed
   * @param {number} fullLength
   */
  function calculateETA(dlSpeed, completed, fullLength) {
    const rest = fullLength - completed;
    return rest / dlSpeed;
  }

  function openDetailPage() {
    $selectedItem = item;
    location.hash = '#item-detail';
  }

  const TITLE_PAUSE = 'Pause this download';
  const TITLE_RESUME = 'Resume this download';
  const TITLE_STOP = 'Stop seeding';
  const TITLE_CLEAR = 'Clear this download from history';
  const TITLE_DELETE = 'Delete/cancel this download';
</script>

<div class="container">
  <div class="icon">
    <img src={item.icon || getDefaultIcon()} alt="icon" />
  </div>
  <div class="summary">
    <div class="basename" title={item.basename}>
      <button on:click={openDetailPage}
        >{item.basename || item.url || `#${item.gid}` || "Can't fetch download name"}</button
      >
    </div>
    {#if item.status === 'active' || item.status === 'paused'}
      <div class="progress-bar">
        <div class="bar">
          <div
            class="inner-bar"
            style="width: {Math.floor(
              (item.completedLength / item.filesize) * 100
            )}%; background-color: {$storageCache.progressColor || '#faf'}"
          ></div>
        </div>
      </div>
    {/if}
    <div class="etc">
      {#if item.seeder}
        <span style="color: var(--color-complete); font-weight: 500;">Seeding</span>
        <span class:hide={!hasDetail}>-</span>
        <span class:hide={!item.uploadLength}
          >{bestBytesString(item.uploadLength)} ({parseFloat(
            (item.uploadLength / item.completedLength).toFixed(2)
          )}:1)</span
        >
        {#if item.uploadSpeed && item.seeder}
          <span>({bestBytesString(item.uploadSpeed)}/sec)</span>
        {/if}
      {:else}
        <span
          class:hide={item.status === 'active'}
          style="color: var(--color-{item.status}); font-weight: 500;"
          >{capitalize(item.status)}</span
        >
        <span class:hide={item.status !== 'active'}
          >{bestTimeString(calculateETA(item.dlSpeed, item.completedLength, item.filesize))} left</span
        >
        <span class:hide={!hasDetail}>-</span>
        {#if item.completedLength && item.status !== 'complete'}
          <span>{bestBytesString(item.completedLength, { comparison: item.filesize })} /</span>
        {/if}
        {#if item.filesize > 0}
          <span class:hide={item.filesize <= 0}>{bestBytesString(item.filesize)}</span>
        {/if}
        {#if item.dlSpeed && item.status === 'active'}
          <span>({bestBytesString(item.dlSpeed)}/sec)</span>
        {/if}
      {/if}
      {#if item.basename.indexOf('.') !== -1}
        <span class="capsule">{item.basename.split('.').pop()}</span>
      {/if}
    </div>
  </div>
  <div class="control">
    {#if item.status === 'paused'}
      <button on:click={handleResumeClick} title={TITLE_RESUME}>
        <img class="img-icon" src={resumeIcon} alt="Resume" />
      </button>
    {:else if item.status === 'active'}
      <button on:click={handlePauseClick} title={TITLE_PAUSE}>
        <img class="img-icon" src={pauseIcon} alt="Pause" />
      </button>
    {/if}
    {#if item.status === 'paused' || item.status === 'active'}
      <button on:click={handleRemoveClick} title={item.seeder ? TITLE_STOP : TITLE_DELETE}>
        <img class="img-icon" src={item.seeder ? stopIcon : xIcon} alt="Delete" />
      </button>
    {:else}
      <button on:click={handleClearClick} title={TITLE_CLEAR}>
        <img class="img-icon" src={clearIcon} alt="Clear" />
      </button>
    {/if}
  </div>
</div>

<style>
  button {
    display: flex;
    justify-content: center;
    padding: 5px;
    border-radius: 5px;
    background-color: unset;
    border: 0px solid;
  }

  button:hover,
  button:focus {
    background-color: var(--bg-color-hover);
  }

  img {
    width: 24px;
  }

  .container {
    display: flex;
    align-content: center;
    overflow: hidden;
  }

  .container:hover {
    filter: opacity(0.9);
  }

  .icon,
  .icon img {
    align-content: center;
    display: block;
    width: 32px;
  }

  .control {
    display: flex;
    margin: auto;
  }

  .summary {
    text-overflow: ellipsis;
    flex-grow: 1;
    white-space: nowrap;
    width: 1%;
    padding: 0 10px;
  }

  .basename {
    font-size: 15px;
  }

  .basename button {
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    box-sizing: border-box;
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  .basename button:hover,
  .basename button:focus {
    outline: 0px solid;
  }

  button + button {
    margin-left: 5px;
  }

  .etc {
    opacity: 0.7;
    font-size: 14px;
  }

  .capsule {
    background-color: var(--bg-color-hover);
    border-radius: 7px;
    padding: 0px 5px;
    float: right;
    font-weight: bold;
  }

  .progress-bar {
    margin-top: 3px;
    margin-bottom: 2px;
  }

  .bar {
    height: 5px;
    width: 100%;
    background-color: var(--bg-color-hover);
    border-radius: 10px;
  }

  .inner-bar {
    height: 100%;
    border-radius: 10px;
  }
</style>
