<script>
  export let booleanInput;
  export let title = '';

  function toggleInput() {
    booleanInput = !booleanInput;
  }
</script>

<button class="toggle-button" on:click={toggleInput} {title}>
  <div class="toggle" class:toggle-enabled={booleanInput} class:toggle-disabled={!booleanInput}>
    <div class="circle"></div>
  </div>
</button>

<style>
  button:hover,
  button:focus {
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
</style>
