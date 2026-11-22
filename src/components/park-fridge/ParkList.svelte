<script lang="ts">
  import { parks, isVisited, visitsNewestFirst, type Park } from '../../data/parks';
  import { formatMonth, resolveAsset } from './format';
  import { magnetImageFor } from './magnet-image';

  // Every park as plain text: the accessible way through the collection, and
  // the only place unvisited parks are reachable by keyboard.
  let { onopen }: { onopen: (id: string) => void } = $props();

  const latest = (p: Park) => visitsNewestFirst(p)[0]?.date ?? '';
  const visited = parks.filter(isVisited).sort((a, b) => latest(b).localeCompare(latest(a)));
  const notYet = parks.filter((p) => !isVisited(p));
</script>

<div class="list">
  <h2>{visited.length} collected</h2>
  <ul class="visited">
    {#each visited as park (park.id)}
      <li>
        <button onclick={() => onopen(park.id)}>
          <img class="thumb" src={resolveAsset(magnetImageFor(park).src)} alt="" loading="lazy" />
          <span class="name">{park.name}</span>
          <span class="when">{formatMonth(latest(park))}</span>
        </button>
      </li>
    {/each}
  </ul>

  <h2>{notYet.length} to go</h2>
  <ul class="not-yet">
    {#each notYet as park (park.id)}
      <li>{park.name} <span>{park.state}</span></li>
    {/each}
  </ul>
</div>

<style>
  h2 {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-weight: 400;
    font-size: 30px;
    letter-spacing: 0.04em;
    margin: 0 0 10px;
    color: var(--ink);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .visited {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 4px 18px;
    margin-bottom: 28px;
  }
  .visited button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: 8px;
    background: none;
    font: inherit;
    font-size: 18px;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .visited button:hover,
  .visited button:focus-visible {
    background: rgba(0, 0, 0, 0.05);
  }
  .visited button:focus-visible {
    outline: 2px solid var(--accent-color);
  }
  .thumb {
    flex: none;
    width: 34px;
    height: 34px;
    object-fit: contain;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }
  .name {
    flex: 1;
  }
  .when {
    font-size: 14px;
    color: var(--ink-soft);
  }
  .not-yet {
    columns: 3 170px;
    column-gap: 18px;
    font-size: 16px;
    color: var(--ink-soft);
  }
  .not-yet li {
    break-inside: avoid;
    padding: 2px 0;
  }
  .not-yet span {
    font-size: 12px;
    opacity: 0.7;
  }
</style>
