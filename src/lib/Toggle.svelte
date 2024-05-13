<script>
  export let booleanInput;
  export let title = '';
  export let button = false;

  function toggleInput() {
    booleanInput = !booleanInput;
  }
</script>

{#if !button}
  <div class="toggle-button">
    <input type="checkbox" on:click bind:checked={booleanInput} />
    <div class="toggle" class:toggle-enabled={booleanInput} class:toggle-disabled={!booleanInput}>
      <div class="circle"></div>
    </div>
  </div>
{:else}
  <button class="toggle-button" on:click on:click={toggleInput} {title}>
    <div class="toggle" class:toggle-enabled={booleanInput} class:toggle-disabled={!booleanInput}>
      <div class="circle"></div>
    </div>
  </button>
{/if}

<style>
  .toggle-button:hover,
  .toggle-button:focus {
    background-color: var(--bg-color-hover);
  }

  .toggle-button {
    padding: 0;
    border-radius: 5px;
    background-color: unset;
    border: none;
    width: 40px;
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
    width: 100%;
    height: 24px;
    border-radius: 16px;
    text-align: right;
  }

  .circle {
    width: 16px;
    height: 16px;
    margin: 0 5px;
    background-color: var(--bg-color);
    border-radius: 100%;
  }

  input[type='checkbox'] {
    width: 0;
    height: 0;
    margin: 0;
    padding: 0;
    border: 0;
    opacity: 0;
  }

  .toggle-button:has(input) {
    display: flex;
    width: 44px;
  }
</style>
