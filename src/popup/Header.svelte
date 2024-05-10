<script>
  import addIcon from '../assets/plus.svg';
  import resumeIcon from '../assets/play.svg';
  import pauseIcon from '../assets/pause.svg';
  import trashIcon from '../assets/delete-sweep-outline.svg';
  import settingsIcon from '../assets/cog-outline.svg';
  import browser from 'webextension-polyfill';
  import { wsConn, cfg } from './store';
  import { page } from './store';
  import { getAria2JSON } from '../lib/aria2rpc';

  export let ws;
  let intercept = false;
  browser.storage.local.get('intercept').then((res) => {
    intercept = res.intercept;
  });

  function resumeAll() {
    const aria2json = getAria2JSON(cfg);
    wsConn.send(aria2json.unpauseAll());
  }

  function pauseAll() {
    const aria2json = getAria2JSON(cfg);
    wsConn.send(aria2json.pauseAll());
  }

  async function clearHistory() {
    const aria2json = getAria2JSON(cfg);
    wsConn.send(aria2json.purgeDownloadResult());
    browser.storage.local.set({ dlHistory: [] });
  }

  function handleToggleIntercept() {
    intercept = !intercept;
    browser.storage.local.set({ intercept });
  }

  const ADD_TITLE = 'Add new download';
  const CLEAR_ALL_TITLE = 'Clear download history and purge download result from aria2 memory';
  const PAUSE_ALL_TITLE = 'Pause all active downloads';
  const RESUME_ALL_TITLE = 'Resume all paused downloads';
  const SETTINGS_TITLE = 'Open extension settings';
  const TOGGLE_TITLE = 'Toggle intercept downloads';
</script>

<header>
  <div class="dl-action flex">
    <button on:click={() => (location.hash = '#add')} title={ADD_TITLE}>
      <img class="img-icon" src={addIcon} alt="Add new download" />
    </button>
    <div class="separator"></div>
    <button on:click={resumeAll} title={RESUME_ALL_TITLE}>
      <img class="img-icon" src={resumeIcon} alt="Resume all" />
    </button>
    <button on:click={pauseAll} title={PAUSE_ALL_TITLE}>
      <img class="img-icon" src={pauseIcon} alt="Pause all" />
    </button>
    <button on:click={clearHistory} title={CLEAR_ALL_TITLE}>
      <img class="img-icon" src={trashIcon} alt="Clear history" />
    </button>
  </div>
  <div class="flex">
    <div class="indicator-container">
      <div
        class="circle circle-small"
        style="background-color: var(--color-{ws ? 'complete' : 'error'})"
      ></div>
      <span style="font-size: 14px;" title={ws && cfg.name}
        >{ws ? 'Connected' : 'Disconnected'}</span
      >
    </div>
  </div>
  <div class="misc-action flex">
    <button on:click={() => browser.runtime.openOptionsPage()} title={SETTINGS_TITLE}>
      <img class="img-icon" src={settingsIcon} alt="Settings" />
    </button>
    <button class="toggle-button" on:click={handleToggleIntercept} title={TOGGLE_TITLE}>
      <div class="toggle" class:toggle-enabled={intercept} class:toggle-disabled={!intercept}>
        <div class="circle"></div>
      </div>
    </button>
  </div>
</header>

<style>
  header {
    background-color: var(--bg-color);
    position: sticky;
    top: 0px;
    display: flex;
    justify-content: space-between;
    border-bottom: solid 2px #aaa;
    z-index: 1000;
  }

  .flex {
    display: flex;
  }

  .img-icon {
    width: 24px;
    padding: 0;
  }

  button {
    display: flex;
    justify-content: center;
    margin: 0 5px;
    padding: 7px;
    border-radius: 5px;
    background-color: unset;
    border: 0px solid;
  }

  button:hover,
  button:focus {
    background-color: var(--bg-color-hover);
  }

  .separator {
    border-right: solid 2px #aaa;
  }

  .toggle-button {
    width: 50px;
  }

  .toggle-button:hover,
  .toggle-button:focus {
    background-color: unset;
  }

  .toggle-enabled {
    justify-content: end;
    background-color: var(--color-active);
  }

  .toggle-disabled {
    background-color: var(--bg-color-hover);
  }

  .toggle {
    transition: all 0.5s;
    display: flex;
    align-items: center;
    width: 50px;
    height: 24px;
    border-radius: 16px;
    text-align: right;
  }

  .circle {
    width: 16px;
    height: 16px;
    margin: 0 3px;
    background-color: var(--bg-color);
    border-radius: 100%;
  }

  .circle-small {
    width: 12px;
    height: 12px;
  }

  .indicator-container {
    margin: 0 5px;
    padding: 7px;
    display: flex;
    align-items: center;
  }
</style>
