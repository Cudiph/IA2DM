<script>
  import resumeIcon from '../assets/play.svg';
  import pauseIcon from '../assets/pause.svg';
  import clearIcon from '../assets/delete-outline.svg';
  import xIcon from '../assets/close.svg';
  import stopIcon from '../assets/stop.svg';
  import folderIcon from '../assets/folder-outline.svg';
  import { cfg, selectedItem, storageCache, aria2WS } from './store';
  import { getIntegrationPass, integrationWS } from '../lib/store';
  import { getAria2JSON } from '../lib/aria2rpc';
  import { getDefaultIcon } from '../lib/graphics';
  import {
    bestBytesString,
    bestTimeString,
    findAndRemoveHistory,
    capitalize,
    wsRpcFetch,
    escapeHTML,
  } from '../lib/util';
  import { Aria2Tray } from '../lib/aria2tray';
  import { slide } from 'svelte/transition';

  /** @type {DownloadItem} */
  export let item;
  export let highlightIndexes = [];
  let highlightedBasename = '';
  let hasDetail = item.dlSpeed || item.completedLength || item.filesize || item.uploadSpeed;
  let lastClick = 0; // unix epoch
  const patientThreshold = 3000; // ms
  let hovered = false;
  let dirnameExist = false;
  let fileExist = false;

  function impatientTest() {
    const diff = +new Date() - lastClick;
    if (diff < patientThreshold) return true;
    return false;
  }

  async function handleResumeClick() {
    const aria2json = getAria2JSON(cfg);
    $aria2WS.send(aria2json.unpause(item.gid));
  }

  async function handlePauseClick() {
    const aria2json = getAria2JSON(cfg);
    if (impatientTest()) {
      $aria2WS.send(aria2json.pause(item.gid));
    } else {
      $aria2WS.send(aria2json.forcePause(item.gid));
    }
    lastClick = +new Date();
  }

  async function handleRemoveClick() {
    const aria2json = getAria2JSON(cfg);
    if (impatientTest()) {
      $aria2WS.send(aria2json.forceRemove(item.gid));
    } else {
      $aria2WS.send(aria2json.remove(item.gid));
    }
    lastClick = +new Date();
  }

  async function handleClearClick() {
    findAndRemoveHistory(item.gid);
  }

  async function handleFolderClick() {
    const a2t = new Aria2Tray(getIntegrationPass());
    await wsRpcFetch($integrationWS, a2t.open('id_c', item.dirname));
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

  async function onHover() {
    hovered = true;
    if (!$integrationWS) return;
    const a2t = new Aria2Tray(getIntegrationPass());
    const [dirname, file] = await Promise.all([
      wsRpcFetch($integrationWS, a2t.status(0, item.dirname)),
      wsRpcFetch($integrationWS, a2t.status(0, item.dirname + '/' + item.basename)),
    ]);

    if (dirname.result?.exist) dirnameExist = true;
    if (file.result?.exist) fileExist = true;
  }

  function onLeave() {
    hovered = false;
  }

  /** @param {number[]} indexes */
  function highlight(indexes) {
    if (!indexes.length) return false;

    let basenameInList = item.basename.split('');

    for (let i = 0; i < basenameInList.length; i++) {
      basenameInList[i] = escapeHTML(basenameInList[i]);
    }

    for (const idx of highlightIndexes) {
      basenameInList[idx] =
        `<span style="color: var(--color-error);">${basenameInList[idx]}</span>`;
    }

    highlightedBasename = basenameInList.join('');
    return highlightedBasename;
  }

  const TITLE_PAUSE = 'Pause this download';
  const TITLE_RESUME = 'Resume this download';
  const TITLE_STOP = 'Stop seeding';
  const TITLE_CLEAR = "Clear this download from history (files won't get deleted)";
  const TITLE_DELETE = 'Delete/cancel this download (double click to force)';
  const TITLE_OPEN_FOLDER = 'Open folder';
</script>

<div
  class="container"
  role="listitem"
  on:mouseover={onHover}
  on:focus={onHover}
  on:mouseleave={onLeave}
  on:blur={onLeave}
>
  <div class="icon">
    <img src={item.icon || getDefaultIcon()} alt="icon" />
  </div>

  <div class="summary">
    <div class="basename" title={item.basename}>
      <button on:click={openDetailPage} on:focus={onHover}>
        {#if highlightIndexes.length}
          {@html highlight(highlightIndexes)}
        {:else}
          {item.basename || item.url || `#${item.gid}` || 'Unnamed Download'}
        {/if}
      </button>
    </div>

    {#if item.status === 'active' || item.status === 'paused'}
      <div class="progress-bar">
        <div class="bar">
          <div
            class="inner-bar"
            style="width: {Math.floor((item.completedLength / item.filesize) * 100)}%;
            background-color: {$storageCache.progressColor || '#ffaaff'}"
          ></div>
        </div>
      </div>
    {/if}

    <div class="etc">
      {#if !hovered || !$integrationWS}
        {#if item.seeder}
          <span style="color: var(--color-complete); font-weight: 500;">Seeding</span>
          <span class:hide={!hasDetail}>-</span>
          <span class:hide={!item.uploadLength}>
            {bestBytesString(item.uploadLength)} ({parseFloat(
              (item.uploadLength / item.completedLength).toFixed(2)
            )}:1)
          </span>
          {#if item.uploadSpeed && item.seeder}
            <span>({bestBytesString(item.uploadSpeed)}/sec)</span>
          {/if}
        {:else}
          <span
            class:hide={item.status === 'active'}
            style="color: var(--color-{item.status}); font-weight: 500;"
          >
            {capitalize(item.status)}
          </span>
          <span class:hide={item.status !== 'active'}>
            {bestTimeString(calculateETA(item.dlSpeed, item.completedLength, item.filesize))} left
          </span>
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
      {:else}
        <span>{fileExist ? item.dirname : 'File missing'}</span>
      {/if}
      {#if item.basename.indexOf('.') !== -1}
        <span class="capsule">{item.basename.split('.').pop()}</span>
      {/if}
    </div>
  </div>

  {#if hovered}
    <div class="control" transition:slide={{ axis: 'x', duration: 100 }}>
      {#if item.status === 'paused'}
        <button on:click={handleResumeClick} title={TITLE_RESUME}>
          <img class="img-icon" src={resumeIcon} alt="Resume" />
        </button>
      {:else if item.status === 'active'}
        <button on:click={handlePauseClick} title={TITLE_PAUSE}>
          <img class="img-icon" src={pauseIcon} alt="Pause" />
        </button>
      {/if}
      <button
        class:hide={!$integrationWS || !fileExist}
        on:click={handleFolderClick}
        title={TITLE_OPEN_FOLDER}
      >
        <img class="img-icon" src={folderIcon} alt="Open folder" />
      </button>
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
  {/if}
</div>

<style>
  .hide {
    display: none;
  }

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
    min-width: 100%;
    padding: 0;
    margin: 0;
    text-align: left;
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
