<script>
  import browser from 'webextension-polyfill';
  import { slide } from 'svelte/transition';

  let dirList = [];
  let inp = '';

  /** @param {number} i */
  function removeIndex(i) {
    dirList.splice(i, 1);
    dirList = dirList;
  }

  /** @param {string} str */
  function addText(str) {
    if (!str.trim()) return;
    if (dirList.includes(str)) {
      return;
    }

    dirList = [...dirList, str];
    inp = '';
  }

  /** @param {string[]} dirList */
  function save(dirList) {
    browser.storage.local.set({ dirList: dirList });
  }

  browser.storage.local.get('dirList').then((res) => {
    dirList = res.dirList || [];
  });

  $: save(dirList);
</script>

<div class="whitelist">
  <h3>Directory list for fast input in manual download: (autosaved)</h3>
  <div class="container">
    {#each dirList as teks, i}
      <div class="item" class:bg-even={i % 2 == 0} in:slide>
        <span class="text">{teks}</span>
        <!-- svelte-ignore: a11y-visible -->
        <div
          class="icon"
          on:click={(_) => removeIndex(i)}
          on:keypress={(e) => {
            if (e.key == 'Enter' || e.key == ' ') removeIndex(i);
          }}
          tabindex="0"
          role="button"
        >
          <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"
            ><path
              d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            /></svg
          >
        </div>
      </div>
    {/each}
  </div>

  <form
    class="user-input"
    on:submit={(e) => {
      e.preventDefault();
      addText(inp);
    }}
  >
    <input type="text" bind:value={inp} />
    <button type="submit">Add path</button>
  </form>
</div>

<style>
  .whitelist {
    text-align: left;
    box-sizing: border-box;
    margin: 0 15px;
  }
  .container {
    overflow: scroll;
    max-height: 300px;
    min-height: 300px;
    min-width: 50%;
    border: solid 1px var(--opposite-color);
    border: 1px solid var(--fg-color);
  }

  .item {
    margin: 0;
    vertical-align: center;
    max-width: 100%;
    padding: 10px;
  }

  .icon {
    float: right;
    height: 24px;
    width: 24px;
    cursor: pointer;
    border-radius: 50%;
    background-size: 40px;
  }

  .icon:hover,
  .icon:focus {
    background: radial-gradient(circle, #aaa, #ccc);
  }

  .user-input {
    padding: 10px 0;
  }

  .bg-even {
    background-color: var(--bg-color-hover);
  }

  svg {
    fill: var(--fg-color);
  }
</style>
